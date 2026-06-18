import { fileURLToPath } from "node:url";

import { runner } from "node-pg-migrate";
import { Client } from "pg";
import pino from "pino";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../../app/createApp.js";
import { parseEnvironment, type Environment } from "../../app/config/environment.js";
import { createDatabase, type Database } from "../../shared/database/database.js";

interface RegisterResponseBody {
  data: {
    debugToken: string;
  };
}

interface VerifyResponseBody {
  data: {
    accessToken: string;
    workspace: {
      id: string;
    };
  };
}

interface IdResponseBody {
  data: {
    id: string;
  };
}

interface BudgetSummaryResponseBody {
  data: {
    budgets: Array<{
      id: string;
      remainingAmount: string;
      spentAmount: string;
    }>;
    limitTotalMinor: string;
    remainingTotalMinor: string;
    spentTotalMinor: string;
  };
}

interface GoalResponseBody {
  data: {
    fundedAmount: string;
    id: string;
    remainingAmount: string;
    status: string;
  };
}

interface BillMarkPaidResponseBody {
  data: {
    bill: {
      id: string;
      paidTransactionId: string | null;
    };
    created: boolean;
    transaction: {
      id: string;
    };
  };
}

interface RecurringResponseBody {
  data: {
    id: string;
    isActive: boolean;
  };
}

