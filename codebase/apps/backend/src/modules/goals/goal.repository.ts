import type { Queryable } from "../../shared/database/database.js";

export interface GoalRecord {
  createdAt: string;
  currency: string;
  deletedAt: string | null;
  fundedAmount: string;
  id: string;
  imageKey: string | null;
  name: string;
  progressPercent: string;
  remainingAmount: string;
  status: "active" | "completed" | "archived";
  targetAmount: string;
  targetDate: string | null;
  type: "savings" | "debt";
  updatedAt: string;
  workspaceId: string;
}

export interface GoalContributionRecord {
  amount: string;
  contributionDate: string;
  createdAt: string;
  deletedAt: string | null;
  goalId: string;
  id: string;
  transactionId: string | null;
  updatedAt: string;
}

export class GoalRepository {
  constructor(private readonly database: Queryable) {}

  private readonly listQuery = `
      SELECT g.id,
             g.workspace_id AS "workspaceId",
             g.name,
             g.type,
             g.target_amount::text AS "targetAmount",
             g.currency,
             g.target_date AS "targetDate",
             g.image_key AS "imageKey",
             g.status,
             g.created_at AS "createdAt",
             g.updated_at AS "updatedAt",
             g.deleted_at AS "deletedAt",
             COALESCE(SUM(gc.amount), 0)::text AS "fundedAmount",
             (g.target_amount - COALESCE(SUM(gc.amount), 0))::text AS "remainingAmount",
             CASE
               WHEN g.target_amount = 0 THEN '0'
               ELSE ROUND((COALESCE(SUM(gc.amount), 0) / g.target_amount) * 100, 2)::text
             END AS "progressPercent"
        FROM goals g
        LEFT JOIN goal_contributions gc
          ON gc.goal_id = g.id
         AND gc.deleted_at IS NULL
       WHERE g.workspace_id = $1
         AND g.deleted_at IS NULL
    `;

  async listByWorkspace(workspaceId: string, queryable: Queryable = this.database) {
    const result = await queryable.query<GoalRecord>(
      `${this.listQuery}
       GROUP BY g.id
       ORDER BY g.status, g.created_at DESC`,
      [workspaceId],
    );

    return result.rows;
  }

  async findById(workspaceId: string, goalId: string, queryable: Queryable = this.database) {
    const result = await queryable.query<GoalRecord>(
      `${this.listQuery}
         AND g.id = $2
       GROUP BY g.id
       LIMIT 1`,
      [workspaceId, goalId],
    );

    return result.rows[0] ?? null;
  }

  async create(
    input: {
      currency: string;
      id: string;
      imageKey: string | null;
      name: string;
      status: GoalRecord["status"];
      targetAmount: string;
      targetDate: string | null;
      type: GoalRecord["type"];
      workspaceId: string;
    },
    queryable: Queryable = this.database,
  ) {
    const result = await queryable.query<GoalRecord>(
      `INSERT INTO goals (
         id,
         workspace_id,
         name,
         type,
         target_amount,
         currency,
         target_date,
         image_key,
         status
       ) VALUES ($1, $2, $3, $4, $5::numeric(19,4), $6, $7, $8, $9)
       RETURNING id,
                 workspace_id AS "workspaceId",
                 name,
                 type,
                 target_amount::text AS "targetAmount",
                 currency,
                 target_date AS "targetDate",
                 image_key AS "imageKey",
                 status,
                 created_at AS "createdAt",
                 updated_at AS "updatedAt",
                 deleted_at AS "deletedAt",
                 '0'::text AS "fundedAmount",
                 target_amount::text AS "remainingAmount",
                 '0'::text AS "progressPercent"`,
      [
        input.id,
        input.workspaceId,
        input.name,
        input.type,
        input.targetAmount,
        input.currency,
        input.targetDate,
        input.imageKey,
        input.status,
      ],
    );

    return result.rows[0] ?? null;
  }

  async update(
    workspaceId: string,
    goalId: string,
    updates: Partial<{
      currency: string;
      imageKey: string | null;
      name: string;
      status: GoalRecord["status"];
      targetAmount: string;
      targetDate: string | null;
      type: GoalRecord["type"];
    }>,
    queryable: Queryable = this.database,
  ) {
    const assignments: string[] = [];
    const values: unknown[] = [workspaceId, goalId];

    if (updates.name !== undefined) {
      values.push(updates.name);
      assignments.push(`name = $${values.length}`);
    }

    if (updates.type !== undefined) {
      values.push(updates.type);
      assignments.push(`type = $${values.length}`);
    }

    if (updates.targetAmount !== undefined) {
      values.push(updates.targetAmount);
      assignments.push(`target_amount = $${values.length}::numeric(19,4)`);
    }

    if (updates.currency !== undefined) {
      values.push(updates.currency);
      assignments.push(`currency = $${values.length}`);
    }

    if (updates.targetDate !== undefined) {
      values.push(updates.targetDate);
      assignments.push(`target_date = $${values.length}`);
    }

    if (updates.imageKey !== undefined) {
      values.push(updates.imageKey);
      assignments.push(`image_key = $${values.length}`);
    }

    if (updates.status !== undefined) {
      values.push(updates.status);
      assignments.push(`status = $${values.length}`);
    }

    if (assignments.length === 0) {
      return this.findById(workspaceId, goalId, queryable);
    }

    await queryable.query(
      `UPDATE goals
          SET ${assignments.join(", ")},
              updated_at = CURRENT_TIMESTAMP
        WHERE workspace_id = $1
          AND id = $2
          AND deleted_at IS NULL`,
      values,
    );

    return this.findById(workspaceId, goalId, queryable);
  }

  async archive(workspaceId: string, goalId: string, queryable: Queryable = this.database) {
    await queryable.query(
      `UPDATE goals
          SET deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP),
              updated_at = CURRENT_TIMESTAMP
        WHERE workspace_id = $1
          AND id = $2
          AND deleted_at IS NULL`,
      [workspaceId, goalId],
    );

    return this.findById(workspaceId, goalId, queryable);
  }

  async createContribution(
    input: {
      amount: string;
      contributionDate: string;
      currency: string;
      goalId: string;
      id: string;
      transactionId: string | null;
    },
    queryable: Queryable = this.database,
  ) {
    const result = await queryable.query<GoalContributionRecord>(
      `INSERT INTO goal_contributions (
         id,
         goal_id,
         amount,
         currency,
         contribution_date,
         transaction_id
       ) VALUES ($1, $2, $3::numeric(19,4), $4, $5, $6)
       RETURNING id,
                 goal_id AS "goalId",
                 amount::text AS amount,
                 currency,
                 contribution_date AS "contributionDate",
                 transaction_id AS "transactionId",
                 created_at AS "createdAt",
                 updated_at AS "updatedAt",
                 deleted_at AS "deletedAt"`,
      [
        input.id,
        input.goalId,
        input.amount,
        input.currency,
        input.contributionDate,
        input.transactionId,
      ],
    );

    return result.rows[0] ?? null;
  }

  async deleteContribution(
    goalId: string,
    contributionId: string,
    queryable: Queryable = this.database,
  ) {
    await queryable.query(
      `UPDATE goal_contributions
          SET deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP),
              updated_at = CURRENT_TIMESTAMP
        WHERE goal_id = $1
          AND id = $2
          AND deleted_at IS NULL`,
      [goalId, contributionId],
    );
  }
}
