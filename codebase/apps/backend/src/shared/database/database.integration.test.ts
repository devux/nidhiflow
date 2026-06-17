import { fileURLToPath } from "node:url";

import { runner } from "node-pg-migrate";
import { Client } from "pg";
import { afterAll, describe, expect, it } from "vitest";

import { parseEnvironment } from "../../app/config/environment.js";
import { createDatabase } from "./database.js";

const environment = parseEnvironment(process.env);
const database = createDatabase(environment);

describe("PostgreSQL integration", () => {
  afterAll(async () => {
    await database.close();
  });

  it("connects to the configured database", async () => {
    await expect(database.isReady()).resolves.toBe(true);
  });

  it("runs migrations from an empty database", async () => {
    const migrationDatabaseName = `nidhiflow_m4_${Date.now()}`;
    const adminUrl = new URL(environment.DATABASE_URL);
    adminUrl.pathname = "/postgres";
    const migrationUrl = new URL(environment.DATABASE_URL);
    migrationUrl.pathname = `/${migrationDatabaseName}`;
    const adminClient = new Client({
      connectionString: adminUrl.toString(),
      ssl: environment.DATABASE_SSL ? { rejectUnauthorized: true } : false,
    });
    const migrationsDirectory = fileURLToPath(new URL("../../../migrations", import.meta.url));

    await adminClient.connect();
    await adminClient.query(`CREATE DATABASE ${migrationDatabaseName} TEMPLATE template0`);

    try {
      await runner({
        checkOrder: false,
        databaseUrl: migrationUrl.toString(),
        dir: migrationsDirectory,
        direction: "up",
        log: () => undefined,
        migrationsTable: "pgmigrations",
        singleTransaction: false,
      });

      const migratedClient = new Client({
        connectionString: migrationUrl.toString(),
        ssl: environment.DATABASE_SSL ? { rejectUnauthorized: true } : false,
      });

      try {
        await migratedClient.connect();
        const tables = await migratedClient.query<{ table_name: string }>(
          `SELECT table_name
           FROM information_schema.tables
          WHERE table_schema = 'public'
             AND table_name IN ('users', 'workspaces', 'workspace_invitations', 'categories', 'transactions', 'budgets', 'goals', 'goal_contributions', 'bills', 'recurring_transactions', 'feedback', 'audit_logs', 'auth_sessions', 'guest_migrations', 'generated_reports', 'notifications', 'notification_preferences', 'flow_launch_subscriptions')
           ORDER BY table_name`,
        );
        const categories = await migratedClient.query<{ count: string }>(
          "SELECT COUNT(*)::text AS count FROM categories WHERE is_system = TRUE",
        );

        expect(tables.rows.map((row) => row.table_name)).toEqual([
          "audit_logs",
          "auth_sessions",
          "bills",
          "budgets",
          "categories",
          "feedback",
          "flow_launch_subscriptions",
          "generated_reports",
          "goal_contributions",
          "goals",
          "guest_migrations",
          "notification_preferences",
          "notifications",
          "recurring_transactions",
          "transactions",
          "users",
          "workspace_invitations",
          "workspaces",
        ]);
        expect(Number(categories.rows[0]?.count ?? "0")).toBeGreaterThanOrEqual(13);
      } finally {
        await migratedClient.end();
      }
    } finally {
      await adminClient.query(
        `SELECT pg_terminate_backend(pid)
         FROM pg_stat_activity
         WHERE datname = $1
           AND pid <> pg_backend_pid()`,
        [migrationDatabaseName],
      );
      await adminClient.query(`DROP DATABASE IF EXISTS ${migrationDatabaseName}`);
      await adminClient.end();
    }
  });
});
