import type { QueryResult, QueryResultRow } from "pg";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Environment } from "../../app/config/environment.js";
import type { Database } from "../../shared/database/database.js";
import { FlowService, type FlowTrace } from "./flow.service.js";

const environment: Environment = {
  APP_ENV: "test",
  PORT: 3000,
  LOG_LEVEL: "fatal",
  DATABASE_URL: "postgresql://user:password@localhost:5432/nidhiflow_test",
  DATABASE_SSL: false,
  API_RATE_LIMIT_WINDOW_MS: 60_000,
  API_RATE_LIMIT_MAX: 100,
  AUTH_RATE_LIMIT_MAX: 10,
  FEEDBACK_RATE_LIMIT_MAX: 2,
  ANDROID_NOTIFICATION_TRANSACTIONS_ENABLED: false,
  FLOW_AI_ENABLED: true,
  FLOW_AI_TIMEOUT_MS: 60_000,
  FLOW_MODEL: "llama3.2:3b",
  OLLAMA_BASE_URL: "http://127.0.0.1:11434",
  APP_PUBLIC_URL: "http://localhost:5173",
  EMAIL_DELIVERY_PROVIDER: "none",
  EMAIL_FROM: undefined,
  RESEND_API_KEY: undefined,
  JWT_ACCESS_SECRET: "6e56e6c7f6aa6e09a81f3bb946a0af9efcb0df560b876211f4b81f32b61f4f2e",
  JWT_ACCESS_ISSUER: "nidhiflow.test",
  JWT_ACCESS_AUDIENCE: "nidhiflow-web",
  JWT_ACCESS_TTL_SECONDS: 900,
  REFRESH_SESSION_TTL_DAYS: 30,
  EMAIL_VERIFICATION_TTL_HOURS: 24,
  PASSWORD_RESET_TTL_HOURS: 2,
  CORS_ORIGINS: ["http://localhost:5173"],
};

const workspace = {
  createdAt: "2026-06-15T10:30:00.000Z",
  id: "wsp_flow",
  membershipId: "wmem_flow",
  membershipRole: "manager",
  name: "My Finances",
  reportingCurrency: "INR",
  timezone: "Asia/Kolkata",
  type: "personal",
};

function createQueryResult<Row extends QueryResultRow>(rows: Row[]): QueryResult<Row> {
  return {
    command: rows.length > 0 ? "SELECT" : "",
    fields: [],
    oid: 0,
    rowCount: rows.length,
    rows,
  };
}

function createDatabase() {
  const queryMock = vi.fn((sql: string) => {
    if (sql.includes("FROM workspaces w")) {
      return Promise.resolve(createQueryResult([workspace]));
    }

    if (sql.includes("FROM categories")) {
      return Promise.resolve(
        createQueryResult([
          {
            colorToken: null,
            createdAt: "2026-06-15T10:30:00.000Z",
            iconKey: null,
            id: "cat_food",
            isArchived: false,
            isSystem: true,
            name: "Food",
            parentCategoryId: null,
            transactionType: "expense",
            updatedAt: "2026-06-15T10:30:00.000Z",
            workspaceId: null,
          },
        ]),
      );
    }

    if (sql.includes("FROM accounts a")) {
      return Promise.resolve(
        createQueryResult([
          {
            archivedAt: null,
            createdAt: "2026-06-15T10:30:00.000Z",
            currency: "INR",
            currentBalance: "1000.0000",
            id: "acc_cash",
            isArchived: false,
            name: "Cash",
            openingBalance: "1000.0000",
            type: "cash",
            updatedAt: "2026-06-15T10:30:00.000Z",
          },
        ]),
      );
    }

    if (sql.includes("FROM transactions")) {
      return Promise.resolve(
        createQueryResult([
          {
            accountId: "acc_cash",
            amount: "500.0000",
            categoryId: "cat_food",
            createdAt: "2026-06-19T09:00:00.000Z",
            createdByUserId: "usr_flow",
            currency: "INR",
            deletedAt: null,
            destinationAccountId: null,
            id: "txn_food",
            note: "Lunch",
            transactionDate: "2026-06-19",
            type: "expense",
            updatedAt: "2026-06-19T09:00:00.000Z",
            updatedByUserId: "usr_flow",
            workspaceId: "wsp_flow",
          },
        ]),
      );
    }

    return Promise.resolve(createQueryResult([]));
  });
  const database: Database = {
    close: vi.fn(),
    isReady: vi.fn().mockResolvedValue(true),
    query: queryMock as Database["query"],
    transaction: (callback) => callback({ query: queryMock as Database["query"] }),
  };

  return { database, queryMock };
}

