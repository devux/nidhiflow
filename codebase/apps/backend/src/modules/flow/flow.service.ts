import { readFileSync } from "node:fs";

import { z } from "zod";

import type { Environment } from "../../app/config/environment.js";
import { AppError } from "../../shared/errors/appError.js";
import type { Database } from "../../shared/database/database.js";
import { WorkspaceRepository } from "../workspaces/workspace.repository.js";
import { FlowMcpToolRegistry, flowMcpTools, type FlowModelPlan } from "./flow.mcp.js";
import type { FlowChatBody, FlowMessage } from "./flow.schemas.js";

interface OllamaResponse {
  response?: string;
}

export type FlowTrace = (stage: string, details?: Record<string, unknown>) => void;

const noOpTrace: FlowTrace = () => undefined;

const fallbackInstructions = `Flow stays inside NidhiFlow personal finance. Use only authorized context and tool results. Do not invent facts. Flow is read-only: transaction search and summaries are allowed, but create, update, and delete are refused. Return JSON only.`;

const filterEvidenceSchema = z
  .object({
    from: z.string().trim().min(1).max(100).optional(),
    limit: z.string().trim().min(1).max(100).optional(),
    period: z.string().trim().min(1).max(100).optional(),
    query: z.string().trim().min(1).max(200).optional(),
    to: z.string().trim().min(1).max(100).optional(),
    type: z.string().trim().min(1).max(100).optional(),
  })
  .strict();

const flowPlanSchema = z
  .object({
    evidence: filterEvidenceSchema.optional(),
    filters: z
      .object({
        from: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        limit: z.number().int().min(1).max(8).optional(),
        period: z.enum(["last_month", "this_month", "this_year"]).optional(),
        query: z.string().trim().min(1).max(200).optional(),
        to: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        type: z.enum(["expense", "income", "transfer"]).optional(),
      })
      .strict()
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
  })
  .strict();

