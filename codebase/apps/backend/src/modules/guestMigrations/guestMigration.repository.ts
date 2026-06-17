import type { Queryable } from "../../shared/database/database.js";

export interface GuestMigrationRecord {
  clientMigrationId: string;
  id: string;
  idMapping: {
    transactions: Array<{
      clientId: string;
      serverId: string;
      status: "duplicate" | "imported";
    }>;
  };
  payloadFingerprint: string;
  previewSummary: GuestMigrationPreviewSummary;
  resultSummary: GuestMigrationCommitSummary;
  workspaceId: string;
}

export interface ExistingTransactionRecord {
  amount: string;
  categoryId: string | null;
  clientId: string | null;
  createdAt: string;
  currency: string;
  id: string;
  note: string | null;
  transactionDate: string;
  type: "income" | "expense";
}

export interface SystemCategoryRecord {
  id: string;
  name: string;
  transactionType: "income" | "expense";
}

export interface MigrationAccountRecord {
  id: string;
}

export interface GuestMigrationPreviewItem {
  amountMinor: string;
  category: string;
  clientId: string;
  currency: string;
  existingTransactionId?: string;
  note: string;
  status: "duplicate" | "importable" | "skipped_deleted";
  transactionDate: string;
  type: "income" | "expense";
}

export interface GuestMigrationPreviewSummary {
  balanceMinor: string;
  duplicateTransactions: number;
  expenseMinor: string;
  importableTransactions: number;
  incomeMinor: string;
  skippedDeletedTransactions: number;
  totalTransactions: number;
}

export interface GuestMigrationCommitSummary {
  balanceMinor: string;
  duplicateTransactions: number;
  importedTransactions: number;
  expenseMinor: string;
  incomeMinor: string;
  skippedDeletedTransactions: number;
  totalTransactions: number;
}

export class GuestMigrationRepository {
  constructor(private readonly database: Queryable) {}

  async findSystemCategoriesByNames(names: string[]) {
    if (names.length === 0) {
      return [];
    }

    const result = await this.database.query<SystemCategoryRecord>(
      `SELECT id, name, transaction_type AS "transactionType"
         FROM categories
        WHERE workspace_id IS NULL
          AND is_system = TRUE
          AND is_archived = FALSE
          AND name = ANY($1::text[])`,
      [names],
    );

    return result.rows;
  }

  async findExistingTransactionsByClientIds(workspaceId: string, clientIds: string[]) {
    if (clientIds.length === 0) {
      return [];
    }

    const result = await this.database.query<ExistingTransactionRecord>(
      `SELECT id,
              client_id AS "clientId",
              type,
              amount::text AS amount,
              currency,
              category_id AS "categoryId",
              transaction_date AS "transactionDate",
              note,
              created_at AS "createdAt"
         FROM transactions
        WHERE workspace_id = $1
          AND deleted_at IS NULL
          AND client_id = ANY($2::text[])`,
      [workspaceId, clientIds],
    );

    return result.rows;
  }

