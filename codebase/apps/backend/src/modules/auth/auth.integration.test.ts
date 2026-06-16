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
      type: string;
    };
  };
}

interface LoginResponseBody {
  data: {
    accessToken: string;
  };
}

interface CurrentUserResponseBody {
  data: {
    displayName: string;
    email: string;
    preferredCurrency: string;
    theme: string;
    timezone: string;
  };
}

interface SessionsResponseBody {
  data: Array<{
    id: string;
    isCurrent: boolean;
  }>;
}

interface WorkspaceListResponseBody {
  data: Array<{
    id: string;
    type: string;
  }>;
}

interface WorkspaceDetailResponseBody {
  data: {
    id: string;
  };
}

interface ForgotPasswordResponseBody {
  data: {
    debugToken: string;
  };
}

function buildDatabaseUrl(baseUrl: string, databaseName: string) {
  const url = new URL(baseUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

function getSetCookie(response: request.Response) {
  const cookie = response.headers["set-cookie"]?.[0];

  if (!cookie) {
    throw new Error("Expected a refresh cookie.");
  }

  return cookie.split(";")[0] ?? cookie;
}

const baseEnvironment = parseEnvironment(process.env);
let database: Database;
let environment: Environment;
let adminClient: Client;

describe("authentication integration", () => {
  beforeAll(async () => {
    const migrationDatabaseName = `nidhiflow_m5_${Date.now()}`;
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

  it("supports register, verify, sessions, workspace membership, and password reset flows", async () => {
    const app = createApp({
      database,
      environment,
      logger: pino({ enabled: false }),
    });

    const registerResponse = await request(app).post("/api/v1/auth/register").send({
      displayName: "Asha",
      email: "ASHA@example.com",
      locale: "en-IN",
      password: "AshaSecret1234",
      preferredCurrency: "INR",
      theme: "dark",
      timezone: "Asia/Kolkata",
    });
    const registerBody = registerResponse.body as RegisterResponseBody;

    expect(registerResponse.status).toBe(202);
    expect(registerBody.data.debugToken).toEqual(expect.any(String));

    const loginBeforeVerifyResponse = await request(app).post("/api/v1/auth/login").send({
      email: "asha@example.com",
      password: "AshaSecret1234",
    });

    expect(loginBeforeVerifyResponse.status).toBe(401);

    const verifyResponse = await request(app).post("/api/v1/auth/verify-email").send({
      token: registerBody.data.debugToken,
    });
    const verifyBody = verifyResponse.body as VerifyResponseBody;
    const initialCookie = getSetCookie(verifyResponse);
    const initialAccessToken = verifyBody.data.accessToken;
    const workspaceId = verifyBody.data.workspace.id;

    expect(verifyResponse.status).toBe(200);
    expect(verifyBody.data.workspace.type).toBe("personal");

    const currentUserResponse = await request(app)
      .get("/api/v1/users/me")
      .set("Authorization", `Bearer ${initialAccessToken}`);
    const currentUserBody = currentUserResponse.body as CurrentUserResponseBody;

    expect(currentUserResponse.status).toBe(200);
    expect(currentUserBody.data).toMatchObject({
      displayName: "Asha",
      email: "asha@example.com",
      preferredCurrency: "INR",
      theme: "dark",
      timezone: "Asia/Kolkata",
    });

    const secondLoginResponse = await request(app).post("/api/v1/auth/login").send({
      deviceName: "Pixel 9",
      email: "asha@example.com",
      password: "AshaSecret1234",
    });
    const secondLoginBody = secondLoginResponse.body as LoginResponseBody;
    const secondCookie = getSetCookie(secondLoginResponse);
    const secondAccessToken = secondLoginBody.data.accessToken;

    expect(secondLoginResponse.status).toBe(200);

    const sessionsResponse = await request(app)
      .get("/api/v1/users/me/sessions")
      .set("Authorization", `Bearer ${secondAccessToken}`);
    const sessionsBody = sessionsResponse.body as SessionsResponseBody;

    expect(sessionsResponse.status).toBe(200);
    expect(sessionsBody.data).toHaveLength(2);

    const workspaceListResponse = await request(app)
      .get("/api/v1/workspaces")
      .set("Authorization", `Bearer ${secondAccessToken}`);
    const workspaceListBody = workspaceListResponse.body as WorkspaceListResponseBody;

    expect(workspaceListResponse.status).toBe(200);
    expect(workspaceListBody.data).toHaveLength(1);
    expect(workspaceListBody.data[0]).toMatchObject({
      id: workspaceId,
      type: "personal",
    });

    const workspaceDetailResponse = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}`)
      .set("Authorization", `Bearer ${secondAccessToken}`);
    const workspaceDetailBody = workspaceDetailResponse.body as WorkspaceDetailResponseBody;

    expect(workspaceDetailResponse.status).toBe(200);
    expect(workspaceDetailBody.data.id).toBe(workspaceId);

    const foreignWorkspaceResponse = await request(app)
      .get("/api/v1/workspaces/wrk_foreign")
      .set("Authorization", `Bearer ${secondAccessToken}`);

    expect(foreignWorkspaceResponse.status).toBe(404);

    const initialSession = sessionsBody.data.find((session) => session.isCurrent === false);

    expect(initialSession).toBeDefined();

    const revokeSessionResponse = await request(app)
      .delete(`/api/v1/users/me/sessions/${initialSession?.id ?? "missing"}`)
      .set("Authorization", `Bearer ${secondAccessToken}`);

    expect(revokeSessionResponse.status).toBe(200);

    const refreshRevokedSessionResponse = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", initialCookie);

    expect(refreshRevokedSessionResponse.status).toBe(401);

    const refreshActiveSessionResponse = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", secondCookie);
    const refreshActiveSessionBody = refreshActiveSessionResponse.body as LoginResponseBody;

    expect(refreshActiveSessionResponse.status).toBe(200);
    expect(refreshActiveSessionBody.data.accessToken).toEqual(expect.any(String));

    const forgotPasswordResponse = await request(app).post("/api/v1/auth/forgot-password").send({
      email: "asha@example.com",
    });
    const forgotPasswordBody = forgotPasswordResponse.body as ForgotPasswordResponseBody;

    expect(forgotPasswordResponse.status).toBe(202);
    expect(forgotPasswordBody.data.debugToken).toEqual(expect.any(String));

    const resetPasswordResponse = await request(app).post("/api/v1/auth/reset-password").send({
      password: "EvenStronger1234",
      token: forgotPasswordBody.data.debugToken,
    });

    expect(resetPasswordResponse.status).toBe(200);

    const oldPasswordLoginResponse = await request(app).post("/api/v1/auth/login").send({
      email: "asha@example.com",
      password: "AshaSecret1234",
    });

    expect(oldPasswordLoginResponse.status).toBe(401);

    const newPasswordLoginResponse = await request(app).post("/api/v1/auth/login").send({
      email: "asha@example.com",
      password: "EvenStronger1234",
    });

    expect(newPasswordLoginResponse.status).toBe(200);
  });
});
