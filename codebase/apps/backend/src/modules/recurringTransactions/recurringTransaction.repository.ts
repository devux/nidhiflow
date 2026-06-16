import type { Queryable } from "../../shared/database/database.js";

export interface RecurringTransactionRecord {
  accountId: string;
  amount: string;
  categoryId: string | null;
  createdAt: string;
  createdByUserId: string | null;
  currency: string;
  deletedAt: string | null;
  destinationAccountId: string | null;
  id: string;
  isActive: boolean;
  name: string;
  nextOccurrence: string | null;
  note: string | null;
  scheduleRule: string;
  timezone: string;
  type: "income" | "expense" | "transfer";
  updatedAt: string;
  updatedByUserId: string | null;
  workspaceId: string;
}

export class RecurringTransactionRepository {
  constructor(private readonly database: Queryable) {}

  async listByWorkspace(workspaceId: string, queryable: Queryable = this.database) {
    const result = await queryable.query<RecurringTransactionRecord>(
      `SELECT id,
              workspace_id AS "workspaceId",
              name,
              type,
              amount::text AS amount,
              currency,
              account_id AS "accountId",
              destination_account_id AS "destinationAccountId",
              category_id AS "categoryId",
              schedule_rule AS "scheduleRule",
              timezone,
              next_occurrence AS "nextOccurrence",
              is_active AS "isActive",
              note,
              created_by_user_id AS "createdByUserId",
              updated_by_user_id AS "updatedByUserId",
              created_at AS "createdAt",
              updated_at AS "updatedAt",
              deleted_at AS "deletedAt"
         FROM recurring_transactions
        WHERE workspace_id = $1
          AND deleted_at IS NULL
        ORDER BY next_occurrence ASC NULLS LAST, created_at DESC`,
      [workspaceId],
    );

    return result.rows;
  }

  async findById(
    workspaceId: string,
    recurringTransactionId: string,
    queryable: Queryable = this.database,
  ) {
    const result = await queryable.query<RecurringTransactionRecord>(
      `SELECT id,
              workspace_id AS "workspaceId",
              name,
              type,
              amount::text AS amount,
              currency,
              account_id AS "accountId",
              destination_account_id AS "destinationAccountId",
              category_id AS "categoryId",
              schedule_rule AS "scheduleRule",
              timezone,
              next_occurrence AS "nextOccurrence",
              is_active AS "isActive",
              note,
              created_by_user_id AS "createdByUserId",
              updated_by_user_id AS "updatedByUserId",
              created_at AS "createdAt",
              updated_at AS "updatedAt",
              deleted_at AS "deletedAt"
         FROM recurring_transactions
        WHERE workspace_id = $1
          AND id = $2
          AND deleted_at IS NULL
        LIMIT 1`,
      [workspaceId, recurringTransactionId],
    );

    return result.rows[0] ?? null;
  }

  async create(
    input: {
      accountId: string;
      amount: string;
      categoryId: string | null;
      currency: string;
      destinationAccountId: string | null;
      id: string;
      isActive: boolean;
      name: string;
      nextOccurrence: string | null;
      note: string | null;
      scheduleRule: string;
      timezone: string;
      type: RecurringTransactionRecord["type"];
      updatedByUserId: string;
      workspaceId: string;
    },
    queryable: Queryable = this.database,
  ) {
    const result = await queryable.query<RecurringTransactionRecord>(
      `INSERT INTO recurring_transactions (
         id,
         workspace_id,
         name,
         type,
         amount,
         currency,
         account_id,
         destination_account_id,
         category_id,
         schedule_rule,
         timezone,
         next_occurrence,
         is_active,
         note,
         updated_by_user_id
       ) VALUES ($1, $2, $3, $4, $5::numeric(19,4), $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING id,
                 workspace_id AS "workspaceId",
                 name,
                 type,
                 amount::text AS amount,
                 currency,
                 account_id AS "accountId",
                 destination_account_id AS "destinationAccountId",
                 category_id AS "categoryId",
                 schedule_rule AS "scheduleRule",
                 timezone,
                 next_occurrence AS "nextOccurrence",
                 is_active AS "isActive",
                 note,
                 created_by_user_id AS "createdByUserId",
                 updated_by_user_id AS "updatedByUserId",
                 created_at AS "createdAt",
                 updated_at AS "updatedAt",
                 deleted_at AS "deletedAt"`,
      [
        input.id,
        input.workspaceId,
        input.name,
        input.type,
        input.amount,
        input.currency,
        input.accountId,
        input.destinationAccountId,
        input.categoryId,
        input.scheduleRule,
        input.timezone,
        input.nextOccurrence,
        input.isActive,
        input.note,
        input.updatedByUserId,
      ],
    );

    return result.rows[0] ?? null;
  }

