import { fileURLToPath } from "node:url";

import { runner } from "node-pg-migrate";
import { Client } from "pg";
import pino from "pino";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../../app/createApp.js";
import { parseEnvironment, type Environment } from "../../app/config/environment.js";
import { createDatabase, type Database } from "../../shared/database/database.js";

interface MigrationResponseBody {
  data: {
    migrationId: string;
    summary: {
      balanceMinor: string;
      duplicateTransactions: number;
      expenseMinor: string;
      importedTransactions: number;
      incomeMinor: string;
      skippedDeletedTransactions: number;
      totalTransactions: number;
    };
    workspaceId: string;
  };
}

interface MigrationPreviewResponseBody {
  data: {
    summary: {
      balanceMinor: string;
      duplicateTransactions: number;
      expenseMinor: string;
      importableTransactions: number;
      incomeMinor: string;
      skippedDeletedTransactions: number;
      totalTransactions: number;
    };
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

describe("guest migrations integration", () => {
  beforeAll(async () => {
    const migrationDatabaseName = `nidhiflow_m6_${Date.now()}`;
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

  it("previews and commits a guest migration with idempotency and duplicate detection", async () => {
    const app = createApp({
      database,
      environment,
      logger: pino({ enabled: false }),
    });

    const registerResponse = await request(app).post("/api/v1/auth/register").send({
      displayName: "Riya",
      email: "riya@example.com",
      locale: "en-IN",
      password: "VeryStrong1234",
      preferredCurrency: "INR",
      theme: "dark",
      timezone: "Asia/Kolkata",
    });
    const verifyResponse = await request(app)
      .post("/api/v1/auth/verify-email")
      .send({
        token: (registerResponse.body as { data: { debugToken: string } }).data.debugToken,
      });
    const accessToken = (verifyResponse.body as { data: { accessToken: string } }).data.accessToken;

    const payload = {
      clientMigrationId: "migration_guest_001",
      guestProfile: {
        currency: "INR",
        displayName: "Riya",
        locale: "en-IN",
        timezone: "Asia/Kolkata",
      },
      transactions: [
        {
          amountMinor: "125000",
          category: "Salary",
          createdAt: "2026-06-10T09:00:00.000Z",
          currency: "INR",
          id: "guest_txn_1",
          note: "Salary credited",
          transactionDate: "2026-06-10",
          type: "income",
          updatedAt: "2026-06-10T09:00:00.000Z",
        },
        {
          amountMinor: "5000",
          category: "Food",
          createdAt: "2026-06-11T10:00:00.000Z",
          currency: "INR",
          deletedAt: "2026-06-11T12:00:00.000Z",
          id: "guest_txn_deleted",
          note: "Deleted snack",
          transactionDate: "2026-06-11",
          type: "expense",
          updatedAt: "2026-06-11T12:00:00.000Z",
        },
        {
          amountMinor: "15000",
          category: "Bills",
          createdAt: "2026-06-12T08:30:00.000Z",
          currency: "INR",
          id: "guest_txn_2",
          note: "Electric bill",
          transactionDate: "2026-06-12",
          type: "expense",
          updatedAt: "2026-06-12T08:30:00.000Z",
        },
      ],
      workspace: {
        currency: "INR",
        name: "Riya's Finances",
        timezone: "Asia/Kolkata",
      },
    };

    const previewResponse = await request(app)
      .post("/api/v1/users/me/guest-migrations/preview")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(payload);

    expect(previewResponse.status).toBe(200);
    expect(previewResponse.body).toMatchObject({
      success: true,
      data: {
        summary: {
          totalTransactions: 3,
          importableTransactions: 2,
          duplicateTransactions: 0,
          skippedDeletedTransactions: 1,
          incomeMinor: "125000",
          expenseMinor: "15000",
          balanceMinor: "110000",
        },
      },
    });

    const commitResponse = await request(app)
      .post("/api/v1/users/me/guest-migrations")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("Idempotency-Key", "migration-key-001")
      .send({
        ...payload,
        confirm: true,
      });

    expect(commitResponse.status).toBe(201);
    expect(commitResponse.body).toMatchObject({
      success: true,
      data: {
        clientMigrationId: "migration_guest_001",
        summary: {
          totalTransactions: 3,
          importedTransactions: 2,
          duplicateTransactions: 0,
          skippedDeletedTransactions: 1,
          incomeMinor: "125000",
          expenseMinor: "15000",
          balanceMinor: "110000",
        },
        verification: {
          verified: true,
        },
      },
    });
    const commitBody = commitResponse.body as MigrationResponseBody & {
      data: { idMapping: { transactions: unknown[] } };
    };
    expect(commitBody.data.idMapping.transactions).toHaveLength(2);

    const repeatCommitResponse = await request(app)
      .post("/api/v1/users/me/guest-migrations")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("Idempotency-Key", "migration-key-001")
      .send({
        ...payload,
        confirm: true,
      });

    const repeatCommitBody = repeatCommitResponse.body as MigrationResponseBody;

    expect(repeatCommitResponse.status).toBe(201);
    expect(repeatCommitBody.data.migrationId).toBe(commitBody.data.migrationId);

    const duplicatePreviewResponse = await request(app)
      .post("/api/v1/users/me/guest-migrations/preview")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(payload);

    const duplicatePreviewBody = duplicatePreviewResponse.body as MigrationPreviewResponseBody;

    expect(duplicatePreviewResponse.status).toBe(200);
    expect(duplicatePreviewBody.data.summary).toMatchObject({
      totalTransactions: 3,
      importableTransactions: 0,
      duplicateTransactions: 2,
      skippedDeletedTransactions: 1,
      incomeMinor: "0",
      expenseMinor: "0",
      balanceMinor: "0",
    });

    const storedTransactions = await database.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
         FROM transactions
        WHERE client_id IN ('guest_txn_1', 'guest_txn_2')
          AND account_id IS NOT NULL`,
    );

    expect(storedTransactions.rows[0]?.count).toBe("2");

    const accountSummaryResponse = await request(app)
      .get(`/api/v1/workspaces/${commitBody.data.workspaceId}/accounts/summary`)
      .set("Authorization", `Bearer ${accessToken}`);
    const accountSummaryBody = accountSummaryResponse.body as {
      data: { accounts: Array<{ currentBalance: string; name: string }> };
    };

    expect(accountSummaryResponse.status).toBe(200);
    expect(accountSummaryBody.data.accounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currentBalance: "1100.0000",
          name: "Migrated guest cash",
        }),
      ]),
    );
  });

  it("rolls back a failed guest migration commit", async () => {
    const app = createApp({
      database,
      environment,
      logger: pino({ enabled: false }),
    });

    const loginResponse = await request(app).post("/api/v1/auth/login").send({
      email: "riya@example.com",
      password: "VeryStrong1234",
    });
    const accessToken = (loginResponse.body as { data: { accessToken: string } }).data.accessToken;

    const failingPayload = {
      clientMigrationId: "migration_guest_rollback",
      guestProfile: {
        currency: "INR",
        displayName: "Riya",
        locale: "en-IN",
        timezone: "Asia/Kolkata",
      },
      transactions: [
        {
          amountMinor: "1000",
          category: "Food",
          createdAt: "2026-06-13T08:00:00.000Z",
          currency: "INR",
          id: "duplicate_client_id",
          note: "One",
          transactionDate: "2026-06-13",
          type: "expense",
          updatedAt: "2026-06-13T08:00:00.000Z",
        },
        {
          amountMinor: "2000",
          category: "Food",
          createdAt: "2026-06-13T09:00:00.000Z",
          currency: "INR",
          id: "duplicate_client_id",
          note: "Two",
          transactionDate: "2026-06-13",
          type: "expense",
          updatedAt: "2026-06-13T09:00:00.000Z",
        },
      ],
    };

    const failingCommitResponse = await request(app)
      .post("/api/v1/users/me/guest-migrations")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("Idempotency-Key", "migration-key-rollback")
      .send({
        ...failingPayload,
        confirm: true,
      });

    expect(failingCommitResponse.status).toBe(500);

    const rolledBackTransactions = await database.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
         FROM transactions
        WHERE client_id = 'duplicate_client_id'`,
    );
    const rolledBackMigrations = await database.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
         FROM guest_migrations
        WHERE client_migration_id = 'migration_guest_rollback'`,
    );

    expect(rolledBackTransactions.rows[0]?.count).toBe("0");
    expect(rolledBackMigrations.rows[0]?.count).toBe("0");
  });
});
