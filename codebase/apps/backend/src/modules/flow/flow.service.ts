import { readFileSync } from "node:fs";

import { z } from "zod";

import type { Environment } from "../../app/config/environment.js";
import { AppError } from "../../shared/errors/appError.js";
import type { Database } from "../../shared/database/database.js";
import { resolveReportRange } from "../reports/report.range.js";
import { WorkspaceRepository } from "../workspaces/workspace.repository.js";
import { FlowMcpToolRegistry, flowMcpTools, type FlowModelPlan } from "./flow.mcp.js";
import type { FlowChatBody, FlowMessage } from "./flow.schemas.js";

interface OllamaResponse {
  response?: string;
}

const fallbackInstructions = `Flow stays inside NidhiFlow personal finance. Use only authorized context and tool results. Do not invent facts. Flow is read-only: transaction search and summaries are allowed, but create, update, and delete are refused. Return JSON only.`;

const flowPlanSchema = z.object({
  filters: z
    .object({
      from: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      query: z.string().trim().max(200).optional(),
      to: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      type: z.enum(["expense", "income", "transfer"]).optional(),
    })
    .optional(),
  intent: z.enum([
    "create_budget",
    "create_goal",
    "create_transaction",
    "delete_transaction",
    "explain_spending",
    "out_of_scope",
    "search_transactions",
    "unknown",
    "update_transaction",
  ]),
  response: z.string().trim().min(1).max(1_000).optional(),
});

function notFound() {
  return new AppError({
    code: "NOT_FOUND",
    message: "The requested resource was not found.",
    status: 404,
  });
}

function unavailable() {
  return new AppError({
    code: "FLOW_UNAVAILABLE",
    message: "Flow is not available right now. Check the local model configuration and try again.",
    status: 503,
  });
}

function loadFlowInstructions() {
  try {
    return readFileSync(new URL("./flow.instructions.md", import.meta.url), "utf8");
  } catch {
    return fallbackInstructions;
  }
}

function copyDefinedProperties<Source extends Record<string, unknown>>(source: Source) {
  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined) {
      output[key] = value;
    }
  }

  return output;
}

function getLatestUserMessage(messages: FlowMessage[]) {
  return (
    [...messages]
      .reverse()
      .find((message) => message.role === "user")
      ?.content.trim() ?? ""
  );
}

function hasSearchIntent(message: string) {
  return /\b(search|show|find|list)\b/i.test(message);
}

function hasWriteIntent(message: string) {
  return /\b(add|create|record|save|delete|remove|change|update|edit)\b/i.test(message);
}

function hasSummaryIntent(message: string) {
  return /\b(summarize|summary|explain|report|this month|month)\b/i.test(message);
}

function getCurrentMonthFilters(timezone: string) {
  const range = resolveReportRange({ period: "thisMonth" }, timezone);

  return {
    from: range.from,
    to: range.to,
  };
}