  async update(
    workspaceId: string,
    recurringTransactionId: string,
    updates: Partial<{
      accountId: string;
      amount: string;
      categoryId: string | null;
      destinationAccountId: string | null;
      isActive: boolean;
      name: string;
      nextOccurrence: string | null;
      note: string | null;
      scheduleRule: string;
      timezone: string;
      type: RecurringTransactionRecord["type"];
      updatedByUserId: string;
    }>,
    queryable: Queryable = this.database,
  ) {
    const assignments: string[] = [];
    const values: unknown[] = [workspaceId, recurringTransactionId];

    if (updates.name !== undefined) {
      values.push(updates.name);
      assignments.push(`name = $${values.length}`);
    }

    if (updates.type !== undefined) {
      values.push(updates.type);
      assignments.push(`type = $${values.length}`);
    }

    if (updates.amount !== undefined) {
      values.push(updates.amount);
      assignments.push(`amount = $${values.length}::numeric(19,4)`);
    }

    if (updates.accountId !== undefined) {
      values.push(updates.accountId);
      assignments.push(`account_id = $${values.length}`);
    }

    if (updates.destinationAccountId !== undefined) {
      values.push(updates.destinationAccountId);
      assignments.push(`destination_account_id = $${values.length}`);
    }

    if (updates.categoryId !== undefined) {
      values.push(updates.categoryId);
      assignments.push(`category_id = $${values.length}`);
    }

    if (updates.scheduleRule !== undefined) {
      values.push(updates.scheduleRule);
      assignments.push(`schedule_rule = $${values.length}`);
    }

    if (updates.timezone !== undefined) {
      values.push(updates.timezone);
      assignments.push(`timezone = $${values.length}`);
    }

    if (updates.nextOccurrence !== undefined) {
      values.push(updates.nextOccurrence);
      assignments.push(`next_occurrence = $${values.length}`);
    }

    if (updates.isActive !== undefined) {
      values.push(updates.isActive);
      assignments.push(`is_active = $${values.length}`);
    }

    if (updates.note !== undefined) {
      values.push(updates.note);
      assignments.push(`note = $${values.length}`);
    }

    if (updates.updatedByUserId !== undefined) {
      values.push(updates.updatedByUserId);
      assignments.push(`updated_by_user_id = $${values.length}`);
    }

    if (assignments.length === 0) {
      return this.findById(workspaceId, recurringTransactionId, queryable);
    }

    await queryable.query(
      `UPDATE recurring_transactions
          SET ${assignments.join(", ")},
              updated_at = CURRENT_TIMESTAMP
        WHERE workspace_id = $1
          AND id = $2
          AND deleted_at IS NULL`,
      values,
    );

    return this.findById(workspaceId, recurringTransactionId, queryable);
  }

  async archive(
    workspaceId: string,
    recurringTransactionId: string,
    queryable: Queryable = this.database,
  ) {
    await queryable.query(
      `UPDATE recurring_transactions
          SET deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP),
              updated_at = CURRENT_TIMESTAMP
        WHERE workspace_id = $1
          AND id = $2
          AND deleted_at IS NULL`,
      [workspaceId, recurringTransactionId],
    );

    return this.findById(workspaceId, recurringTransactionId, queryable);
  }
}
