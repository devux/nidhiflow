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
    accessToken: string;
  };
}

interface PreferencesResponseBody {
  data: {
    billRemindersEnabled: boolean;
    emailEnabled: boolean;
    flowLaunchEnabled: boolean;
    inAppEnabled: boolean;
    pushEnabled: boolean;
    quietHoursEnabled: boolean;
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

interface PushTokenResponseBody {
  data: {
    id: string;
    isActive: boolean;
    platform: "android" | "web";
    token?: string;
  };
}

interface TestPushResponseBody {
  data: {
    configured: boolean;
    sent: number;
    skipped: number | string;
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
    const accessToken = registerBody.data.accessToken;

    expect(registerResponse.status).toBe(201);

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
      pushEnabled: false,
      quietHoursEnabled: false,
      timezone: "Asia/Kolkata",
    });

    const updatePreferencesResponse = await request(app)
      .patch("/api/v1/users/me/notification-preferences")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        billRemindersEnabled: false,
        emailEnabled: true,
        flowLaunchEnabled: true,
        pushEnabled: true,
        quietHoursEnabled: false,
      });
    const updatePreferencesBody = updatePreferencesResponse.body as PreferencesResponseBody;

    expect(updatePreferencesResponse.status).toBe(200);
    expect(updatePreferencesBody.data).toMatchObject({
      billRemindersEnabled: false,
      emailEnabled: true,
      flowLaunchEnabled: true,
      pushEnabled: true,
    });

    const invalidTokenResponse = await request(app)
      .post("/api/v1/push-tokens")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        platform: "ios",
        token: "x".repeat(40),
      });

    expect(invalidTokenResponse.status).toBe(422);

    const pushTokenResponse = await request(app)
      .post("/api/v1/push-tokens")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        deviceName: "Pixel test",
        os: "Android",
        platform: "android",
        token: `fcm-${"x".repeat(80)}`,
      });
    const pushTokenBody = pushTokenResponse.body as PushTokenResponseBody;

    expect(pushTokenResponse.status).toBe(201);
    expect(pushTokenBody.data).toMatchObject({
      isActive: true,
      platform: "android",
    });
    expect(pushTokenBody.data.token).toBeUndefined();

    const testPushResponse = await request(app)
      .post("/api/v1/notifications/test-push")
      .set("Authorization", `Bearer ${accessToken}`);
    const testPushBody = testPushResponse.body as TestPushResponseBody;

    expect(testPushResponse.status).toBe(200);
    expect(testPushBody.data).toMatchObject({
      configured: false,
      sent: 0,
      skipped: "fcm_not_configured",
    });

    const secondRegisterResponse = await request(app)
      .post("/api/v1/auth/register")
      .send({
        displayName: "Mina",
        email: `mina-${unique}@example.com`,
        locale: "en-IN",
        password: "NotifySecret1234",
        preferredCurrency: "INR",
        theme: "light",
        timezone: "Asia/Kolkata",
      });
    const secondAccessToken = (secondRegisterResponse.body as RegisterResponseBody).data
      .accessToken;
    const forbiddenDeleteResponse = await request(app)
      .delete(`/api/v1/push-tokens/${pushTokenBody.data.id}`)
      .set("Authorization", `Bearer ${secondAccessToken}`);

    expect(forbiddenDeleteResponse.status).toBe(404);

    const deleteTokenResponse = await request(app)
      .delete(`/api/v1/push-tokens/${pushTokenBody.data.id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(deleteTokenResponse.status).toBe(200);

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