function extractSearchQuery(message: string) {
  const normalized = message.toLowerCase();
  const knownTerms = [
    "food",
    "shopping",
    "transport",
    "bills",
    "entertainment",
    "health",
    "education",
    "travel",
    "home",
    "salary",
    "freelance",
    "business",
    "interest",
  ];
  const categoryTerm = knownTerms.find((term) => normalized.includes(term));

  if (categoryTerm) {
    return categoryTerm;
  }

  const query = normalized
    .replace(/\b(search|show|find|list|my|all|this|month|transactions?|expenses?|income)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return query || undefined;
}

function createSearchPlan(
  latestUserMessage: string,
  workspace: { timezone: string },
): FlowModelPlan {
  const normalized = latestUserMessage.toLowerCase();
  const filters: NonNullable<FlowModelPlan["filters"]> = {};
  const query = extractSearchQuery(latestUserMessage);

  if (query) {
    filters.query = query;
  }

  if (normalized.includes("income")) {
    filters.type = "income";
  } else if (/\b(expense|expenses|spent|spending)\b/.test(normalized)) {
    filters.type = "expense";
  }

  if (/\b(this month|month)\b/.test(normalized)) {
    Object.assign(filters, getCurrentMonthFilters(workspace.timezone));
  }

  return {
    filters,
    intent: "search_transactions",
    response: "I will show matching transactions from your authorized workspace.",
  };
}

function createFallbackPlan(messages: FlowMessage[]): FlowModelPlan {
  const latestUserMessage = getLatestUserMessage(messages);
  const normalized = latestUserMessage.toLowerCase();

  if (hasSearchIntent(latestUserMessage)) {
    return createSearchPlan(latestUserMessage, { timezone: "UTC" });
  }

  if (hasSummaryIntent(latestUserMessage) && !hasWriteIntent(latestUserMessage)) {
    return {
      intent: "explain_spending",
      response: "I will summarize this month using your authorized workspace data.",
    };
  }

  if (hasWriteIntent(normalized) && /\b(add|create|record|save)\b/.test(normalized)) {
    return {
      intent: "create_transaction",
      response: "Flow is read-only right now. Use the transaction form to add income or expenses.",
    };
  }

  if (/\b(delete|remove|change|update|edit)\b/.test(normalized)) {
    return {
      intent: /\b(delete|remove)\b/.test(normalized) ? "delete_transaction" : "update_transaction",
      response:
        "I cannot update or delete transactions through Flow yet. Open the transaction form to review and confirm that change safely.",
    };
  }

  return {
    intent: "unknown",
    response: "I can help with read-only transaction search and spending summaries.",
  };
}

function normalizePlanForLatestMessage(
  plan: FlowModelPlan,
  messages: FlowMessage[],
  workspace: { timezone: string },
): FlowModelPlan {
  const latestUserMessage = getLatestUserMessage(messages);

  if (hasSearchIntent(latestUserMessage)) {
    return createSearchPlan(latestUserMessage, workspace);
  }

  return plan;
}

function parsePlan(raw: string, messages: FlowMessage[]): FlowModelPlan {
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");

  if (firstBrace < 0 || lastBrace <= firstBrace) {
    return createFallbackPlan(messages);
  }

  let parsed: z.infer<typeof flowPlanSchema>;

  try {
    parsed = flowPlanSchema.parse(JSON.parse(raw.slice(firstBrace, lastBrace + 1)));
  } catch {
    return createFallbackPlan(messages);
  }

  const plan: FlowModelPlan = {
    intent: parsed.intent ?? "unknown",
    response:
      parsed.response ?? "I can help with read-only transaction search and spending summaries.",
  };

  if (parsed.filters) {
    plan.filters = copyDefinedProperties(parsed.filters);
  }
  return plan;
}

function buildPrompt(
  messages: FlowMessage[],
  workspace: { reportingCurrency: string; timezone: string },
) {
  const instructions = loadFlowInstructions();
  const conversation = messages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n");

  return `You are Flow, NidhiFlow's finance assistant.
Follow these runtime instructions exactly:
${instructions}

Return only JSON. Do not include markdown.
You may classify these intents: search_transactions, explain_spending, create_transaction, update_transaction, delete_transaction, create_budget, create_goal, out_of_scope, unknown.
You can only use these MCP tools: ${flowMcpTools.map((tool) => tool.name).join(", ")}.
Never claim that you created, edited, deleted, or moved financial data.
For create_transaction, update_transaction, or delete_transaction, refuse politely. Do not provide proposal fields.
Use decimal strings for money. Currency defaults to ${workspace.reportingCurrency}.
Use date-only YYYY-MM-DD. The workspace timezone is ${workspace.timezone}.
Schema:
{
  "intent": "search_transactions|explain_spending|create_transaction|update_transaction|delete_transaction|create_budget|create_goal|out_of_scope|unknown",
  "response": "short user-facing reply",
  "filters": { "query": "optional", "type": "income|expense|transfer", "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" }
}

Conversation:
${conversation}`;
}

function formatDecimalMoney(amount: string | undefined, currency: string | undefined) {
  const numericAmount = Number(amount ?? "0");

  return new Intl.NumberFormat("en-IN", {
    currency: currency ?? "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(Number.isFinite(numericAmount) ? numericAmount : 0);
}

function isReportSummary(value: unknown): value is {
  currency: string;
  spendingByCategory?: Array<{
    amountMinor?: string;
    categoryName?: string;
    transactionCount?: number;
  }>;
  totals: {
    expenseMinor?: string;
    incomeMinor?: string;
    netSavingsMinor?: string;
    transactionCount?: number;
  };
} {
  return typeof value === "object" && value !== null && "currency" in value && "totals" in value;
}

function buildReportSummaryMessage(report: unknown) {
  if (!isReportSummary(report)) {
    return "I summarized this month using your authorized workspace data.";
  }

  const topCategory = report.spendingByCategory?.[0];
  const topCategoryText = topCategory?.categoryName
    ? ` Top spending category: ${topCategory.categoryName} (${formatDecimalMoney(
        topCategory.amountMinor,
        report.currency,
      )}).`
    : "";

  return `This month: income ${formatDecimalMoney(
    report.totals.incomeMinor,
    report.currency,
  )}, expenses ${formatDecimalMoney(
    report.totals.expenseMinor,
    report.currency,
  )}, net savings ${formatDecimalMoney(
    report.totals.netSavingsMinor,
    report.currency,
  )}, across ${String(report.totals.transactionCount ?? 0)} transactions.${topCategoryText}`;
}

function buildSearchResultMessage(result: unknown) {
  if (!Array.isArray(result)) {
    return "I searched your authorized transactions.";
  }

  if (result.length === 0) {
    return "I could not find matching transactions for that question.";
  }

  return `I found ${String(result.length)} matching transaction${
    result.length === 1 ? "" : "s"
  } in your authorized workspace.`;
}

export class FlowService {
  private readonly workspaceRepository: WorkspaceRepository;

  constructor(
    private readonly database: Database,
    private readonly environment: Environment,
  ) {
    this.workspaceRepository = new WorkspaceRepository(database);
  }

  private async askOllama(
    messages: FlowMessage[],
    workspace: { reportingCurrency: string; timezone: string },
  ) {
    if (!this.environment.FLOW_AI_ENABLED) {
      throw unavailable();
    }

    const response = await fetch(`${this.environment.OLLAMA_BASE_URL}/api/generate`, {
      body: JSON.stringify({
        format: "json",
        model: this.environment.FLOW_MODEL,
        options: {
          num_predict: 384,
          temperature: 0,
        },
        prompt: buildPrompt(messages, workspace),
        stream: false,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
      signal: AbortSignal.timeout(this.environment.FLOW_AI_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw unavailable();
    }

    const body = (await response.json()) as OllamaResponse;

    if (!body.response) {
      throw unavailable();
    }

    return parsePlan(body.response, messages);
  }

  async chat(userId: string, workspaceId: string, input: FlowChatBody) {
    const workspace = await this.workspaceRepository.findWorkspaceForUser(userId, workspaceId);

    if (!workspace) {
      throw notFound();
    }

    let plan: FlowModelPlan;

    try {
      plan = await this.askOllama(input.messages, workspace);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw unavailable();
    }
    plan = normalizePlanForLatestMessage(plan, input.messages, workspace);

    const tools = new FlowMcpToolRegistry({
      database: this.database,
      userId,
      workspace,
    });
    const toolResults: Array<{ name: string; result: unknown }> = [];

    if (plan.intent === "search_transactions") {
      const result = await tools.searchTransactions(plan.filters);

      toolResults.push({
        name: "flow.searchTransactions",
        result,
      });
      plan.response = buildSearchResultMessage(result);
    }

    if (plan.intent === "explain_spending") {
      const result = await tools.summarizeMonth();

      toolResults.push({
        name: "flow.summarizeMonth",
        result,
      });
      plan.response = buildReportSummaryMessage(result);
    }

    if (
      plan.intent === "create_transaction" ||
      plan.intent === "update_transaction" ||
      plan.intent === "delete_transaction"
    ) {
      plan = {
        intent: plan.intent,
        response:
          "Flow is read-only right now. Use the normal transaction form for adding, editing, or deleting financial records.",
      };
    }

    if (plan.intent === "out_of_scope") {
      plan = {
        intent: "out_of_scope",
        response:
          "I can only help with read-only NidhiFlow personal finance tasks like transaction search and summaries.",
      };
    }

    return {
      message: plan.response,
      model: this.environment.FLOW_MODEL,
      tools: flowMcpTools,
      toolResults,
    };
  }
}