  async createTransaction(
    input: {
      accountId: string;
      amount: string;
      categoryId: string;
      clientId: string;
      createdByUserId: string;
      currency: string;
      id: string;
      note: string;
      occurredAt: string;
      transactionDate: string;
      type: "income" | "expense";
      updatedByUserId: string;
      workspaceId: string;
    },
    queryable: Queryable = this.database,
  ) {
    await queryable.query(
      `INSERT INTO transactions (
         id,
         workspace_id,
         type,
         amount,
         currency,
         account_id,
         category_id,
         transaction_date,
         occurred_at,
         note,
         created_by_user_id,
         updated_by_user_id,
         client_id
       ) VALUES ($1, $2, $3, $4::numeric(19,4), $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        input.id,
        input.workspaceId,
        input.type,
        input.amount,
        input.currency,
        input.accountId,
        input.categoryId,
        input.transactionDate,
        input.occurredAt,
        input.note,
        input.createdByUserId,
        input.updatedByUserId,
        input.clientId,
      ],
    );
  }

  async findMigrationAccount(workspaceId: string, queryable: Queryable = this.database) {
    const result = await queryable.query<MigrationAccountRecord>(
      `SELECT id
         FROM accounts
        WHERE workspace_id = $1
          AND name = 'Migrated guest cash'
          AND type = 'cash'
          AND deleted_at IS NULL
        ORDER BY created_at ASC
        LIMIT 1`,
      [workspaceId],
    );

    return result.rows[0] ?? null;
  }

  async createMigrationAccount(
    input: {
      currency: string;
      id: string;
      workspaceId: string;
    },
    queryable: Queryable = this.database,
  ) {
    await queryable.query(
      `INSERT INTO accounts (
         id,
         workspace_id,
         name,
         type,
         opening_balance,
         currency
       ) VALUES ($1, $2, 'Migrated guest cash', 'cash', 0::numeric(19,4), $3)`,
      [input.id, input.workspaceId, input.currency],
    );
  }

  async createGuestMigration(
    input: {
      clientMigrationId: string;
      id: string;
      idMapping: GuestMigrationRecord["idMapping"];
      payloadFingerprint: string;
      previewSummary: GuestMigrationPreviewSummary;
      resultSummary: GuestMigrationCommitSummary;
      userId: string;
      workspaceId: string;
    },
    queryable: Queryable = this.database,
  ) {
    await queryable.query(
      `INSERT INTO guest_migrations (
         id,
         user_id,
         workspace_id,
         client_migration_id,
         payload_fingerprint,
         preview_summary,
         result_summary,
         id_mapping
       ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb)`,
      [
        input.id,
        input.userId,
        input.workspaceId,
        input.clientMigrationId,
        input.payloadFingerprint,
        JSON.stringify(input.previewSummary),
        JSON.stringify(input.resultSummary),
        JSON.stringify(input.idMapping),
      ],
    );
  }

  async findGuestMigration(userId: string, workspaceId: string, clientMigrationId: string) {
    const result = await this.database.query<{
      clientMigrationId: string;
      id: string;
      idMapping: GuestMigrationRecord["idMapping"];
      payloadFingerprint: string;
      previewSummary: GuestMigrationPreviewSummary;
      resultSummary: GuestMigrationCommitSummary;
      workspaceId: string;
    }>(
      `SELECT id,
              workspace_id AS "workspaceId",
              client_migration_id AS "clientMigrationId",
              payload_fingerprint AS "payloadFingerprint",
              preview_summary AS "previewSummary",
              result_summary AS "resultSummary",
              id_mapping AS "idMapping"
         FROM guest_migrations
        WHERE user_id = $1
          AND workspace_id = $2
          AND client_migration_id = $3
        LIMIT 1`,
      [userId, workspaceId, clientMigrationId],
    );

    return result.rows[0] ?? null;
  }

  async createIdempotencyKey(
    input: {
      actorUserId: string;
      expiresAt: string;
      id: string;
      key: string;
      requestFingerprint: string;
      responseReference: string | null;
      responseStatus: number | null;
      workspaceId: string;
    },
    queryable: Queryable = this.database,
  ) {
    await queryable.query(
      `INSERT INTO idempotency_keys (
         id,
         actor_user_id,
         workspace_id,
         key,
         request_fingerprint,
         response_status,
         response_reference,
         expires_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        input.id,
        input.actorUserId,
        input.workspaceId,
        input.key,
        input.requestFingerprint,
        input.responseStatus,
        input.responseReference,
        input.expiresAt,
      ],
    );
  }

  async findIdempotencyKey(actorUserId: string, workspaceId: string, key: string) {
    const result = await this.database.query<{
      requestFingerprint: string;
      responseReference: string | null;
      responseStatus: number | null;
    }>(
      `SELECT request_fingerprint AS "requestFingerprint",
              response_reference AS "responseReference",
              response_status AS "responseStatus"
         FROM idempotency_keys
        WHERE actor_user_id = $1
          AND workspace_id = $2
          AND key = $3
        LIMIT 1`,
      [actorUserId, workspaceId, key],
    );

    return result.rows[0] ?? null;
  }

  async updateIdempotencyKeyResult(
    actorUserId: string,
    workspaceId: string,
    key: string,
    result: { responseReference: string; responseStatus: number },
    queryable: Queryable = this.database,
  ) {
    await queryable.query(
      `UPDATE idempotency_keys
          SET response_reference = $4,
              response_status = $5,
              updated_at = CURRENT_TIMESTAMP
        WHERE actor_user_id = $1
          AND workspace_id = $2
          AND key = $3`,
      [actorUserId, workspaceId, key, result.responseReference, result.responseStatus],
    );
  }
}
