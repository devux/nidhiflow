import type { Queryable } from "../../shared/database/database.js";

export interface BillRecord {
  accountId: string | null;
  amount: string;
  categoryId: string | null;
  createdAt: string;
  currency: string;
  deletedAt: string | null;
  dueDate: string;
  id: string;
  name: string;
  paidTransactionId: string | null;
  recurrenceRule: string | null;
  status: "pending" | "paid" | "overdue";
  updatedAt: string;
  workspaceId: string;
}

export class BillRepository {
  constructor(private readonly database: Queryable) {}

  async listByWorkspace(workspaceId: string, queryable: Queryable = this.database) {
    const result = await queryable.query<BillRecord>(
      `SELECT id,
              workspace_id AS "workspaceId",
              name,
              amount::text AS amount,
              currency,
              due_date AS "dueDate",
              recurrence_rule AS "recurrenceRule",
              status,
              category_id AS "categoryId",
              account_id AS "accountId",
              paid_transaction_id AS "paidTransactionId",
              created_at AS "createdAt",
              updated_at AS "updatedAt",
              deleted_at AS "deletedAt"
         FROM bills
        WHERE workspace_id = $1
          AND deleted_at IS NULL
        ORDER BY due_date ASC, created_at DESC`,
      [workspaceId],
    );

    return result.rows;
  }

  async findById(workspaceId: string, billId: string, queryable: Queryable = this.database) {
    const result = await queryable.query<BillRecord>(
      `SELECT id,
              workspace_id AS "workspaceId",
              name,
              amount::text AS amount,
              currency,
              due_date AS "dueDate",
              recurrence_rule AS "recurrenceRule",
              status,
              category_id AS "categoryId",
              account_id AS "accountId",
              paid_transaction_id AS "paidTransactionId",
              created_at AS "createdAt",
              updated_at AS "updatedAt",
              deleted_at AS "deletedAt"
         FROM bills
        WHERE workspace_id = $1
          AND id = $2
          AND deleted_at IS NULL
        LIMIT 1`,
      [workspaceId, billId],
    );

    return result.rows[0] ?? null;
  }

  async create(
    input: {
      accountId: string;
      amount: string;
      categoryId: string | null;
      currency: string;
      dueDate: string;
      id: string;
      name: string;
      recurrenceRule: string | null;
      status: BillRecord["status"];
      workspaceId: string;
    },
    queryable: Queryable = this.database,
  ) {
    const result = await queryable.query<BillRecord>(
      `INSERT INTO bills (
         id,
         workspace_id,
         name,
         amount,
         currency,
         due_date,
         recurrence_rule,
         status,
         category_id,
         account_id
       ) VALUES ($1, $2, $3, $4::numeric(19,4), $5, $6, $7, $8, $9, $10)
       RETURNING id,
                 workspace_id AS "workspaceId",
                 name,
                 amount::text AS amount,
                 currency,
                 due_date AS "dueDate",
                 recurrence_rule AS "recurrenceRule",
                 status,
                 category_id AS "categoryId",
                 account_id AS "accountId",
                 paid_transaction_id AS "paidTransactionId",
                 created_at AS "createdAt",
                 updated_at AS "updatedAt",
                 deleted_at AS "deletedAt"`,
      [
        input.id,
        input.workspaceId,
        input.name,
        input.amount,
        input.currency,
        input.dueDate,
        input.recurrenceRule,
        input.status,
        input.categoryId,
        input.accountId,
      ],
    );

    return result.rows[0] ?? null;
  }

  async update(
    workspaceId: string,
    billId: string,
    updates: Partial<{
      accountId: string | null;
      amount: string;
      categoryId: string | null;
      dueDate: string;
      name: string;
      recurrenceRule: string | null;
      status: BillRecord["status"];
    }>,
    queryable: Queryable = this.database,
  ) {
    const assignments: string[] = [];
    const values: unknown[] = [workspaceId, billId];

    if (updates.name !== undefined) {
      values.push(updates.name);
      assignments.push(`name = $${values.length}`);
    }

    if (updates.amount !== undefined) {
      values.push(updates.amount);
      assignments.push(`amount = $${values.length}::numeric(19,4)`);
    }

    if (updates.dueDate !== undefined) {
      values.push(updates.dueDate);
      assignments.push(`due_date = $${values.length}`);
    }

    if (updates.recurrenceRule !== undefined) {
      values.push(updates.recurrenceRule);
      assignments.push(`recurrence_rule = $${values.length}`);
    }

    if (updates.status !== undefined) {
      values.push(updates.status);
      assignments.push(`status = $${values.length}`);
    }

    if (updates.categoryId !== undefined) {
      values.push(updates.categoryId);
      assignments.push(`category_id = $${values.length}`);
    }

    if (updates.accountId !== undefined) {
      values.push(updates.accountId);
      assignments.push(`account_id = $${values.length}`);
    }

    if (assignments.length === 0) {
      return this.findById(workspaceId, billId, queryable);
    }

    await queryable.query(
      `UPDATE bills
          SET ${assignments.join(", ")},
              updated_at = CURRENT_TIMESTAMP
        WHERE workspace_id = $1
          AND id = $2
          AND deleted_at IS NULL`,
      values,
    );

    return this.findById(workspaceId, billId, queryable);
  }

  async archive(workspaceId: string, billId: string, queryable: Queryable = this.database) {
    await queryable.query(
      `UPDATE bills
          SET deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP),
              updated_at = CURRENT_TIMESTAMP
        WHERE workspace_id = $1
          AND id = $2
          AND deleted_at IS NULL`,
      [workspaceId, billId],
    );

    return this.findById(workspaceId, billId, queryable);
  }

  async markPaid(
    workspaceId: string,
    billId: string,
    paidTransactionId: string,
    queryable: Queryable = this.database,
  ) {
    await queryable.query(
      `UPDATE bills
          SET status = 'paid',
              paid_transaction_id = $3,
              updated_at = CURRENT_TIMESTAMP
        WHERE workspace_id = $1
          AND id = $2
          AND deleted_at IS NULL`,
      [workspaceId, billId, paidTransactionId],
    );

    return this.findById(workspaceId, billId, queryable);
  }
}
