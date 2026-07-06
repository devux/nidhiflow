import type { Queryable } from "../../shared/database/database.js";

export interface AccountRecord {
  archivedAt: string | null;
  createdAt: string;
  currentBalance: string;
  currency: string;
  id: string;
  isArchived: boolean;
  name: string;
  openingBalance: string;
  type: "cash" | "bank" | "credit_card" | "loan" | "wallet" | "other" | "other_liability";
  updatedAt: string;
}

export interface AccountSummaryRecord extends AccountRecord {
  classification: "asset" | "liability";
}

export interface LoanPaymentRecord {
  accountId: string;
  amount: string;
  createdAt: string;
  createdByUserId: string;
  currency: string;
  deletedAt: string | null;
  id: string;
  paymentDate: string;
  updatedAt: string;
}

export class AccountRepository {
  constructor(private readonly database: Queryable) {}

  private decimalToMinorUnits(value: string) {
    const trimmed = value.trim();
    const negative = trimmed.startsWith("-");
    const [wholePartRaw, fractionalPart = ""] = (negative ? trimmed.slice(1) : trimmed).split(".");
    const wholePart = BigInt(wholePartRaw || "0");
    const normalizedFraction = `${fractionalPart}0000`.slice(0, 4);
    const magnitude = wholePart * 10_000n + BigInt(normalizedFraction);

    return negative ? -magnitude : magnitude;
  }

  private readonly balanceQuery = `
      WITH effects AS (
        SELECT account_id AS account_id,
               CASE
                 WHEN type = 'income' THEN amount
                 WHEN type = 'expense' THEN -amount
                 WHEN type = 'transfer' THEN -amount
               END AS effect
          FROM transactions
         WHERE workspace_id = $1
           AND deleted_at IS NULL
           AND account_id IS NOT NULL
        UNION ALL
        SELECT destination_account_id AS account_id,
               amount AS effect
          FROM transactions
         WHERE workspace_id = $1
           AND deleted_at IS NULL
           AND type = 'transfer'
           AND destination_account_id IS NOT NULL
        UNION ALL
        SELECT account_id,
               -amount AS effect
          FROM loan_payments
         WHERE deleted_at IS NULL
      )
      SELECT a.id,
             a.name,
             a.type,
             a.opening_balance::text AS "openingBalance",
             a.currency,
             a.is_archived AS "isArchived",
             a.archived_at AS "archivedAt",
             a.created_at AS "createdAt",
             a.updated_at AS "updatedAt",
             (a.opening_balance + COALESCE(SUM(e.effect), 0))::text AS "currentBalance"
        FROM accounts a
        LEFT JOIN effects e
          ON e.account_id = a.id
       WHERE a.workspace_id = $1
         AND a.deleted_at IS NULL
    `;

  async listByWorkspace(workspaceId: string, queryable: Queryable = this.database) {
    const result = await queryable.query<AccountRecord>(
      `${this.balanceQuery}
       GROUP BY a.id
       ORDER BY a.created_at ASC`,
      [workspaceId],
    );

    return result.rows;
  }

  async findById(workspaceId: string, accountId: string, queryable: Queryable = this.database) {
    const result = await queryable.query<AccountRecord>(
      `${this.balanceQuery}
         AND a.id = $2
       GROUP BY a.id
       LIMIT 1`,
      [workspaceId, accountId],
    );

    return result.rows[0] ?? null;
  }

  async findActiveByName(workspaceId: string, name: string, queryable: Queryable = this.database) {
    const result = await queryable.query<AccountRecord>(
      `${this.balanceQuery}
         AND a.name = $2
       GROUP BY a.id
        LIMIT 1`,
      [workspaceId, name],
    );

    return result.rows[0] ?? null;
  }

  async create(
    input: {
      currency: string;
      id: string;
      name: string;
      openingBalance: string;
      type: AccountRecord["type"];
      workspaceId: string;
    },
    queryable: Queryable = this.database,
  ) {
    const result = await queryable.query<AccountRecord>(
      `INSERT INTO accounts (
         id,
         workspace_id,
         name,
         type,
         opening_balance,
         currency
       ) VALUES ($1, $2, $3, $4, $5::numeric(19,4), $6)
       RETURNING id,
                 name,
                 type,
                 opening_balance::text AS "openingBalance",
                 currency,
                 is_archived AS "isArchived",
                 archived_at AS "archivedAt",
                 created_at AS "createdAt",
                 updated_at AS "updatedAt",
                 opening_balance::text AS "currentBalance"`,
      [input.id, input.workspaceId, input.name, input.type, input.openingBalance, input.currency],
    );

    return result.rows[0] ?? null;
  }

