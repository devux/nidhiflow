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

interface AccountResponseBody {
  data: {
    currentBalance: string;
    id: string;
    name: string;
  };
}

interface SummaryResponseBody {
  data: {
    assetTotalMinor: string;
    liabilityTotalMinor: string;
    netWorthMinor: string;
  };
}

interface TransactionResponseBody {
  data: Array<{
    amount: string;
    categoryId: string | null;
    destinationAccountId: string | null;
    id: string;
    type: "income" | "expense" | "transfer";
  }>;
}

interface CategoryResponseBody {
  data: Array<{
    id: string;
    isSystem: boolean;
    name: string;
  }>;
}

function buildDatabaseUrl(baseUrl: string, databaseName: string) {
  const url = new URL(baseUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

function minorUnits(value: string) {
  const trimmed = value.trim();
  const negative = trimmed.startsWith("-");
  const [wholePartRaw, fractionalPart = ""] = (negative ? trimmed.slice(1) : trimmed).split(".");
  const wholePart = BigInt(wholePartRaw || "0");
  const normalizedFraction = `${fractionalPart}0000`.slice(0, 4);
  const magnitude = wholePart * 10_000n + BigInt(normalizedFraction);

  return negative ? -magnitude : magnitude;
}

const baseEnvironment = parseEnvironment(process.env);
let database: Database;
let environment: Environment;
let adminClient: Client;

describe("finance workflow integration", () => {
  beforeAll(async () => {
    const migrationDatabaseName = `nidhiflow_m7_${Date.now()}`;
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

  it("creates accounts, categories, transfers, and keeps balances aligned", async () => {
    const app = createApp({
      database,
      environment,
      logger: pino({ enabled: false }),
    });

    const registerResponse = await request(app).post("/api/v1/auth/register").send({
      displayName: "Mina",
      email: "mina@example.com",
      locale: "en-IN",
      password: "MinaSecret1234",
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

    expect(verifyResponse.status).toBe(200);

    const categoryResponse = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/categories`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Groceries",
        transactionType: "expense",
      });
    const categoryBody = categoryResponse.body as { data: { id: string } };

    expect(categoryResponse.status).toBe(201);
    expect(categoryBody.data.id).toEqual(expect.any(String));

    const cashResponse = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/accounts`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        currency: "INR",
        name: "Cash",
        openingBalance: { amount: "1000.0000", currency: "INR" },
        type: "cash",
      });
    const cashBody = cashResponse.body as AccountResponseBody;

    expect(cashResponse.status).toBe(201);
    expect(minorUnits(cashBody.data.currentBalance)).toBe(10_000_000n);

    const bankResponse = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/accounts`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        currency: "INR",
        name: "Bank",
        openingBalance: { amount: "0.0000", currency: "INR" },
        type: "bank",
      });
    const bankBody = bankResponse.body as AccountResponseBody;

    expect(bankResponse.status).toBe(201);
    expect(minorUnits(bankBody.data.currentBalance)).toBe(0n);

    const transferResponse = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/transactions`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        accountId: cashBody.data.id,
        destinationAccountId: bankBody.data.id,
        money: { amount: "250.0000", currency: "INR" },
        transactionDate: "2026-06-16",
        type: "transfer",
      });

    expect(transferResponse.status).toBe(201);

    const expenseResponse = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/transactions`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        accountId: cashBody.data.id,
        categoryId: categoryBody.data.id,
        money: { amount: "100.0000", currency: "INR" },
        note: "Groceries",
        transactionDate: "2026-06-16",
        type: "expense",
      });

    expect(expenseResponse.status).toBe(201);

    const incomeResponse = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/transactions`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        accountId: cashBody.data.id,
        categoryId: "cat_salary",
        money: { amount: "1.0000", currency: "INR" },
        transactionDate: "2026-06-16",
        type: "income",
      });
    const incomeBody = incomeResponse.body as { data: { id: string } };

    expect(incomeResponse.status).toBe(201);

    const unauthenticatedUpdateResponse = await request(app)
      .patch(`/api/v1/workspaces/${workspaceId}/transactions/${incomeBody.data.id}`)
      .send({
        accountId: cashBody.data.id,
        categoryId: "cat_salary",
        money: { amount: "2.0000", currency: "INR" },
        transactionDate: "2026-06-16",
        type: "income",
      });

    expect(unauthenticatedUpdateResponse.status).toBe(401);

    const updateResponse = await request(app)
      .patch(`/api/v1/workspaces/${workspaceId}/transactions/${incomeBody.data.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        accountId: cashBody.data.id,
        categoryId: "cat_salary",
        money: { amount: "2.0000", currency: "INR" },
        note: "Corrected income",
        transactionDate: "2026-06-16",
        type: "income",
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.amount).toBe("2.0000");

    const deleteResponse = await request(app)
      .delete(`/api/v1/workspaces/${workspaceId}/transactions/${incomeBody.data.id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(deleteResponse.status).toBe(200);

    const accountsResponse = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/accounts`)
      .set("Authorization", `Bearer ${accessToken}`);
    const accountsBody = accountsResponse.body as {
      data: Array<{ currentBalance: string; name: string }>;
    };

    expect(accountsResponse.status).toBe(200);
    const cashAccount = accountsBody.data.find((account) => account.name === "Cash");
    const bankAccount = accountsBody.data.find((account) => account.name === "Bank");

    expect(cashAccount).toBeDefined();
    expect(bankAccount).toBeDefined();
    expect(minorUnits(cashAccount?.currentBalance ?? "0")).toBe(6_500_000n);
    expect(minorUnits(bankAccount?.currentBalance ?? "0")).toBe(2_500_000n);

    const summaryResponse = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/accounts/summary`)
      .set("Authorization", `Bearer ${accessToken}`);
    const summaryBody = summaryResponse.body as SummaryResponseBody;

    expect(summaryResponse.status).toBe(200);
    expect(summaryBody.data).toMatchObject({
      assetTotalMinor: "9000000",
      liabilityTotalMinor: "0",
      netWorthMinor: "9000000",
    });

    const transactionsResponse = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/transactions`)
      .set("Authorization", `Bearer ${accessToken}`);
    const transactionsBody = transactionsResponse.body as TransactionResponseBody;

    expect(transactionsResponse.status).toBe(200);
    expect(transactionsBody.data).toHaveLength(2);
    expect(transactionsBody.data.map((transaction) => transaction.type).sort()).toEqual([
      "expense",
      "transfer",
    ]);

    const categoriesResponse = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/categories`)
      .set("Authorization", `Bearer ${accessToken}`);
    const categoriesBody = categoriesResponse.body as CategoryResponseBody;

    expect(categoriesResponse.status).toBe(200);
    expect(categoriesBody.data.some((category) => category.name === "Groceries")).toBe(true);
    expect(
      categoriesBody.data.some((category) => category.name === "Food" && category.isSystem),
    ).toBe(true);
  });
});
