import pino from "pino";
import type { QueryResult, QueryResultRow } from "pg";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Environment } from "./config/environment.js";
import { createApp } from "./createApp.js";
import { resetRateLimitStore } from "./middleware/rateLimit.js";
import type { Database } from "../shared/database/database.js";
import type { ErrorDetail } from "./http.js";

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
  FLOW_AI_ENABLED: false,
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
  CORS_ORIGINS: ["http://localhost:5173", "http://127.0.0.1:5173"],
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

function createTestDatabase(isReady: Database["isReady"]): {
  database: Database;
  queryMock: ReturnType<typeof vi.fn>;
} {
  const queryMock = vi.fn();
  const transaction: Database["transaction"] = (callback) =>
    callback({ query: queryMock as Database["query"] });

  return {
    database: {
      close: vi.fn(),
      isReady,
      query: queryMock as Database["query"],
      transaction,
    },
    queryMock,
  };
}

interface ErrorResponseBody {
  error: {
    code: string;
    details?: ErrorDetail[];
  };
  meta: {
    requestId: string;
  };
  message: string;
  success: false;
}

interface OpenApiResponseBody {
  components: {
    schemas: Record<string, unknown>;
    securitySchemes: Record<string, unknown>;
  };
  openapi: string;
  paths: Record<string, unknown>;
}

beforeEach(() => {
  resetRateLimitStore();
});

describe("health endpoints", () => {
  it("returns liveness without requiring database access", async () => {
    const isReady = vi.fn();
    const { database } = createTestDatabase(isReady);
    const app = createApp({ database, environment, logger: pino({ enabled: false }) });

    const response = await request(app).get("/health/live");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
    expect(isReady).not.toHaveBeenCalled();
  });

  it("returns ready when PostgreSQL is available", async () => {
    const { database } = createTestDatabase(vi.fn().mockResolvedValue(true));
    const app = createApp({ database, environment, logger: pino({ enabled: false }) });

    const response = await request(app).get("/health/ready");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ready" });
  });

  it("hides database failures behind a safe readiness response", async () => {
    const { database } = createTestDatabase(
      vi.fn().mockRejectedValue(new Error("sensitive database detail")),
    );
    const app = createApp({ database, environment, logger: pino({ enabled: false }) });

    const response = await request(app).get("/health/ready");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: "unavailable" });
    expect(response.text).not.toContain("sensitive database detail");
  });
});

