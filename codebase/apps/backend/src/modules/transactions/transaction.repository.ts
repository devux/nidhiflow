import type { Queryable } from "../../shared/database/database.js";

export interface TransactionRecord {
  accountId: string;
  amount: string;
  categoryId: string | null;
  createdAt: string;
  createdByUserId: string | null;
  currency: string;
  deletedAt: string | null;
  destinationAccountId: string | null;
  id: string;
  note: string | null;
  source: "MANUAL" | "ANDROID_NOTIFICATION";
  sourceDetectedAt: string | null;
  sourcePackage: string | null;
  sourceParserVersion: number | null;
  transactionDate: string;
  type: "income" | "expense" | "transfer";
  updatedAt: string;
  updatedByUserId: string | null;
  workspaceId: string;
}

export class TransactionRepository {
  constructor(private readonly database: Queryable) {}

  async listByWorkspace(
    workspaceId: string,
    filters: Partial<{
      accountId: string;
      categoryId: string;
      from: string;
      to: string;
      type: TransactionRecord["type"];
    }> = {},
    queryable: Queryable = this.database,
  ) {
    const whereClauses = ["workspace_id = $1", "deleted_at IS NULL"];
    const values: unknown[] = [workspaceId];

    if (filters.accountId) {
      values.push(filters.accountId);
      whereClauses.push(`account_id = $${values.length}`);
    }

    if (filters.categoryId) {
      values.push(filters.categoryId);
      whereClauses.push(`category_id = $${values.length}`);
    }

    if (filters.type) {
      values.push(filters.type);
      whereClauses.push(`type = $${values.length}`);
    }

    if (filters.from) {
      values.push(filters.from);
      whereClauses.push(`transaction_date >= $${values.length}`);
    }

    if (filters.to) {
      values.push(filters.to);
      whereClauses.push(`transaction_date <= $${values.length}`);
    }

    const result = await queryable.query<TransactionRecord>(
      `SELECT id,
              workspace_id AS "workspaceId",
              type,
              amount::text AS amount,
              currency,
              account_id AS "accountId",
              destination_account_id AS "destinationAccountId",
              category_id AS "categoryId",
              transaction_date AS "transactionDate",
              note,
              source,
              source_package AS "sourcePackage",
              source_parser_version AS "sourceParserVersion",
              source_detected_at AS "sourceDetectedAt",
              created_by_user_id AS "createdByUserId",
              updated_by_user_id AS "updatedByUserId",
              created_at AS "createdAt",
              updated_at AS "updatedAt",
              deleted_at AS "deletedAt"
         FROM transactions
        WHERE ${whereClauses.join(" AND ")}
        ORDER BY transaction_date DESC, created_at DESC`,
      values,
    );

    return result.rows;
  }

  async findById(workspaceId: string, transactionId: string, queryable: Queryable = this.database) {
    const result = await queryable.query<TransactionRecord>(
      `SELECT id,
              workspace_id AS "workspaceId",
              type,
              amount::text AS amount,
              currency,
              account_id AS "accountId",
              destination_account_id AS "destinationAccountId",
              category_id AS "categoryId",
              transaction_date AS "transactionDate",
              note,
              source,
              source_package AS "sourcePackage",
              source_parser_version AS "sourceParserVersion",
              source_detected_at AS "sourceDetectedAt",
              created_by_user_id AS "createdByUserId",
              updated_by_user_id AS "updatedByUserId",
              created_at AS "createdAt",
              updated_at AS "updatedAt",
              deleted_at AS "deletedAt"
         FROM transactions
        WHERE workspace_id = $1
          AND id = $2
          AND deleted_at IS NULL
        LIMIT 1`,
      [workspaceId, transactionId],
    );

    return result.rows[0] ?? null;
  }

  async create(
    input: {
      accountId: string;
      amount: string;
      categoryId: string | null;
      createdByUserId: string;
      currency: string;
      destinationAccountId: string | null;
      id: string;
      note: string | null;
      source?: TransactionRecord["source"];
      sourceDetectedAt?: string | null;
      sourceFingerprint?: string | null;
      sourcePackage?: string | null;
      sourceParserVersion?: number | null;
      transactionDate: string;
      type: TransactionRecord["type"];
      updatedByUserId: string;
      workspaceId: string;
    },
    queryable: Queryable = this.database,
  ) {
    const result = await queryable.query<TransactionRecord>(
      `INSERT INTO transactions (
         id,
         workspace_id,
         type,
         amount,
         currency,
         account_id,
         destination_account_id,
         category_id,
         transaction_date,
         note,
         source,
         source_package,
         source_parser_version,
         source_fingerprint,
         source_detected_at,
         created_by_user_id,
         updated_by_user_id
       ) VALUES ($1, $2, $3, $4::numeric(19,4), $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       ON CONFLICT (created_by_user_id, source_fingerprint)
         WHERE source = 'ANDROID_NOTIFICATION'
       DO NOTHING
       RETURNING id,
                 workspace_id AS "workspaceId",
                 type,
                 amount::text AS amount,
                 currency,
                 account_id AS "accountId",
                 destination_account_id AS "destinationAccountId",
                 category_id AS "categoryId",
                 transaction_date AS "transactionDate",
                 note,
                 source,
                 source_package AS "sourcePackage",
                 source_parser_version AS "sourceParserVersion",
                 source_detected_at AS "sourceDetectedAt",
                 created_by_user_id AS "createdByUserId",
                 updated_by_user_id AS "updatedByUserId",
                 created_at AS "createdAt",
                 updated_at AS "updatedAt",
                 deleted_at AS "deletedAt"`,
      [
        input.id,
        input.workspaceId,
        input.type,
        input.amount,
        input.currency,
        input.accountId,
        input.destinationAccountId,
        input.categoryId,
        input.transactionDate,
        input.note,
        input.source ?? "MANUAL",
        input.sourcePackage ?? null,
        input.sourceParserVersion ?? null,
        input.sourceFingerprint ?? null,
        input.sourceDetectedAt ?? null,
        input.createdByUserId,
        input.updatedByUserId,
      ],
    );

    return result.rows[0] ?? null;
  }

