import type { Queryable } from "../../shared/database/database.js";

export interface WorkspaceMembershipRecord {
  createdAt: string;
  id: string;
  membershipId: string;
  membershipRole: "manager" | "member";
  reportingCurrency: string;
  timezone: string;
  type: "personal" | "family";
}

export interface WorkspaceDetailRecord extends WorkspaceMembershipRecord {
  name: string;
}

export interface WorkspaceMemberRecord {
  displayName: string;
  email: string;
  joinedAt: string;
  membershipId: string;
  membershipRole: "manager" | "member";
  userId: string;
}

export interface WorkspaceInvitationRecord {
  acceptedAt: string | null;
  acceptedByUserId: string | null;
  createdAt: string;
  expiresAt: string;
  id: string;
  invitedByUserId: string;
  invitedEmail: string | null;
  revokedAt: string | null;
  status: "pending" | "accepted" | "revoked" | "expired";
  updatedAt: string;
  workspaceId: string;
  workspaceName: string;
  workspaceType: "personal" | "family";
}

export class WorkspaceRepository {
  constructor(private readonly database: Queryable) {}

  async findPersonalWorkspaceForUser(userId: string, queryable: Queryable = this.database) {
    const result = await queryable.query<WorkspaceDetailRecord>(
      `SELECT w.id,
              wm.id AS "membershipId",
              wm.membership_role AS "membershipRole",
              w.name,
              w.type,
              w.reporting_currency AS "reportingCurrency",
              w.timezone,
              w.created_at AS "createdAt"
         FROM workspaces w
         JOIN workspace_members wm
           ON wm.workspace_id = w.id
        WHERE wm.user_id = $1
          AND w.type = 'personal'
          AND w.deleted_at IS NULL
        ORDER BY w.created_at ASC
        LIMIT 1`,
      [userId],
    );

    return result.rows[0] ?? null;
  }

  async createPersonalWorkspace(
    input: {
      createdByUserId: string;
      id: string;
      membershipId: string;
      name: string;
      reportingCurrency: string;
      timezone: string;
    },
    queryable: Queryable = this.database,
  ) {
    await queryable.query(
      `INSERT INTO workspaces (
         id,
         name,
         type,
         reporting_currency,
         timezone,
         created_by_user_id
       ) VALUES ($1, $2, 'personal', $3, $4, $5)`,
      [input.id, input.name, input.reportingCurrency, input.timezone, input.createdByUserId],
    );

    await queryable.query(
      `INSERT INTO workspace_members (
         id,
         workspace_id,
         user_id,
         membership_role
       ) VALUES ($1, $2, $3, 'manager')`,
      [input.membershipId, input.id, input.createdByUserId],
    );
  }

  async createWorkspace(
    input: {
      createdByUserId: string;
      id: string;
      membershipId: string;
      name: string;
      reportingCurrency: string;
      timezone: string;
      type: "personal" | "family";
    },
    queryable: Queryable = this.database,
  ) {
    const result = await queryable.query<WorkspaceDetailRecord>(
      `WITH created_workspace AS (
         INSERT INTO workspaces (
           id,
           name,
           type,
           reporting_currency,
           timezone,
           created_by_user_id
         ) VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, name, type, reporting_currency, timezone, created_at
       ),
       created_membership AS (
         INSERT INTO workspace_members (
           id,
           workspace_id,
           user_id,
           membership_role
         ) VALUES ($7, $1, $6, 'manager')
         RETURNING id, membership_role
       )
       SELECT cw.id,
              cm.id AS "membershipId",
              cm.membership_role AS "membershipRole",
              cw.name,
              cw.type,
              cw.reporting_currency AS "reportingCurrency",
              cw.timezone,
              cw.created_at AS "createdAt"
         FROM created_workspace cw
         CROSS JOIN created_membership cm`,
      [
        input.id,
        input.name,
        input.type,
        input.reportingCurrency,
        input.timezone,
        input.createdByUserId,
        input.membershipId,
      ],
    );

    return result.rows[0] ?? null;
  }

  async updateWorkspaceSettings(
    workspaceId: string,
    updates: {
      name?: string | undefined;
      reportingCurrency?: string | undefined;
      timezone?: string | undefined;
    },
    queryable: Queryable = this.database,
  ) {
    const assignments: string[] = [];
    const values: unknown[] = [];

    if (updates.name !== undefined) {
      values.push(updates.name);
      assignments.push(`name = $${values.length}`);
    }

    if (updates.reportingCurrency !== undefined) {
      values.push(updates.reportingCurrency);
      assignments.push(`reporting_currency = $${values.length}`);
    }

    if (updates.timezone !== undefined) {
      values.push(updates.timezone);
      assignments.push(`timezone = $${values.length}`);
    }

    if (assignments.length === 0) {
      return;
    }

    values.push(workspaceId);

    await queryable.query(
      `UPDATE workspaces
          SET ${assignments.join(", ")},
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $${values.length}`,
      values,
    );
  }

  async archiveWorkspace(workspaceId: string, queryable: Queryable = this.database) {
    await queryable.query(
      `UPDATE workspaces
          SET deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP),
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND deleted_at IS NULL`,
      [workspaceId],
    );
  }

  async listMembers(workspaceId: string, queryable: Queryable = this.database) {
    const result = await queryable.query<WorkspaceMemberRecord>(
      `SELECT wm.id AS "membershipId",
              wm.user_id AS "userId",
              wm.membership_role AS "membershipRole",
              wm.joined_at AS "joinedAt",
              u.display_name AS "displayName",
              u.email
         FROM workspace_members wm
         JOIN users u
           ON u.id = wm.user_id
        WHERE wm.workspace_id = $1
          AND u.deleted_at IS NULL
        ORDER BY wm.joined_at ASC, u.display_name ASC`,
      [workspaceId],
    );

    return result.rows;
  }