describe("API foundation", () => {
  it("allows local frontend origins for auth preflight requests", async () => {
    const app = createApp({
      database: createTestDatabase(vi.fn().mockResolvedValue(true)).database,
      environment,
      logger: pino({ enabled: false }),
    });

    for (const origin of ["http://localhost:5173", "http://127.0.0.1:5173"]) {
      const response = await request(app)
        .options("/api/v1/auth/register")
        .set("Origin", origin)
        .set("Access-Control-Request-Method", "POST")
        .set("Access-Control-Request-Headers", "content-type");

      expect(response.status).toBe(204);
      expect(response.headers["access-control-allow-origin"]).toBe(origin);
      expect(response.headers["access-control-allow-credentials"]).toBe("true");
    }
  });

  it("returns the standard 404 envelope with a request id", async () => {
    const app = createApp({
      database: createTestDatabase(vi.fn().mockResolvedValue(true)).database,
      environment,
      logger: pino({ enabled: false }),
    });

    const response = await request(app).get("/api/v1/unknown").set("X-Request-Id", "req_test_123");

    expect(response.status).toBe(404);
    expect(response.headers["x-request-id"]).toBe("req_test_123");
    expect(response.body).toMatchObject({
      success: false,
      message: "The requested resource was not found.",
      error: { code: "NOT_FOUND" },
      meta: { requestId: "req_test_123" },
    });
  });

  it("returns the OpenAPI contract from the versioned API", async () => {
    const app = createApp({
      database: createTestDatabase(vi.fn().mockResolvedValue(true)).database,
      environment,
      logger: pino({ enabled: false }),
    });

    const response = await request(app).get("/api/v1/openapi.json");
    const body = response.body as OpenApiResponseBody;

    expect(response.status).toBe(200);
    expect(body.openapi).toBe("3.0.3");
    expect(body.components.securitySchemes.bearerAuth).toBeDefined();
    expect(body.components.schemas.SuccessResponse).toBeDefined();
    expect(body.components.schemas.ErrorResponse).toBeDefined();
    expect(body.components.schemas.Transaction).toBeDefined();
    expect(body.paths["/api/v1/feedback"]).toBeDefined();
    expect(body.paths["/api/v1/users/me/guest-migrations/preview"]).toBeDefined();
    expect(body.paths["/api/v1/users/me/guest-migrations"]).toBeDefined();
    expect(body.paths["/api/v1/users/me/notification-preferences"]).toBeDefined();
    expect(body.paths["/api/v1/notifications"]).toBeDefined();
    expect(body.paths["/api/v1/notifications/{notificationId}/read"]).toBeDefined();
    expect(body.paths["/api/v1/notifications/read-all"]).toBeDefined();
    expect(body.paths["/api/v1/flow-launch-subscriptions"]).toBeDefined();
    expect(body.paths["/api/v1/flow-launch-subscriptions/{token}"]).toBeDefined();
    expect(body.paths["/api/v1/workspace-invitations/{token}/accept"]).toBeDefined();
    expect(body.paths["/api/v1/workspaces/{workspaceId}/accounts"]).toBeDefined();
    expect(body.paths["/api/v1/workspaces/{workspaceId}/members"]).toBeDefined();
    expect(body.paths["/api/v1/workspaces/{workspaceId}/invitations"]).toBeDefined();
    expect(body.paths["/api/v1/workspaces/{workspaceId}/members/{userId}"]).toBeDefined();
    expect(body.paths["/api/v1/workspaces/{workspaceId}/leave"]).toBeDefined();
    expect(body.paths["/api/v1/workspaces/{workspaceId}/categories"]).toBeDefined();
    expect(body.paths["/api/v1/workspaces/{workspaceId}/transactions"]).toBeDefined();
    expect(body.paths["/api/v1/workspaces/{workspaceId}/budgets"]).toBeDefined();
    expect(body.paths["/api/v1/workspaces/{workspaceId}/goals"]).toBeDefined();
    expect(body.paths["/api/v1/workspaces/{workspaceId}/bills"]).toBeDefined();
    expect(body.paths["/api/v1/workspaces/{workspaceId}/reports/summary"]).toBeDefined();
    expect(body.paths["/api/v1/workspaces/{workspaceId}/reports/categories"]).toBeDefined();
    expect(body.paths["/api/v1/workspaces/{workspaceId}/reports/cash-flow"]).toBeDefined();
    expect(body.paths["/api/v1/workspaces/{workspaceId}/reports/exports"]).toBeDefined();
    expect(body.paths["/api/v1/workspaces/{workspaceId}/reports/exports/{exportId}"]).toBeDefined();
    expect(
      body.paths["/api/v1/workspaces/{workspaceId}/reports/exports/{exportId}/download"],
    ).toBeDefined();
    expect(body.paths["/api/v1/workspaces/{workspaceId}/recurring-transactions"]).toBeDefined();
  });

  it("serves Swagger UI at /api-docs", async () => {
    const app = createApp({
      database: createTestDatabase(vi.fn().mockResolvedValue(true)).database,
      environment,
      logger: pino({ enabled: false }),
    });

    const response = await request(app).get("/api-docs");

    expect(response.status).toBe(200);
    expect(response.text).toContain("NidhiFlow API Docs");
    expect(response.text).toContain("/api-docs/swagger-ui-bundle.js");
  });

  it("validates request bodies with the standard 422 envelope", async () => {
    const app = createApp({
      database: createTestDatabase(vi.fn().mockResolvedValue(true)).database,
      environment,
      logger: pino({ enabled: false }),
    });

    const response = await request(app).post("/api/v1/feedback").send({
      category: "issue",
      description: "short",
    });
    const body = response.body as ErrorResponseBody;

    expect(response.status).toBe(422);
    expect(body).toMatchObject({
      success: false,
      message: "The request could not be processed.",
      error: {
        code: "VALIDATION_ERROR",
      },
    });
    expect(body.error.details).toEqual([
      {
        field: "description",
        message: "Description must be at least 10 characters.",
      },
    ]);
  });

  it("creates feedback through the modular API route", async () => {
    const { database, queryMock } = createTestDatabase(vi.fn().mockResolvedValue(true));
    queryMock.mockResolvedValue(
      createQueryResult([
        {
          id: "fbk_123",
          category: "suggestion",
          createdAt: "2026-06-16T00:00:00.000Z",
          description: "Please add CSV export.",
          status: "open",
        },
      ]),
    );
    const app = createApp({ database, environment, logger: pino({ enabled: false }) });

    const response = await request(app).post("/api/v1/feedback").send({
      category: "suggestion",
      description: "Please add CSV export.",
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      success: true,
      message: "Feedback received successfully",
      data: {
        id: "fbk_123",
        category: "suggestion",
      },
    });
  });

  it("rate limits repeated public feedback requests", async () => {
    const { database, queryMock } = createTestDatabase(vi.fn().mockResolvedValue(true));
    queryMock.mockResolvedValue(
      createQueryResult([
        {
          id: "fbk_123",
          category: "issue",
          createdAt: "2026-06-16T00:00:00.000Z",
          description: "Example feedback body.",
          status: "open",
        },
      ]),
    );
    const app = createApp({ database, environment, logger: pino({ enabled: false }) });

    await request(app).post("/api/v1/feedback").send({
      category: "issue",
      description: "Example feedback body.",
    });
    await request(app).post("/api/v1/feedback").send({
      category: "issue",
      description: "Example feedback body.",
    });
    const response = await request(app).post("/api/v1/feedback").send({
      category: "issue",
      description: "Example feedback body.",
    });
    const body = response.body as ErrorResponseBody;

    expect(response.status).toBe(429);
    expect(body.error.code).toBe("RATE_LIMITED");
  });

  it("lists system categories in the standard success envelope", async () => {
    const { database, queryMock } = createTestDatabase(vi.fn().mockResolvedValue(true));
    queryMock.mockResolvedValue(
      createQueryResult([
        {
          id: "cat_food",
          name: "Food",
          transactionType: "expense",
          iconKey: "expense",
          colorToken: "brand",
        },
      ]),
    );
    const app = createApp({ database, environment, logger: pino({ enabled: false }) });

    const response = await request(app)
      .get("/api/v1/categories/system")
      .query({ transactionType: "expense" });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: [
        {
          id: "cat_food",
          name: "Food",
          transactionType: "expense",
        },
      ],
    });
  });
});