  async update(
    workspaceId: string,
    transactionId: string,
    input: {
      accountId: string;
      amount: string;
      categoryId: string | null;
      currency: string;
      destinationAccountId: string | null;
      note: string | null;
      transactionDate: string;
      type: TransactionRecord["type"];
      updatedByUserId: string;
    },
    queryable: Queryable = this.database,
  ) {
    const result = await queryable.query<TransactionRecord>(
      `UPDATE transactions
          SET type = $3,
              amount = $4::numeric(19,4),
              currency = $5,
              account_id = $6,
              destination_account_id = $7,
              category_id = $8,
              transaction_date = $9,
              note = $10,
              updated_by_user_id = $11,
              updated_at = CURRENT_TIMESTAMP
        WHERE workspace_id = $1
          AND id = $2
          AND deleted_at IS NULL
       RETURNING id,
                 workspace_id AS "workspaceId",
                 type,
                 amount::text AS amount,
                 currency,
                 account_id AS "accountId",
                 destination_account_id AS "destinationAccountId",
                 category_id AS "categoryId",
                 transaction_date AS "transactionDate",
                 note,
                 source,
                 source_package AS "sourcePackage",
                 source_parser_version AS "sourceParserVersion",
                 source_detected_at AS "sourceDetectedAt",
                 created_by_user_id AS "createdByUserId",
                 updated_by_user_id AS "updatedByUserId",
                 created_at AS "createdAt",
                 updated_at AS "updatedAt",
                 deleted_at AS "deletedAt"`,
      [
        workspaceId,
        transactionId,
        input.type,
        input.amount,
        input.currency,
        input.accountId,
        input.destinationAccountId,
        input.categoryId,
        input.transactionDate,
        input.note,
        input.updatedByUserId,
      ],
    );

    return result.rows[0] ?? null;
  }

  async softDelete(
    workspaceId: string,
    transactionId: string,
    updatedByUserId: string,
    queryable: Queryable = this.database,
  ) {
    const result = await queryable.query<TransactionRecord>(
      `UPDATE transactions
          SET deleted_at = CURRENT_TIMESTAMP,
              updated_by_user_id = $3,
              updated_at = CURRENT_TIMESTAMP
        WHERE workspace_id = $1
          AND id = $2
          AND deleted_at IS NULL
       RETURNING id,
                 workspace_id AS "workspaceId",
                 type,
                 amount::text AS amount,
                 currency,
                 account_id AS "accountId",
                 destination_account_id AS "destinationAccountId",
                 category_id AS "categoryId",
                 transaction_date AS "transactionDate",
                 note,
                 source,
                 source_package AS "sourcePackage",
                 source_parser_version AS "sourceParserVersion",
                 source_detected_at AS "sourceDetectedAt",
                 created_by_user_id AS "createdByUserId",
                 updated_by_user_id AS "updatedByUserId",
                 created_at AS "createdAt",
                 updated_at AS "updatedAt",
                 deleted_at AS "deletedAt"`,
      [workspaceId, transactionId, updatedByUserId],
    );

    return result.rows[0] ?? null;
  }

  async findByNotificationFingerprint(
    userId: string,
    workspaceId: string,
    sourceFingerprint: string,
    queryable: Queryable = this.database,
  ) {
    const result = await queryable.query<TransactionRecord>(
      `SELECT id,
              workspace_id AS "workspaceId",
              type,
              amount::text AS amount,
              currency,
              account_id AS "accountId",
              destination_account_id AS "destinationAccountId",
              category_id AS "categoryId",
              transaction_date AS "transactionDate",
              note,
              source,
              source_package AS "sourcePackage",
              source_parser_version AS "sourceParserVersion",
              source_detected_at AS "sourceDetectedAt",
              created_by_user_id AS "createdByUserId",
              updated_by_user_id AS "updatedByUserId",
              created_at AS "createdAt",
              updated_at AS "updatedAt",
              deleted_at AS "deletedAt"
         FROM transactions
        WHERE created_by_user_id = $1
          AND workspace_id = $2
          AND source_fingerprint = $3
          AND source = 'ANDROID_NOTIFICATION'
        LIMIT 1`,
      [userId, workspaceId, sourceFingerprint],
    );

    return result.rows[0] ?? null;
  }
}