  async countManagers(workspaceId: string, queryable: Queryable = this.database) {
    const result = await queryable.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
         FROM workspace_members
        WHERE workspace_id = $1
          AND membership_role = 'manager'`,
      [workspaceId],
    );

    return Number(result.rows[0]?.count ?? "0");
  }

  async removeMember(workspaceId: string, userId: string, queryable: Queryable = this.database) {
    const result = await queryable.query<WorkspaceMemberRecord>(
      `DELETE FROM workspace_members
        WHERE workspace_id = $1
          AND user_id = $2
       RETURNING id AS "membershipId",
                 user_id AS "userId",
                 membership_role AS "membershipRole",
                 joined_at AS "joinedAt",
                 ''::text AS "displayName",
                 ''::text AS email`,
      [workspaceId, userId],
    );

    return result.rows[0] ?? null;
  }

  async createInvitation(
    input: {
      expiresAt: string;
      id: string;
      invitedByUserId: string;
      invitedEmail: string | null;
      tokenHash: string;
      workspaceId: string;
    },
    queryable: Queryable = this.database,
  ) {
    const result = await queryable.query<WorkspaceInvitationRecord>(
      `INSERT INTO workspace_invitations (
         id,
         workspace_id,
         invited_email,
         invited_by_user_id,
         token_hash,
         expires_at
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id,
                 workspace_id AS "workspaceId",
                 invited_email AS "invitedEmail",
                 invited_by_user_id AS "invitedByUserId",
                 status,
                 expires_at AS "expiresAt",
                 accepted_by_user_id AS "acceptedByUserId",
                 accepted_at AS "acceptedAt",
                 revoked_at AS "revokedAt",
                 created_at AS "createdAt",
                 updated_at AS "updatedAt",
                 ''::text AS "workspaceName",
                 'family'::text AS "workspaceType"`,
      [
        input.id,
        input.workspaceId,
        input.invitedEmail,
        input.invitedByUserId,
        input.tokenHash,
        input.expiresAt,
      ],
    );

    return result.rows[0] ?? null;
  }

  async findInvitationByTokenHash(tokenHash: string, queryable: Queryable = this.database) {
    const result = await queryable.query<WorkspaceInvitationRecord>(
      `SELECT wi.id,
              wi.workspace_id AS "workspaceId",
              wi.invited_email AS "invitedEmail",
              wi.invited_by_user_id AS "invitedByUserId",
              wi.status,
              wi.expires_at AS "expiresAt",
              wi.accepted_by_user_id AS "acceptedByUserId",
              wi.accepted_at AS "acceptedAt",
              wi.revoked_at AS "revokedAt",
              wi.created_at AS "createdAt",
              wi.updated_at AS "updatedAt",
              w.name AS "workspaceName",
              w.type AS "workspaceType"
         FROM workspace_invitations wi
         JOIN workspaces w
           ON w.id = wi.workspace_id
        WHERE wi.token_hash = $1
          AND w.deleted_at IS NULL
        LIMIT 1`,
      [tokenHash],
    );

    return result.rows[0] ?? null;
  }

  async acceptInvitation(
    invitationId: string,
    userId: string,
    queryable: Queryable = this.database,
  ) {
    await queryable.query(
      `UPDATE workspace_invitations
          SET status = 'accepted',
              accepted_by_user_id = $2,
              accepted_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $1`,
      [invitationId, userId],
    );
  }

  async expireInvitation(invitationId: string, queryable: Queryable = this.database) {
    await queryable.query(
      `UPDATE workspace_invitations
          SET status = 'expired',
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND status = 'pending'`,
      [invitationId],
    );
  }

  async addMember(
    input: {
      membershipId: string;
      membershipRole: "manager" | "member";
      userId: string;
      workspaceId: string;
    },
    queryable: Queryable = this.database,
  ) {
    const result = await queryable.query<{ membershipId: string }>(
      `INSERT INTO workspace_members (
         id,
         workspace_id,
         user_id,
         membership_role
       ) VALUES ($1, $2, $3, $4)
       ON CONFLICT (workspace_id, user_id) DO NOTHING
       RETURNING id AS "membershipId"`,
      [input.membershipId, input.workspaceId, input.userId, input.membershipRole],
    );

    return result.rows[0] ?? null;
  }

  async listMemberships(userId: string, queryable: Queryable = this.database) {
    const result = await queryable.query<WorkspaceDetailRecord>(
      `SELECT w.id,
              wm.id AS "membershipId",
              wm.membership_role AS "membershipRole",
              w.name,
              w.type,
              w.reporting_currency AS "reportingCurrency",
              w.timezone,
              w.created_at AS "createdAt"
         FROM workspaces w
         JOIN workspace_members wm
           ON wm.workspace_id = w.id
        WHERE wm.user_id = $1
          AND w.deleted_at IS NULL
        ORDER BY w.created_at ASC`,
      [userId],
    );

    return result.rows;
  }

  async findWorkspaceForUser(
    userId: string,
    workspaceId: string,
    queryable: Queryable = this.database,
  ) {
    const result = await queryable.query<WorkspaceDetailRecord>(
      `SELECT w.id,
              wm.id AS "membershipId",
              wm.membership_role AS "membershipRole",
              w.name,
              w.type,
              w.reporting_currency AS "reportingCurrency",
              w.timezone,
              w.created_at AS "createdAt"
         FROM workspaces w
         JOIN workspace_members wm
           ON wm.workspace_id = w.id
        WHERE wm.user_id = $1
          AND w.id = $2
          AND w.deleted_at IS NULL
        LIMIT 1`,
      [userId, workspaceId],
    );

    return result.rows[0] ?? null;
  }
}