function mockOllamaPlan(plan: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ response: JSON.stringify(plan) }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    ),
  );
}

function mockMalformedOllamaResponse() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ response: "{ not valid flow json" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    ),
  );
}

describe("FlowService read-only transaction policy", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("refuses transaction creates instead of preparing write proposals", async () => {
    const { database, queryMock } = createDatabase();
    mockOllamaPlan({
      intent: "create_transaction",
      response: "I prepared a draft expense for your review.",
    });

    const result = await new FlowService(database, environment).chat("usr_flow", "wsp_flow", {
      messages: [{ content: "Add 500 food expense today", role: "user" }],
    });

    expect(result.message).toContain("Flow is read-only right now");
    expect(result).not.toHaveProperty("proposal");
    expect(result.toolResults).toEqual([]);
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it("reads transactions through the allowlisted search tool", async () => {
    const { database } = createDatabase();
    const trace = vi.fn<FlowTrace>();
    mockOllamaPlan({
      evidence: { query: "food", type: "expenses" },
      filters: { query: "food", type: "expense" },
      intent: "search_transactions",
      response: "I found matching transactions.",
    });

    const result = await new FlowService(database, environment).chat(
      "usr_flow",
      "wsp_flow",
      {
        messages: [{ content: "Show food expenses", role: "user" }],
      },
      trace,
    );

    expect(result).not.toHaveProperty("proposal");
    expect(result.toolResults).toHaveLength(1);
    expect(result.toolResults[0]).toMatchObject({
      name: "flow.searchTransactions",
      result: [
        {
          accountName: "Cash",
          amount: "500.0000",
          categoryName: "Food",
          currency: "INR",
          date: "2026-06-19",
          note: "Lunch",
          type: "expense",
        },
      ],
    });
    expect(trace.mock.calls.map(([stage]) => stage)).toEqual([
      "ollama.request",
      "ollama.response",
      "tool.request",
    ]);
    const requestTrace = trace.mock.calls.find(([stage]) => stage === "ollama.request");
    expect(requestTrace?.[1]).toMatchObject({
      api: {
        method: "POST",
        model: "llama3.2:3b",
        url: "http://127.0.0.1:11434/api/generate",
      },
      input: {
        contentLengths: [18],
        messageCount: 1,
        roles: ["user"],
      },
    });
    expect(JSON.stringify(requestTrace?.[1])).not.toContain("Show food expenses");
    const classificationTrace = trace.mock.calls.find(([stage]) => stage === "ollama.response");
    expect(classificationTrace?.[1]).toMatchObject({
      classification: {
        filterFrom: null,
        filterLimit: null,
        filterTo: null,
        filterType: "expense",
        hasQuery: true,
        hasResponse: true,
        intent: "search_transactions",
      },
      decision: {
        normalizedByApplication: false,
        selectedIntent: "search_transactions",
      },
      model: "llama3.2:3b",
      status: "success",
    });
    const toolTrace = trace.mock.calls.find(([stage]) => stage === "tool.request");
    expect(toolTrace?.[1]).toMatchObject({
      queryParams: {
        from: null,
        hasQuery: true,
        limit: 8,
        to: null,
        type: "expense",
      },
      toolName: "flow.searchTransactions",
    });
  });

  it("uses the intent returned by Ollama without application keyword overrides", async () => {
    const { database } = createDatabase();
    mockOllamaPlan({
      intent: "explain_spending",
      response: "I will summarize this month.",
    });

    const result = await new FlowService(database, environment).chat("usr_flow", "wsp_flow", {
      messages: [{ content: "Show my food expenses this month", role: "user" }],
    });

    expect(result.message).toContain("This month:");
    expect(result.toolResults).toHaveLength(1);
    expect(result.toolResults[0]?.name).toBe("flow.summarizeMonth");
  });

  it("supports Ollama classifying a latest transaction request with a one-record limit", async () => {
    const { database } = createDatabase();
    const trace = vi.fn<FlowTrace>();
    mockOllamaPlan({
      evidence: { limit: "last" },
      filters: { limit: 1 },
      intent: "search_transactions",
      response: "I will show your latest transaction.",
    });

    const result = await new FlowService(database, environment).chat(
      "usr_flow",
      "wsp_flow",
      {
        messages: [{ content: "What is my last transaction?", role: "user" }],
      },
      trace,
    );

    expect(result.message).toBe("I found 1 matching transaction in your authorized workspace.");
    expect(result.toolResults[0]).toMatchObject({
      name: "flow.searchTransactions",
      result: [{ note: "Lunch" }],
    });
    const classificationTrace = trace.mock.calls.find(([stage]) => stage === "ollama.response");
    expect(classificationTrace?.[1]).toMatchObject({
      classification: {
        filterLimit: 1,
        intent: "search_transactions",
      },
      decision: {
        normalizedByApplication: false,
        selectedIntent: "search_transactions",
      },
    });
    const toolTrace = trace.mock.calls.find(([stage]) => stage === "tool.request");
    expect(toolTrace?.[1]).toMatchObject({
      queryParams: { hasQuery: false, limit: 1 },
      toolName: "flow.searchTransactions",
    });

    const ollamaRequest = vi.mocked(fetch).mock.calls[0]?.[1];
    const ollamaBody = JSON.parse(String(ollamaRequest?.body)) as {
      format: {
        properties: {
          filters: {
            properties: {
              from: { pattern: string };
              limit: { type: string };
              to: { pattern: string };
            };
          };
        };
      };
      prompt: string;
    };
    expect(ollamaBody.prompt).toContain("recent five spendings");
    expect(ollamaBody.format.properties.filters.properties.from.pattern).toBe(
      "^[0-9]{4}-[0-9]{2}-[0-9]{2}$",
    );
    expect(ollamaBody.format.properties.filters.properties.limit.type).toBe("integer");
    expect(ollamaBody.format.properties.filters.properties.to.pattern).toBe(
      "^[0-9]{4}-[0-9]{2}-[0-9]{2}$",
    );
  });

  it("removes hallucinated dates while keeping grounded recent-spending filters", async () => {
    const { database } = createDatabase();
    const trace = vi.fn<FlowTrace>();
    mockOllamaPlan({
      evidence: {
        from: "recent",
        limit: "five",
        to: "recent",
        type: "spendings",
      },
      filters: {
        from: "2023-01-01",
        limit: 5,
        to: "2023-01-31",
        type: "expense",
      },
      intent: "search_transactions",
      response: "I will show your five most recent expenses.",
    });

    const result = await new FlowService(database, environment).chat(
      "usr_flow",
      "wsp_flow",
      {
        messages: [{ content: "show my recent five spendings", role: "user" }],
      },
      trace,
    );

    expect(result.toolResults[0]).toMatchObject({
      name: "flow.searchTransactions",
      result: [{ note: "Lunch" }],
    });
    const classificationTrace = trace.mock.calls.find(([stage]) => stage === "ollama.response");
    expect(classificationTrace?.[1]).toMatchObject({
      decision: {
        filtersGroundedByApplication: true,
        normalizedByApplication: false,
        removedFilterNames: ["from", "to"],
        selectedIntent: "search_transactions",
      },
    });
    const toolTrace = trace.mock.calls.find(([stage]) => stage === "tool.request");
    expect(toolTrace?.[1]).toMatchObject({
      queryParams: {
        from: null,
        hasQuery: false,
        limit: 5,
        period: null,
        to: null,
        type: "expense",
      },
    });
  });

  it("normalizes grounded category and timeframe aliases returned by Ollama", async () => {
    const { database } = createDatabase();
    const trace = vi.fn<FlowTrace>();
    mockOllamaPlan({
      evidence: { category: "food", timeframe: "this_month" },
      filters: { category: "food", timeframe: "this_month" },
      intent: "search_transactions",
      response: "I will show your food expenses this month.",
    });

    const result = await new FlowService(database, environment).chat(
      "usr_flow",
      "wsp_flow",
      {
        messages: [{ content: "Show my food expenses this month", role: "user" }],
      },
      trace,
    );

    expect(result.toolResults[0]).toMatchObject({
      name: "flow.searchTransactions",
      result: [{ categoryName: "Food" }],
    });
    const toolTrace = trace.mock.calls.find(([stage]) => stage === "tool.request");
    expect(toolTrace?.[1]).toMatchObject({
      queryParams: {
        hasQuery: true,
        period: "this_month",
      },
    });
  });

  it("drops an invalid last-two period without rejecting the valid intent", async () => {
    const { database } = createDatabase();
    const trace = vi.fn<FlowTrace>();
    mockOllamaPlan({
      evidence: { limit: "two", type: "food expense" },
      filters: { limit: 2, period: "last_two", type: "expense" },
      intent: "search_transactions",
      response: "I will show your two most recent food expenses.",
    });

    const result = await new FlowService(database, environment).chat(
      "usr_flow",
      "wsp_flow",
      {
        messages: [{ content: "what is last two food expense", role: "user" }],
      },
      trace,
    );

    expect(result.toolResults[0]?.name).toBe("flow.searchTransactions");
    const toolTrace = trace.mock.calls.find(([stage]) => stage === "tool.request");
    expect(toolTrace?.[1]).toMatchObject({
      queryParams: {
        limit: 2,
        period: null,
        type: "expense",
      },
    });
  });

  it("refuses transaction updates instead of hallucinating execution", async () => {
    const { database } = createDatabase();
    mockOllamaPlan({
      intent: "update_transaction",
      response: "Updated the transaction.",
    });

    const result = await new FlowService(database, environment).chat("usr_flow", "wsp_flow", {
      messages: [{ content: "Change yesterday lunch to 600", role: "user" }],
    });

    expect(result.message).toContain("Flow is read-only right now");
    expect(result).not.toHaveProperty("proposal");
    expect(result.toolResults).toEqual([]);
  });

  it("refuses transaction deletes instead of hallucinating execution", async () => {
    const { database } = createDatabase();
    mockOllamaPlan({
      intent: "delete_transaction",
      response: "Deleted the transaction.",
    });

    const result = await new FlowService(database, environment).chat("usr_flow", "wsp_flow", {
      messages: [{ content: "Delete my lunch transaction", role: "user" }],
    });

    expect(result.message).toContain("Flow is read-only right now");
    expect(result).not.toHaveProperty("proposal");
    expect(result.toolResults).toEqual([]);
  });

  it("returns unknown without keyword classification when model JSON is malformed", async () => {
    const { database } = createDatabase();
    mockMalformedOllamaResponse();

    const result = await new FlowService(database, environment).chat("usr_flow", "wsp_flow", {
      messages: [
        {
          content:
            "Ask me to search transactions or explain this month. Flow is read-only right now.",
          role: "assistant",
        },
        { content: "Summarize this month", role: "user" },
      ],
    });

    expect(result.message).toContain("could not safely classify");
    expect(result.toolResults).toEqual([]);
  });

  it("does not infer a write intent when model JSON is malformed", async () => {
    const { database } = createDatabase();
    mockMalformedOllamaResponse();

    const result = await new FlowService(database, environment).chat("usr_flow", "wsp_flow", {
      messages: [
        {
          content:
            "Ask me to search transactions or explain this month. Flow is read-only right now.",
          role: "assistant",
        },
        { content: "Summarize this month", role: "user" },
        {
          content:
            "I could not safely read that Flow response. Please ask again with the transaction or report details.",
          role: "assistant",
        },
        { content: "Add 500 food expense today", role: "user" },
      ],
    });

    expect(result.message).toContain("could not safely classify");
    expect(result).not.toHaveProperty("proposal");
    expect(result.toolResults).toEqual([]);
  });
});
