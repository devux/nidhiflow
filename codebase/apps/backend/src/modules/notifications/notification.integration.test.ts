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
  };
}

interface PreferencesResponseBody {
  data: {
    billRemindersEnabled: boolean;
    emailEnabled: boolean;
    flowLaunchEnabled: boolean;
    inAppEnabled: boolean;
    timezone: string;
  };
}

interface FlowSubscriptionResponseBody {
  data: {
    debugToken: string;
    email: string;
    unsubscribedAt: string | null;
  };
}

interface NotificationsResponseBody {
  data: unknown[];
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

describe("notification integration", () => {
  beforeAll(async () => {
    const migrationDatabaseName = `nidhiflow_m11_${Date.now()}`;
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

  it("manages notification preferences and Flow launch consent", async () => {
    const app = createApp({
      database,
      environment,
      logger: pino({ enabled: false }),
    });
    const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const registerResponse = await request(app)
      .post("/api/v1/auth/register")
      .send({
        displayName: "Nila",
        email: `nila-${unique}@example.com`,
        locale: "en-IN",
        password: "NotifySecret1234",
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

    expect(verifyResponse.status).toBe(200);

    const preferencesResponse = await request(app)
      .get("/api/v1/users/me/notification-preferences")
      .set("Authorization", `Bearer ${accessToken}`);
    const preferencesBody = preferencesResponse.body as PreferencesResponseBody;

    expect(preferencesResponse.status).toBe(200);
    expect(preferencesBody.data).toMatchObject({
      billRemindersEnabled: true,
      emailEnabled: false,
      flowLaunchEnabled: false,
      inAppEnabled: true,
      timezone: "Asia/Kolkata",
    });

    const updatePreferencesResponse = await request(app)
      .patch("/api/v1/users/me/notification-preferences")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        billRemindersEnabled: false,
        emailEnabled: true,
        flowLaunchEnabled: true,
      });
    const updatePreferencesBody = updatePreferencesResponse.body as PreferencesResponseBody;

    expect(updatePreferencesResponse.status).toBe(200);
    expect(updatePreferencesBody.data).toMatchObject({
      billRemindersEnabled: false,
      emailEnabled: true,
      flowLaunchEnabled: true,
    });

    const notificationsResponse = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${accessToken}`);
    const notificationsBody = notificationsResponse.body as NotificationsResponseBody;

    expect(notificationsResponse.status).toBe(200);
    expect(notificationsBody.data).toEqual([]);

    const subscriptionResponse = await request(app)
      .post("/api/v1/flow-launch-subscriptions")
      .send({ email: `flow-${unique}@example.com` });
    const subscriptionBody = subscriptionResponse.body as FlowSubscriptionResponseBody;

    expect(subscriptionResponse.status).toBe(201);
    expect(subscriptionBody.data.debugToken).toEqual(expect.any(String));
    expect(subscriptionBody.data.unsubscribedAt).toBeNull();

    const unsubscribeResponse = await request(app).delete(
      `/api/v1/flow-launch-subscriptions/${subscriptionBody.data.debugToken}`,
    );
    const unsubscribeBody = unsubscribeResponse.body as FlowSubscriptionResponseBody;

    expect(unsubscribeResponse.status).toBe(200);
    expect(unsubscribeBody.data.unsubscribedAt).toEqual(expect.any(String));
  });
});