const flowPlanJsonSchema = {
  additionalProperties: false,
  properties: {
    evidence: {
      additionalProperties: false,
      properties: {
        from: { minLength: 1, type: "string" },
        limit: { minLength: 1, type: "string" },
        period: { minLength: 1, type: "string" },
        query: { minLength: 1, type: "string" },
        to: { minLength: 1, type: "string" },
        type: { minLength: 1, type: "string" },
      },
      type: "object",
    },
    filters: {
      additionalProperties: false,
      properties: {
        from: { pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$", type: "string" },
        limit: { maximum: 8, minimum: 1, type: "integer" },
        period: {
          enum: ["last_month", "this_month", "this_year"],
          type: "string",
        },
        query: { minLength: 1, type: "string" },
        to: { pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$", type: "string" },
        type: {
          enum: ["expense", "income", "transfer"],
          type: "string",
        },
      },
      type: "object",
    },
    intent: {
      enum: [
        "create_budget",
        "create_goal",
        "create_transaction",
        "delete_transaction",
        "explain_spending",
        "out_of_scope",
        "search_transactions",
        "unknown",
        "update_transaction",
      ],
      type: "string",
    },
    response: { minLength: 1, type: "string" },
  },
  required: ["intent", "response", "filters", "evidence"],
  type: "object",
} as const;

type FilterKey = keyof NonNullable<FlowModelPlan["filters"]>;

const numberWords: Record<string, number> = {
  eight: 8,
  five: 5,
  four: 4,
  one: 1,
  seven: 7,
  six: 6,
  three: 3,
  two: 2,
};

function getLatestUserMessage(messages: FlowMessage[]) {
  return (
    [...messages]
      .reverse()
      .find((message) => message.role === "user")
      ?.content.trim() ?? ""
  );
}

function evidenceAppearsInMessage(message: string, evidence: string | undefined) {
  const normalize = (value: string) =>
    value.toLocaleLowerCase().replaceAll("_", " ").replace(/\s+/g, " ").trim();

  return Boolean(evidence && normalize(message).includes(normalize(evidence)));
}

function evidenceSupportsFilter(
  key: FilterKey,
  value: NonNullable<FlowModelPlan["filters"]>[FilterKey],
  evidence: string | undefined,
  message: string,
) {
  if (!evidenceAppearsInMessage(message, evidence) || !evidence) {
    return false;
  }

  const normalizedEvidence = evidence.toLocaleLowerCase().replaceAll("_", " ");

  if (key === "from" || key === "to") {
    return normalizedEvidence.includes(String(value));
  }

  if (key === "limit") {
    const numericEvidence = Number(normalizedEvidence.match(/\b[1-8]\b/)?.[0]);
    const wordValue = Object.entries(numberWords).find(([word]) =>
      new RegExp(`\\b${word}\\b`).test(normalizedEvidence),
    )?.[1];
    const recencyImpliesOne =
      value === 1 && /\b(last|latest|most recent)\b/.test(normalizedEvidence);

    return numericEvidence === value || wordValue === value || recencyImpliesOne;
  }

  if (key === "period") {
    const periodEvidence = {
      last_month: /\blast month\b/,
      this_month: /\b(this|current) month\b/,
      this_year: /\b(this|current) year\b/,
    }[String(value)];

    return periodEvidence?.test(normalizedEvidence) ?? false;
  }

  if (key === "type") {
    const typeEvidence = {
      expense: /\b(expense|expenses|spend|spending|spendings|purchase|purchases|paid)\b/,
      income: /\b(income|salary|earning|earnings|earned)\b/,
      transfer: /\b(transfer|transfers|transferred)\b/,
    }[String(value)];

    return typeEvidence?.test(normalizedEvidence) ?? false;
  }

  return key === "query";
}

function groundPlanFilters(plan: FlowModelPlan, messages: FlowMessage[]) {
  if (plan.intent !== "search_transactions" || !plan.filters) {
    return { plan, removedFilters: [] as FilterKey[] };
  }

  const latestUserMessage = getLatestUserMessage(messages);
  const groundedFilters: NonNullable<FlowModelPlan["filters"]> = {};
  const removedFilters: FilterKey[] = [];

  for (const [key, value] of Object.entries(plan.filters) as Array<
    [FilterKey, NonNullable<FlowModelPlan["filters"]>[FilterKey]]
  >) {
    if (evidenceSupportsFilter(key, value, plan.evidence?.[key], latestUserMessage)) {
      Object.assign(groundedFilters, { [key]: value });
    } else {
      removedFilters.push(key);
    }
  }

  if (groundedFilters.period) {
    if (groundedFilters.from) removedFilters.push("from");
    if (groundedFilters.to) removedFilters.push("to");
    delete groundedFilters.from;
    delete groundedFilters.to;
  }

  return {
    plan: {
      ...plan,
      filters: groundedFilters,
      response:
        removedFilters.length > 0
          ? "I will search using only the details provided in your request."
          : plan.response,
    },
    removedFilters: [...new Set(removedFilters)],
  };
}

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

function createFallbackPlan(): FlowModelPlan {
  return {
    intent: "unknown",
    response:
      "I could not safely classify that request. Please rephrase it as a transaction search or monthly summary.",
  };
}

function summarizeClassificationForTrace(plan: FlowModelPlan) {
  return {
    filterFrom: plan.filters?.from ?? null,
    filterLimit: plan.filters?.limit ?? null,
    filterPeriod: plan.filters?.period ?? null,
    filterTo: plan.filters?.to ?? null,
    filterType: plan.filters?.type ?? null,
    hasQuery: Boolean(plan.filters?.query),
    hasResponse: Boolean(plan.response),
    intent: plan.intent,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeModelAliases(value: unknown) {
  if (!isRecord(value)) {
    return value;
  }

  const filters = isRecord(value.filters) ? { ...value.filters } : {};
  const evidence = isRecord(value.evidence) ? { ...value.evidence } : {};

  if (typeof filters.category === "string" && filters.query === undefined) {
    filters.query = filters.category;
  }
  if (typeof evidence.category === "string" && evidence.query === undefined) {
    evidence.query = evidence.category;
  }

  const periodAliases: Record<string, NonNullable<FlowModelPlan["filters"]>["period"]> = {
    last_month: "last_month",
    this_month: "this_month",
    this_year: "this_year",
  };

  if (typeof filters.timeframe === "string" && filters.period === undefined) {
    filters.period = periodAliases[filters.timeframe];
  }
  if (typeof evidence.timeframe === "string" && evidence.period === undefined) {
    evidence.period = evidence.timeframe;
  }

  const supportedPeriods = new Set(["last_month", "this_month", "this_year"]);

  if (typeof filters.period === "string" && !supportedPeriods.has(filters.period)) {
    delete filters.period;
    delete evidence.period;
  }

  delete filters.category;
  delete filters.timeframe;
  delete evidence.category;
  delete evidence.timeframe;

  return { ...value, evidence, filters };
}

function parsePlan(raw: string): FlowModelPlan {
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");

  if (firstBrace < 0 || lastBrace <= firstBrace) {
    return createFallbackPlan();
  }

  let parsed: z.infer<typeof flowPlanSchema>;

  try {
    parsed = flowPlanSchema.parse(
      normalizeModelAliases(JSON.parse(raw.slice(firstBrace, lastBrace + 1))),
    );
  } catch {
    return createFallbackPlan();
  }

  const plan: FlowModelPlan = {
    intent: parsed.intent ?? "unknown",
    response:
      parsed.response ?? "I can help with read-only transaction search and spending summaries.",
  };

  if (parsed.filters) {
    plan.filters = Object.fromEntries(
      Object.entries(parsed.filters).filter(([, value]) => value !== undefined),
    ) as NonNullable<FlowModelPlan["filters"]>;
  }
  if (parsed.evidence) {
    plan.evidence = Object.fromEntries(
      Object.entries(parsed.evidence).filter(([, value]) => value !== undefined),
    ) as NonNullable<FlowModelPlan["evidence"]>;
  }
  return plan;
}

function getCurrentDate(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("year")}-${value("month")}-${value("day")}`;
}

function buildPrompt(
  messages: FlowMessage[],
  workspace: { reportingCurrency: string; timezone: string },
) {
  const instructions = loadFlowInstructions();
  const recentMessages = messages.slice(-3);
  const conversation = recentMessages
    .map((message, index) => {
      const isLatest = index === recentMessages.length - 1;
      const contentLimit = isLatest ? 800 : 250;

      return `${message.role.toUpperCase()}: ${message.content.slice(0, contentLimit)}`;
    })
    .join("\n");

  return `You are Flow.
${instructions}

Context: today=${getCurrentDate(workspace.timezone)}, timezone=${workspace.timezone}, currency=${workspace.reportingCurrency}.
Intents: search_transactions, explain_spending, create_transaction, update_transaction, delete_transaction, create_budget, create_goal, out_of_scope, unknown.
Tools: ${flowMcpTools.map((tool) => tool.name).join(", ")}.
Return one object matching the provided JSON Schema. Use empty objects when no filters or evidence apply.
Example: "recent five spendings" => {"intent":"search_transactions","response":"I will show your five most recent expenses.","filters":{"limit":5,"type":"expense"},"evidence":{"limit":"five","type":"spendings"}}.
Example: "last transaction" => {"intent":"search_transactions","response":"I will show your latest transaction.","filters":{"limit":1},"evidence":{"limit":"last"}}.
Example: "food expenses this month" => {"intent":"search_transactions","response":"I will show your food expenses this month.","filters":{"query":"food","type":"expense","period":"this_month"},"evidence":{"query":"food","type":"expenses","period":"this month"}}.
Example: "last two food expenses" => {"intent":"search_transactions","response":"I will show your two most recent food expenses.","filters":{"query":"food","type":"expense","limit":2},"evidence":{"query":"food","type":"expenses","limit":"two"}}.

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
  if (!Array.isArray(result) || result.length === 0) {
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
        format: flowPlanJsonSchema,
        keep_alive: "10m",
        model: this.environment.FLOW_MODEL,
        options: {
          num_ctx: 1_536,
          num_predict: 128,
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

    return parsePlan(body.response);
  }

  async chat(
    userId: string,
    workspaceId: string,
    input: FlowChatBody,
    trace: FlowTrace = noOpTrace,
  ) {
    const workspace = await this.workspaceRepository.findWorkspaceForUser(userId, workspaceId);

    if (!workspace) {
      throw notFound();
    }

    let plan: FlowModelPlan;
    const modelStartedAt = performance.now();

    try {
      trace("ollama.request", {
        api: {
          format: "json-schema",
          keepAlive: "10m",
          method: "POST",
          model: this.environment.FLOW_MODEL,
          numContext: 1_536,
          numPredict: 128,
          stream: false,
          temperature: 0,
          timeoutMs: this.environment.FLOW_AI_TIMEOUT_MS,
          url: `${this.environment.OLLAMA_BASE_URL}/api/generate`,
        },
        input: {
          contentLengths: input.messages.map((message) => message.content.length),
          messageCount: input.messages.length,
          roles: input.messages.map((message) => message.role),
          reportingCurrency: workspace.reportingCurrency,
          timezone: workspace.timezone,
        },
      });
      const modelPlan = await this.askOllama(input.messages, workspace);
      const grounded = groundPlanFilters(modelPlan, input.messages);
      plan = grounded.plan;
      trace("ollama.response", {
        classification: summarizeClassificationForTrace(modelPlan),
        decision: {
          filtersGroundedByApplication: grounded.removedFilters.length > 0,
          normalizedByApplication: false,
          removedFilterNames: grounded.removedFilters,
          selectedIntent: plan.intent,
        },
        durationMs: Math.round(performance.now() - modelStartedAt),
        model: this.environment.FLOW_MODEL,
        status: "success",
      });
    } catch (error) {
      trace("ollama.response", {
        durationMs: Math.round(performance.now() - modelStartedAt),
        errorCode: error instanceof AppError ? error.code : "UNEXPECTED_ERROR",
        model: this.environment.FLOW_MODEL,
        status: "failed",
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw unavailable();
    }

    const tools = new FlowMcpToolRegistry({
      database: this.database,
      userId,
      workspace,
    });
    const toolResults: Array<{ name: string; result: unknown }> = [];

    if (plan.intent === "search_transactions") {
      trace("tool.request", {
        queryParams: {
          from: plan.filters?.from ?? null,
          hasQuery: Boolean(plan.filters?.query),
          limit: plan.filters?.limit ?? 8,
          period: plan.filters?.period ?? null,
          to: plan.filters?.to ?? null,
          type: plan.filters?.type ?? null,
        },
        toolName: "flow.searchTransactions",
      });
      const result = await tools.searchTransactions(plan.filters);

      toolResults.push({
        name: "flow.searchTransactions",
        result,
      });
      plan.response = buildSearchResultMessage(result);
    }

    if (plan.intent === "explain_spending") {
      trace("tool.request", {
        queryParams: { period: "thisMonth" },
        toolName: "flow.summarizeMonth",
      });
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
