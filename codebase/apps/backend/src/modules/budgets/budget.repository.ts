import type { Queryable } from "../../shared/database/database.js";

export interface BudgetRecord {
  categoryId: string | null;
  currency: string;
  deletedAt: string | null;
  id: string;
  limitAmount: string;
  periodEnd: string;
  periodStart: string;
  spentAmount: string;
  remainingAmount: string;
  progressPercent: string;
  updatedAt: string;
  workspaceId: string;
}

export class BudgetRepository {
  constructor(private readonly database: Queryable) {}

  private readonly listQuery = `
      SELECT b.id,
             b.workspace_id AS "workspaceId",
             b.category_id AS "categoryId",
             b.period_start AS "periodStart",
             b.period_end AS "periodEnd",
             b.limit_amount::text AS "limitAmount",
             b.currency,
             b.updated_at AS "updatedAt",
             b.deleted_at AS "deletedAt",
             COALESCE(SUM(t.amount), 0)::text AS "spentAmount",
             (b.limit_amount - COALESCE(SUM(t.amount), 0))::text AS "remainingAmount",
             CASE
               WHEN b.limit_amount = 0 THEN '0'
               ELSE ROUND((COALESCE(SUM(t.amount), 0) / b.limit_amount) * 100, 2)::text
             END AS "progressPercent"
        FROM budgets b
        LEFT JOIN transactions t
          ON t.workspace_id = b.workspace_id
         AND t.deleted_at IS NULL
         AND t.type = 'expense'
         AND t.currency = b.currency
         AND t.transaction_date BETWEEN b.period_start AND b.period_end
         AND (b.category_id IS NULL OR t.category_id = b.category_id)
       WHERE b.workspace_id = $1
         AND b.deleted_at IS NULL
    `;

  async listByWorkspace(workspaceId: string, queryable: Queryable = this.database) {
    const result = await queryable.query<BudgetRecord>(
      `${this.listQuery}
       GROUP BY b.id
       ORDER BY b.period_start DESC, b.created_at DESC`,
      [workspaceId],
    );

    return result.rows;
  }

  async findById(workspaceId: string, budgetId: string, queryable: Queryable = this.database) {
    const result = await queryable.query<BudgetRecord>(
      `${this.listQuery}
         AND b.id = $2
       GROUP BY b.id
       LIMIT 1`,
      [workspaceId, budgetId],
    );

    return result.rows[0] ?? null;
  }

  async create(
    input: {
      categoryId: string | null;
      currency: string;
      id: string;
      limitAmount: string;
      periodEnd: string;
      periodStart: string;
      workspaceId: string;
    },
    queryable: Queryable = this.database,
  ) {
    const result = await queryable.query<BudgetRecord>(
      `INSERT INTO budgets (
         id,
         workspace_id,
         category_id,
         period_start,
         period_end,
         limit_amount,
         currency
       ) VALUES ($1, $2, $3, $4, $5, $6::numeric(19,4), $7)
       RETURNING id,
                 workspace_id AS "workspaceId",
                 category_id AS "categoryId",
                 period_start AS "periodStart",
                 period_end AS "periodEnd",
                 limit_amount::text AS "limitAmount",
                 currency,
                 updated_at AS "updatedAt",
                 deleted_at AS "deletedAt",
                 '0'::text AS "spentAmount",
                 limit_amount::text AS "remainingAmount",
                 '0'::text AS "progressPercent"`,
      [
        input.id,
        input.workspaceId,
        input.categoryId,
        input.periodStart,
        input.periodEnd,
        input.limitAmount,
        input.currency,
      ],
    );

    return result.rows[0] ?? null;
  }

  async update(
    workspaceId: string,
    budgetId: string,
    updates: Partial<{
      categoryId: string | null;
      currency: string;
      limitAmount: string;
      periodEnd: string;
      periodStart: string;
    }>,
    queryable: Queryable = this.database,
  ) {
    const assignments: string[] = [];
    const values: unknown[] = [workspaceId, budgetId];

    if (updates.categoryId !== undefined) {
      values.push(updates.categoryId);
      assignments.push(`category_id = $${values.length}`);
    }

    if (updates.periodStart !== undefined) {
      values.push(updates.periodStart);
      assignments.push(`period_start = $${values.length}`);
    }

    if (updates.periodEnd !== undefined) {
      values.push(updates.periodEnd);
      assignments.push(`period_end = $${values.length}`);
    }

    if (updates.limitAmount !== undefined) {
      values.push(updates.limitAmount);
      assignments.push(`limit_amount = $${values.length}::numeric(19,4)`);
    }

    if (updates.currency !== undefined) {
      values.push(updates.currency);
      assignments.push(`currency = $${values.length}`);
    }

    if (assignments.length === 0) {
      return this.findById(workspaceId, budgetId, queryable);
    }

    await queryable.query(
      `UPDATE budgets
          SET ${assignments.join(", ")},
              updated_at = CURRENT_TIMESTAMP
        WHERE workspace_id = $1
          AND id = $2
          AND deleted_at IS NULL`,
      values,
    );

    return this.findById(workspaceId, budgetId, queryable);
  }

  async archive(workspaceId: string, budgetId: string, queryable: Queryable = this.database) {
    await queryable.query(
      `UPDATE budgets
          SET deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP),
              updated_at = CURRENT_TIMESTAMP
        WHERE workspace_id = $1
          AND id = $2
          AND deleted_at IS NULL`,
      [workspaceId, budgetId],
    );

    return this.findById(workspaceId, budgetId, queryable);
  }

  async summary(workspaceId: string, queryable: Queryable = this.database) {
    const budgets = await this.listByWorkspace(workspaceId, queryable);
    const toMinor = (value: string) => {
      const [wholePartRaw, fractionalPart = ""] = value.split(".");
      const wholePart = BigInt(wholePartRaw || "0");
      const normalizedFraction = `${fractionalPart}0000`.slice(0, 4);
      return wholePart * 10_000n + BigInt(normalizedFraction);
    };
    const limitTotal = budgets.reduce((total, budget) => total + toMinor(budget.limitAmount), 0n);
    const spentTotal = budgets.reduce((total, budget) => total + toMinor(budget.spentAmount), 0n);
    const remainingTotal = limitTotal - spentTotal;

    return {
      budgets,
      limitTotalMinor: limitTotal.toString(),
      remainingTotalMinor: remainingTotal.toString(),
      spentTotalMinor: spentTotal.toString(),
    };
  }
}