  async update(
    workspaceId: string,
    accountId: string,
    updates: Partial<{
      currency: string;
      name: string;
      openingBalance: string;
      type: AccountRecord["type"];
    }>,
    queryable: Queryable = this.database,
  ) {
    const assignments: string[] = [];
    const values: unknown[] = [workspaceId, accountId];

    if (updates.name !== undefined) {
      values.push(updates.name);
      assignments.push(`name = $${values.length}`);
    }

    if (updates.type !== undefined) {
      values.push(updates.type);
      assignments.push(`type = $${values.length}`);
    }

    if (updates.openingBalance !== undefined) {
      values.push(updates.openingBalance);
      assignments.push(`opening_balance = $${values.length}::numeric(19,4)`);
    }

    if (updates.currency !== undefined) {
      values.push(updates.currency);
      assignments.push(`currency = $${values.length}`);
    }

    if (assignments.length === 0) {
      return this.findById(workspaceId, accountId, queryable);
    }

    await queryable.query(
      `UPDATE accounts
          SET ${assignments.join(", ")},
              updated_at = CURRENT_TIMESTAMP
        WHERE workspace_id = $1
          AND id = $2
          AND deleted_at IS NULL`,
      values,
    );

    return this.findById(workspaceId, accountId, queryable);
  }

  async archive(workspaceId: string, accountId: string, queryable: Queryable = this.database) {
    await queryable.query(
      `UPDATE accounts
          SET is_archived = TRUE,
              archived_at = COALESCE(archived_at, CURRENT_TIMESTAMP),
              updated_at = CURRENT_TIMESTAMP
        WHERE workspace_id = $1
          AND id = $2
          AND deleted_at IS NULL`,
      [workspaceId, accountId],
    );
    return this.findById(workspaceId, accountId, queryable);
  }

  async restore(workspaceId: string, accountId: string, queryable: Queryable = this.database) {
    await queryable.query(
      `UPDATE accounts
          SET is_archived = FALSE,
              archived_at = NULL,
              updated_at = CURRENT_TIMESTAMP
        WHERE workspace_id = $1
          AND id = $2
          AND deleted_at IS NULL`,
      [workspaceId, accountId],
    );
    return this.findById(workspaceId, accountId, queryable);
  }

  async listPayments(workspaceId: string, accountId: string, queryable: Queryable = this.database) {
    const result = await queryable.query<LoanPaymentRecord>(
      `SELECT lp.id,
              lp.account_id AS "accountId",
              lp.amount::text AS amount,
              lp.currency,
              lp.payment_date::text AS "paymentDate",
              lp.created_by_user_id AS "createdByUserId",
              lp.created_at AS "createdAt",
              lp.updated_at AS "updatedAt",
              lp.deleted_at AS "deletedAt"
         FROM loan_payments lp
         JOIN accounts a
           ON a.id = lp.account_id
        WHERE a.workspace_id = $1
          AND a.id = $2
          AND a.deleted_at IS NULL
          AND lp.deleted_at IS NULL
        ORDER BY lp.payment_date DESC, lp.created_at DESC`,
      [workspaceId, accountId],
    );

    return result.rows;
  }

  async createPayment(
    input: {
      accountId: string;
      amount: string;
      createdByUserId: string;
      currency: string;
      id: string;
      paymentDate: string;
    },
    queryable: Queryable = this.database,
  ) {
    const result = await queryable.query<LoanPaymentRecord>(
      `INSERT INTO loan_payments (
         id,
         account_id,
         amount,
         currency,
         payment_date,
         created_by_user_id
       ) VALUES ($1, $2, $3::numeric(19,4), $4, $5, $6)
       RETURNING id,
                 account_id AS "accountId",
                 amount::text AS amount,
                 currency,
                 payment_date::text AS "paymentDate",
                 created_by_user_id AS "createdByUserId",
                 created_at AS "createdAt",
                 updated_at AS "updatedAt",
                 deleted_at AS "deletedAt"`,
      [
        input.id,
        input.accountId,
        input.amount,
        input.currency,
        input.paymentDate,
        input.createdByUserId,
      ],
    );

    return result.rows[0] ?? null;
  }

  async summary(workspaceId: string, queryable: Queryable = this.database) {
    const accounts = await this.listByWorkspace(workspaceId, queryable);
    const assets = accounts.filter(
      (account) =>
        account.type !== "credit_card" &&
        account.type !== "loan" &&
        account.type !== "other_liability",
    );
    const liabilities = accounts.filter(
      (account) =>
        account.type === "credit_card" ||
        account.type === "loan" ||
        account.type === "other_liability",
    );

    const assetTotalMinor = assets.reduce(
      (total, account) => total + this.decimalToMinorUnits(account.currentBalance),
      0n,
    );
    const liabilityTotalMinor = liabilities.reduce((total, account) => {
      const balance = this.decimalToMinorUnits(account.currentBalance);
      return total + (balance < 0n ? -balance : balance);
    }, 0n);

    return {
      accounts,
      assetTotalMinor: assetTotalMinor.toString(),
      liabilityTotalMinor: liabilityTotalMinor.toString(),
      netWorthMinor: (assetTotalMinor - liabilityTotalMinor).toString(),
    };
  }
}
