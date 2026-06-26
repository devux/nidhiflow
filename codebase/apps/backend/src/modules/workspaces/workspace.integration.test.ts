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

interface CurrentUserResponseBody {
  data: {
    email: string;
    id: string;
  };
}

interface WorkspaceResponseBody {
  data: {
    id: string;
    membershipRole: "manager" | "member";
    type: "personal" | "family";
  };
}

interface InvitationResponseBody {
  data: {
    debugToken: string;
    invitedEmail: string | null;
    status: string;
  };
}

interface ShareCodeResponseBody {
  data: {
    code: string;
    expiresAt: string;
    id: string;
    workspaceId: string;
  };
}

interface MembersResponseBody {
  data: Array<{
    email: string;
    membershipRole: "manager" | "member";
  }>;
}

interface IdResponseBody {
  data: {
    id: string;
  };
}

interface TransactionsResponseBody {
  data: Array<{
    createdByUserId: string | null;
    note: string | null;
  }>;
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

describe("family workspace integration", () => {
  beforeAll(async () => {
    const migrationDatabaseName = `nidhiflow_m10_${Date.now()}`;
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

  async function registerAndVerify(displayName: string, email: string) {
    const app = createApp({
      database,
      environment,
      logger: pino({ enabled: false }),
    });

    const registerResponse = await request(app).post("/api/v1/auth/register").send({
      displayName,
      email,
      locale: "en-IN",
      password: "FamilySecret1234",
      preferredCurrency: "INR",
      theme: "light",
      timezone: "Asia/Kolkata",
    });
    const registerBody = registerResponse.body as RegisterResponseBody;

    expect(registerResponse.status).toBe(201);

    const currentUserResponse = await request(app)
      .get("/api/v1/users/me")
      .set("Authorization", `Bearer ${registerBody.data.accessToken}`);
    const currentUserBody = currentUserResponse.body as CurrentUserResponseBody;

    expect(currentUserResponse.status).toBe(200);

    return {
      accessToken: registerBody.data.accessToken,
      app,
      user: currentUserBody.data,
    };
  }

  it("invites a member, shares finance workflows, and audits membership actions", async () => {
    const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const manager = await registerAndVerify("Maya", `maya-${unique}@example.com`);
    const member = await registerAndVerify("Arun", `arun-${unique}@example.com`);

    const createWorkspaceResponse = await request(manager.app)
      .post("/api/v1/workspaces")
      .set("Authorization", `Bearer ${manager.accessToken}`)
      .send({
        name: "Family Money",
        reportingCurrency: "INR",
        timezone: "Asia/Kolkata",
        type: "family",
      });
    const createWorkspaceBody = createWorkspaceResponse.body as WorkspaceResponseBody;
    const familyWorkspaceId = createWorkspaceBody.data.id;

    expect(createWorkspaceResponse.status).toBe(201);
    expect(createWorkspaceBody.data).toMatchObject({
      membershipRole: "manager",
      type: "family",
    });

    const invitationResponse = await request(manager.app)
      .post(`/api/v1/workspaces/${familyWorkspaceId}/invitations`)
      .set("Authorization", `Bearer ${manager.accessToken}`)
      .send({ email: member.user.email });
    const invitationBody = invitationResponse.body as InvitationResponseBody;

    expect(invitationResponse.status).toBe(201);
    expect(invitationBody.data).toMatchObject({
      invitedEmail: member.user.email,
      status: "pending",
    });
    expect(invitationBody.data.debugToken).toEqual(expect.any(String));

    const acceptResponse = await request(member.app)
      .post(`/api/v1/workspace-invitations/${invitationBody.data.debugToken}/accept`)
      .set("Authorization", `Bearer ${member.accessToken}`);
    const acceptBody = acceptResponse.body as WorkspaceResponseBody;

    expect(acceptResponse.status).toBe(200);
    expect(acceptBody.data).toMatchObject({
      id: familyWorkspaceId,
      membershipRole: "member",
      type: "family",
    });

    const membersResponse = await request(manager.app)
      .get(`/api/v1/workspaces/${familyWorkspaceId}/members`)
      .set("Authorization", `Bearer ${manager.accessToken}`);
    const membersBody = membersResponse.body as MembersResponseBody;

    expect(membersResponse.status).toBe(200);
    expect(membersBody.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: manager.user.email, membershipRole: "manager" }),
        expect.objectContaining({ email: member.user.email, membershipRole: "member" }),
      ]),
    );

    const accountResponse = await request(manager.app)
      .post(`/api/v1/workspaces/${familyWorkspaceId}/accounts`)
      .set("Authorization", `Bearer ${manager.accessToken}`)
      .send({
        currency: "INR",
        name: "Family Cash",
        openingBalance: { amount: "500.0000", currency: "INR" },
        type: "cash",
      });
    const accountBody = accountResponse.body as IdResponseBody;
    const accountId = accountBody.data.id;

    expect(accountResponse.status).toBe(201);

    const categoryResponse = await request(manager.app)
      .post(`/api/v1/workspaces/${familyWorkspaceId}/categories`)
      .set("Authorization", `Bearer ${manager.accessToken}`)
      .send({
        name: "Family Food",
        transactionType: "expense",
      });
    const categoryBody = categoryResponse.body as IdResponseBody;
    const categoryId = categoryBody.data.id;

    expect(categoryResponse.status).toBe(201);

    const transactionResponse = await request(member.app)
      .post(`/api/v1/workspaces/${familyWorkspaceId}/transactions`)
      .set("Authorization", `Bearer ${member.accessToken}`)
      .send({
        accountId,
        categoryId,
        money: { amount: "75.0000", currency: "INR" },
        note: "Family dinner",
        transactionDate: "2026-06-16",
        type: "expense",
      });

    expect(transactionResponse.status).toBe(201);

    const budgetResponse = await request(member.app)
      .post(`/api/v1/workspaces/${familyWorkspaceId}/budgets`)
      .set("Authorization", `Bearer ${member.accessToken}`)
      .send({
        currency: "INR",
        limitAmount: { amount: "500.0000", currency: "INR" },
        periodEnd: "2026-06-30",
        periodStart: "2026-06-01",
      });

    expect(budgetResponse.status).toBe(201);

    const goalResponse = await request(member.app)
      .post(`/api/v1/workspaces/${familyWorkspaceId}/goals`)
      .set("Authorization", `Bearer ${member.accessToken}`)
      .send({
        currency: "INR",
        name: `Emergency Fund ${unique}`,
        targetAmount: { amount: "1000.0000", currency: "INR" },
        targetDate: "2026-12-31",
        type: "savings",
      });

    expect(goalResponse.status).toBe(201);

    const activityResponse = await request(manager.app)
      .get(`/api/v1/workspaces/${familyWorkspaceId}/transactions`)
      .set("Authorization", `Bearer ${manager.accessToken}`);
    const activityBody = activityResponse.body as TransactionsResponseBody;

    expect(activityResponse.status).toBe(200);
    expect(activityBody.data).toEqual([
      expect.objectContaining({
        createdByUserId: member.user.id,
        note: "Family dinner",
      }),
    ]);

    const nonManagerInviteResponse = await request(member.app)
      .post(`/api/v1/workspaces/${familyWorkspaceId}/invitations`)
      .set("Authorization", `Bearer ${member.accessToken}`)
      .send({ email: `other-${unique}@example.com` });

    expect(nonManagerInviteResponse.status).toBe(403);

    const shareCodeResponse = await request(manager.app)
      .post(`/api/v1/workspaces/${familyWorkspaceId}/share-codes`)
      .set("Authorization", `Bearer ${manager.accessToken}`);
    const shareCodeBody = shareCodeResponse.body as ShareCodeResponseBody;

    expect(shareCodeResponse.status).toBe(201);
    expect(shareCodeBody.data).toMatchObject({
      workspaceId: familyWorkspaceId,
    });
    expect(shareCodeBody.data.code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);

    const shareMember = await registerAndVerify("Sara", `sara-${unique}@example.com`);
    const joinShareCodeResponse = await request(shareMember.app)
      .post(`/api/v1/workspace-invitations/share-codes/${shareCodeBody.data.code}/join`)
      .set("Authorization", `Bearer ${shareMember.accessToken}`);
    const joinShareCodeBody = joinShareCodeResponse.body as WorkspaceResponseBody;

    expect(joinShareCodeResponse.status).toBe(200);
    expect(joinShareCodeBody.data).toMatchObject({
      id: familyWorkspaceId,
      membershipRole: "member",
      type: "family",
    });

    const removeResponse = await request(manager.app)
      .delete(`/api/v1/workspaces/${familyWorkspaceId}/members/${member.user.id}`)
      .set("Authorization", `Bearer ${manager.accessToken}`);

    expect(removeResponse.status).toBe(200);

    const deniedAfterRemovalResponse = await request(member.app)
      .get(`/api/v1/workspaces/${familyWorkspaceId}`)
      .set("Authorization", `Bearer ${member.accessToken}`);

    expect(deniedAfterRemovalResponse.status).toBe(404);

    const auditActions = await database.query<{ action: string }>(
      `SELECT action
         FROM audit_logs
        WHERE workspace_id = $1
          AND action IN (
            'workspace.family.created',
            'workspace.invitation.created',
            'workspace.share_code.created',
            'workspace.member.joined',
            'workspace.member.removed'
          )
        ORDER BY created_at ASC`,
      [familyWorkspaceId],
    );

    expect(auditActions.rows.map((row) => row.action)).toEqual([
      "workspace.family.created",
      "workspace.invitation.created",
      "workspace.member.joined",
      "workspace.share_code.created",
      "workspace.member.joined",
      "workspace.member.removed",
    ]);
  });
});