function buildDatabaseUrl(baseUrl: string, databaseName: string) {
  const url = new URL(baseUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

const baseEnvironment = parseEnvironment(process.env);
let database: Database;
let environment: Environment;
let adminClient: Client;

describe("planning integration", () => {
  beforeAll(async () => {
    const migrationDatabaseName = `nidhiflow_m8_${Date.now()}`;
    const adminUrl = new URL(baseEnvironment.DATABASE_URL);
    adminUrl.pathname = "/postgres";
    const migrationsDirectory = fileURLToPath(new URL("../../../migrations", import.meta.url));

    adminClient = new Client({
      connectionString: adminUrl.toString(),
      ssl: baseEnvironment.DATABASE_SSL ? { rejectUnauthorized: true } : false,
    });
    await adminClient.connect();
    await adminClient.query(`CREATE DATABASE ${migrationDatabaseName} TEMPLATE template0`);

    await runner({
      checkOrder: false,
      databaseUrl: buildDatabaseUrl(baseEnvironment.DATABASE_URL, migrationDatabaseName),
      dir: migrationsDirectory,
      direction: "up",
      log: () => undefined,
      migrationsTable: "pgmigrations",
      singleTransaction: false,
    });

    environment = {
      ...baseEnvironment,
      APP_ENV: "test",
      DATABASE_URL: buildDatabaseUrl(baseEnvironment.DATABASE_URL, migrationDatabaseName),
    };
    database = createDatabase(environment);
  });

  afterAll(async () => {
    await database.close();
    const databaseName = new URL(environment.DATABASE_URL).pathname.slice(1);

    await adminClient.query(
      `SELECT pg_terminate_backend(pid)
         FROM pg_stat_activity
        WHERE datname = $1
          AND pid <> pg_backend_pid()`,
      [databaseName],
    );
    await adminClient.query(`DROP DATABASE IF EXISTS ${databaseName}`);
    await adminClient.end();
  });

  it("supports budgets, goals, bills, and recurring templates", async () => {
    const app = createApp({
      database,
      environment,
      logger: pino({ enabled: false }),
    });

    const registerResponse = await request(app).post("/api/v1/auth/register").send({
      displayName: "Riya",
      email: "riya@example.com",
      locale: "en-IN",
      password: "RiyaSecret1234",
      preferredCurrency: "INR",
      theme: "light",
      timezone: "Asia/Kolkata",
    });
    const registerBody = registerResponse.body as RegisterResponseBody;
    expect(registerResponse.status).toBe(202);
    expect(registerBody.data.debugToken).toEqual(expect.any(String));

    const verifyResponse = await request(app).post("/api/v1/auth/verify-email").send({
      token: registerBody.data.debugToken,
    });
    const verifyBody = verifyResponse.body as VerifyResponseBody;
    const accessToken = verifyBody.data.accessToken;
    const workspaceId = verifyBody.data.workspace.id;

    const accountResponse = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/accounts`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        currency: "INR",
        name: "Cash",
        openingBalance: { amount: "1000.0000", currency: "INR" },
        type: "cash",
      });
    expect(accountResponse.status).toBe(201);
    const accountBody = accountResponse.body as IdResponseBody;

    const budgetResponse = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/budgets`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        currency: "INR",
        limitAmount: { amount: "500.0000", currency: "INR" },
        periodEnd: "2026-06-30",
        periodStart: "2026-06-01",
      });
    expect(budgetResponse.status).toBe(201);
    expect(budgetResponse.body.data).toMatchObject({
      periodEnd: "2026-06-30",
      periodStart: "2026-06-01",
    });

    const duplicateBudgetResponse = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/budgets`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        currency: "INR",
        limitAmount: { amount: "500.0000", currency: "INR" },
        periodEnd: "2026-06-30",
        periodStart: "2026-06-01",
      });
    expect(duplicateBudgetResponse.status).toBe(409);
    expect(duplicateBudgetResponse.body.error.code).toBe("CONFLICT");

    const spendingResponse = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/transactions`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        accountId: accountBody.data.id,
        categoryId: "cat_food",
        money: { amount: "120.0000", currency: "INR" },
        transactionDate: "2026-06-16",
        type: "expense",
      });
    expect(spendingResponse.status).toBe(201);

    const budgetSummaryResponse = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/budgets/summary`)
      .set("Authorization", `Bearer ${accessToken}`);
    const budgetSummaryBody = budgetSummaryResponse.body as BudgetSummaryResponseBody;
    expect(budgetSummaryResponse.status).toBe(200);
    expect(budgetSummaryBody.data.budgets).toHaveLength(1);
    expect(budgetSummaryBody.data.budgets[0]).toMatchObject({
      periodEnd: "2026-06-30",
      periodStart: "2026-06-01",
      spentAmount: "120.0000",
      remainingAmount: "380.0000",
    });

    const archiveBudgetResponse = await request(app)
      .delete(`/api/v1/workspaces/${workspaceId}/budgets/${budgetResponse.body.data.id}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(archiveBudgetResponse.status).toBe(200);
    expect(archiveBudgetResponse.body.data.deletedAt).toEqual(expect.any(String));

    const archivedBudgetResponse = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/budgets/${budgetResponse.body.data.id}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(archivedBudgetResponse.status).toBe(404);

    const goalResponse = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/goals`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        currency: "INR",
        name: "Emergency Fund",
        targetAmount: { amount: "200.0000", currency: "INR" },
        type: "savings",
      });
    expect(goalResponse.status).toBe(201);
    const goalBody = goalResponse.body as GoalResponseBody;

    const contributionResponse = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/goals/${goalBody.data.id}/contributions`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        amount: { amount: "50.0000", currency: "INR" },
        contributionDate: "2026-06-16",
      });
    expect(contributionResponse.status).toBe(201);

    const goalDetailsResponse = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/goals/${goalBody.data.id}`)
      .set("Authorization", `Bearer ${accessToken}`);
    const goalDetailsBody = goalDetailsResponse.body as GoalResponseBody;
    expect(goalDetailsResponse.status).toBe(200);
    expect(goalDetailsBody.data).toMatchObject({
      fundedAmount: "50.0000",
      remainingAmount: "150.0000",
    });

    const completedTooSoonResponse = await request(app)
      .patch(`/api/v1/workspaces/${workspaceId}/goals/${goalBody.data.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ status: "completed" });
    expect(completedTooSoonResponse.status).toBe(409);

    const secondContributionResponse = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/goals/${goalBody.data.id}/contributions`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        amount: { amount: "150.0000", currency: "INR" },
        contributionDate: "2026-06-17",
      });
    expect(secondContributionResponse.status).toBe(201);

    const completedGoalResponse = await request(app)
      .patch(`/api/v1/workspaces/${workspaceId}/goals/${goalBody.data.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ status: "completed" });
    const completedGoalBody = completedGoalResponse.body as GoalResponseBody;
    expect(completedGoalResponse.status).toBe(200);
    expect(completedGoalBody.data.status).toBe("completed");

    const billResponse = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/bills`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        accountId: accountBody.data.id,
        amount: { amount: "80.0000", currency: "INR" },
        categoryId: "cat_bills",
        dueDate: "2026-07-01",
        name: "Electricity",
        recurrenceRule: "RRULE:FREQ=MONTHLY",
      });
    expect(billResponse.status).toBe(201);
    const billBody = billResponse.body as IdResponseBody;

    const markPaidResponse = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/bills/${billBody.data.id}/mark-paid`)
      .set("Authorization", `Bearer ${accessToken}`);
    const markPaidBody = markPaidResponse.body as BillMarkPaidResponseBody;
    expect(markPaidResponse.status).toBe(200);
    expect(markPaidBody.data.created).toBe(true);
    expect(markPaidBody.data.transaction).toBeDefined();

    const markPaidAgainResponse = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/bills/${billBody.data.id}/mark-paid`)
      .set("Authorization", `Bearer ${accessToken}`);
    const markPaidAgainBody = markPaidAgainResponse.body as BillMarkPaidResponseBody;
    expect(markPaidAgainResponse.status).toBe(200);
    expect(markPaidAgainBody.data.created).toBe(false);
    expect(markPaidAgainBody.data.transaction.id).toBe(markPaidBody.data.transaction.id);

    const recurringResponse = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/recurring-transactions`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        accountId: accountBody.data.id,
        amount: { amount: "25.0000", currency: "INR" },
        categoryId: "cat_food",
        name: "Monthly coffee",
        nextOccurrence: "2026-07-01",
        scheduleRule: "RRULE:FREQ=MONTHLY",
        timezone: "Asia/Kolkata",
        type: "expense",
      });
    expect(recurringResponse.status).toBe(201);
    const recurringBody = recurringResponse.body as RecurringResponseBody;

    const pauseResponse = await request(app)
      .post(
        `/api/v1/workspaces/${workspaceId}/recurring-transactions/${recurringBody.data.id}/pause`,
      )
      .set("Authorization", `Bearer ${accessToken}`);
    const pauseBody = pauseResponse.body as RecurringResponseBody;
    expect(pauseResponse.status).toBe(200);
    expect(pauseBody.data.isActive).toBe(false);

    const resumeResponse = await request(app)
      .post(
        `/api/v1/workspaces/${workspaceId}/recurring-transactions/${recurringBody.data.id}/resume`,
      )
      .set("Authorization", `Bearer ${accessToken}`);
    const resumeBody = resumeResponse.body as RecurringResponseBody;
    expect(resumeResponse.status).toBe(200);
    expect(resumeBody.data.isActive).toBe(true);
  });
});
