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

interface ReportSummaryResponseBody {
  data: {
    currency: string;
    period: { from: string; label: string; period: string; to: string; timezone: string };
    spendingByAccount: Array<{ accountName: string; amountMinor: string }>;
    spendingByCategory: Array<{ categoryName: string; amountMinor: string }>;
    totals: {
      expenseMinor: string;
      incomeMinor: string;
      netSavingsMinor: string;
      transactionCount: number;
      transferMinor: string;
    };
  };
}

interface ReportCashFlowResponseBody {
  data: {
    points: Array<{
      date: string;
      expenseMinor: string;
      incomeMinor: string;
      netMinor: string;
      transactionCount: number;
      transferMinor: string;
    }>;
  };
}

interface ReportExportResponseBody {
  data: {
    downloadUrl: string;
    id: string;
    reportType: string;
    status: string;
  };
}

function buildDatabaseUrl(baseUrl: string, databaseName: string) {
  const url = new URL(baseUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

function getZonedDateString(timeZone: string, date: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

function addMonths(dateString: string, months: number) {
  const [yearRaw, monthRaw, dayRaw] = dateString.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCMonth(date.getUTCMonth() + months);
  return `${date.getUTCFullYear().toString().padStart(4, "0")}-${(date.getUTCMonth() + 1)
    .toString()
    .padStart(2, "0")}-${date.getUTCDate().toString().padStart(2, "0")}`;
}

function startOfMonth(dateString: string) {
  return `${dateString.slice(0, 7)}-01`;
}

const baseEnvironment = parseEnvironment(process.env);
let database: Database;
let environment: Environment;
let adminClient: Client;

describe("reporting integration", () => {
  beforeAll(async () => {
    const migrationDatabaseName = `nidhiflow_m9_${Date.now()}`;
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

  it("summarizes reports with workspace timezone boundaries and downloads CSV exports", async () => {
    const app = createApp({
      database,
      environment,
      logger: pino({ enabled: false }),
    });
    const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const email = `report-${unique}@example.com`;
    const registerResponse = await request(app).post("/api/v1/auth/register").send({
      displayName: "Ria",
      email,
      locale: "en-IN",
      password: "ReportSecret1234",
      preferredCurrency: "INR",
      theme: "light",
      timezone: "Asia/Kolkata",
    });
    const registerBody = registerResponse.body as RegisterResponseBody;
    const verifyResponse = await request(app).post("/api/v1/auth/verify-email").send({
      token: registerBody.data.debugToken,
    });
    const verifyBody = verifyResponse.body as VerifyResponseBody;
    const accessToken = verifyBody.data.accessToken;
    const workspaceId = verifyBody.data.workspace.id;
    const timezone = "Asia/Kolkata";
    const today = getZonedDateString(timezone);
    const lastMonthDate = addMonths(startOfMonth(today), -1);

    const categoryResponse = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/categories`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Groceries",
        transactionType: "expense",
      });
    const categoryBody = categoryResponse.body as { data: { id: string } };

    const cashResponse = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/accounts`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        currency: "INR",
        name: "Cash",
        openingBalance: { amount: "1000.0000", currency: "INR" },
        type: "cash",
      });
    const cashBody = cashResponse.body as { data: { id: string } };

    const bankResponse = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/accounts`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        currency: "INR",
        name: "Bank",
        openingBalance: { amount: "0.0000", currency: "INR" },
        type: "bank",
      });
    const bankBody = bankResponse.body as { data: { id: string } };

    await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/transactions`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        accountId: cashBody.data.id,
        categoryId: "cat_salary",
        money: { amount: "1000.0000", currency: "INR" },
        transactionDate: today,
        type: "income",
      });

    await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/transactions`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        accountId: cashBody.data.id,
        categoryId: categoryBody.data.id,
        money: { amount: "200.0000", currency: "INR" },
        note: "Groceries",
        transactionDate: today,
        type: "expense",
      });

    await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/transactions`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        accountId: cashBody.data.id,
        destinationAccountId: bankBody.data.id,
        money: { amount: "50.0000", currency: "INR" },
        transactionDate: today,
        type: "transfer",
      });

    await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/transactions`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        accountId: cashBody.data.id,
        categoryId: categoryBody.data.id,
        money: { amount: "300.0000", currency: "INR" },
        note: "Previous month groceries",
        transactionDate: lastMonthDate,
        type: "expense",
      });

    const thisMonthSummaryResponse = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/reports/summary?period=thisMonth`)
      .set("Authorization", `Bearer ${accessToken}`);
    const thisMonthSummary = thisMonthSummaryResponse.body as ReportSummaryResponseBody;

    expect(thisMonthSummaryResponse.status).toBe(200);
    expect(thisMonthSummary.data).toMatchObject({
      currency: "INR",
      totals: {
        expenseMinor: "200.0000",
        incomeMinor: "1000.0000",
        netSavingsMinor: "800.0000",
        transactionCount: 3,
        transferMinor: "50.0000",
      },
    });
    expect(thisMonthSummary.data.spendingByCategory).toEqual([
      expect.objectContaining({
        categoryName: "Groceries",
        amountMinor: "200.0000",
      }),
    ]);
    expect(thisMonthSummary.data.spendingByAccount).toEqual([
      expect.objectContaining({
        accountName: "Cash",
        amountMinor: "200.0000",
      }),
    ]);

    const previousMonthSummaryResponse = await request(app)
      .get(
        `/api/v1/workspaces/${workspaceId}/reports/summary?period=custom&from=${lastMonthDate}&to=${lastMonthDate}`,
      )
      .set("Authorization", `Bearer ${accessToken}`);
    const previousMonthSummary = previousMonthSummaryResponse.body as ReportSummaryResponseBody;

    expect(previousMonthSummaryResponse.status).toBe(200);
    expect(previousMonthSummary.data.totals).toMatchObject({
      expenseMinor: "300.0000",
      incomeMinor: "0",
      netSavingsMinor: "-300.0000",
      transactionCount: 1,
      transferMinor: "0",
    });

    const cashFlowResponse = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/reports/cash-flow?period=thisMonth`)
      .set("Authorization", `Bearer ${accessToken}`);
    const cashFlow = cashFlowResponse.body as ReportCashFlowResponseBody;

    expect(cashFlowResponse.status).toBe(200);
    expect(cashFlow.data.points).toEqual([
      expect.objectContaining({
        date: today,
        expenseMinor: "200.0000",
        incomeMinor: "1000.0000",
        netMinor: "800.0000",
        transactionCount: 3,
        transferMinor: "50.0000",
      }),
    ]);

    const exportResponse = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/reports/exports`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        period: "thisMonth",
        reportType: "categories",
      });
    const exportBody = exportResponse.body as ReportExportResponseBody;

    expect(exportResponse.status).toBe(201);
    expect(exportBody.data.downloadUrl).toContain("/download");
    expect(exportBody.data.status).toBe("completed");

    const downloadResponse = await request(app)
      .get(exportBody.data.downloadUrl)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(downloadResponse.status).toBe(200);
    expect(downloadResponse.headers["content-type"]).toContain("text/csv");
    expect(downloadResponse.text).toContain("Groceries");
    expect(downloadResponse.text).toContain("Cash");
  });
});
