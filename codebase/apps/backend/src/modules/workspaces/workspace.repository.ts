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

  async updateWorkspaceSettings(
    workspaceId: string,
    updates: {
      name?: string;
      reportingCurrency?: string;
      timezone?: string;
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
