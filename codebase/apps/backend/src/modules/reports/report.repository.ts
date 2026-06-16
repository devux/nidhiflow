import type { Queryable } from "../../shared/database/database.js";

export interface ReportSummaryTotals {
  expenseMinor: string;
  incomeMinor: string;
  netSavingsMinor: string;
  transactionCount: number;
  transferMinor: string;
}

export interface ReportCategoryBreakdownRow {
  amountMinor: string;
  categoryId: string | null;
  categoryName: string;
  colorToken: string | null;
  iconKey: string | null;
  transactionCount: number;
}

export interface ReportAccountBreakdownRow {
  accountId: string;
  accountName: string;
  accountType: string;
  amountMinor: string;
  transactionCount: number;
}

export interface ReportCashFlowRow {
  date: string;
  expenseMinor: string;
  incomeMinor: string;
  netMinor: string;
  transactionCount: number;
  transferMinor: string;
}

export interface GeneratedReportRecord {
  createdAt: string;
  expiresAt: string | null;
  id: string;
  parameters: Record<string, unknown>;
  requestedByUserId: string | null;
  reportType: "summary" | "categories" | "cashFlow";
  storageKey: string | null;
  status: "queued" | "processing" | "completed" | "failed" | "expired";
  updatedAt: string;
  workspaceId: string;
}

export class ReportRepository {
  constructor(private readonly database: Queryable) {}

  private async querySummaryRows(
    workspaceId: string,
    reportingCurrency: string,
    from: string,
    to: string,
    queryable: Queryable = this.database,
  ) {
    return queryable.query<ReportSummaryTotals>(
      `SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)::text AS "incomeMinor",
              COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)::text AS "expenseMinor",
              COALESCE(SUM(CASE WHEN type = 'transfer' THEN amount ELSE 0 END), 0)::text AS "transferMinor",
              (
                COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) -
                COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
              )::text AS "netSavingsMinor",
              COUNT(*)::integer AS "transactionCount"
         FROM transactions
        WHERE workspace_id = $1
          AND deleted_at IS NULL
          AND transaction_date BETWEEN $2 AND $3
          AND currency = $4`,
      [workspaceId, from, to, reportingCurrency],
    );
  }

  async getSummaryTotals(
    workspaceId: string,
    reportingCurrency: string,
    from: string,
    to: string,
    queryable: Queryable = this.database,
  ) {
    const result = await this.querySummaryRows(workspaceId, reportingCurrency, from, to, queryable);
    return (
      result.rows[0] ?? {
        expenseMinor: "0",
        incomeMinor: "0",
        netSavingsMinor: "0",
        transactionCount: 0,
        transferMinor: "0",
      }
    );
  }

  async getCategoryBreakdown(
    workspaceId: string,
    reportingCurrency: string,
    from: string,
    to: string,
    queryable: Queryable = this.database,
  ) {
    const result = await queryable.query<ReportCategoryBreakdownRow>(
      `SELECT COALESCE(t.category_id, 'uncategorized') AS "categoryId",
              COALESCE(c.name, 'Uncategorized') AS "categoryName",
              c.color_token AS "colorToken",
              c.icon_key AS "iconKey",
              SUM(t.amount)::text AS "amountMinor",
              COUNT(*)::integer AS "transactionCount"
         FROM transactions t
         LEFT JOIN categories c
           ON c.id = t.category_id
        WHERE t.workspace_id = $1
          AND t.deleted_at IS NULL
          AND t.transaction_date BETWEEN $2 AND $3
          AND t.currency = $4
          AND t.type = 'expense'
        GROUP BY COALESCE(t.category_id, 'uncategorized'), c.name, c.color_token, c.icon_key
        ORDER BY SUM(t.amount) DESC, COALESCE(c.name, 'Uncategorized') ASC`,
      [workspaceId, from, to, reportingCurrency],
    );

    return result.rows;
  }

  async getAccountBreakdown(
    workspaceId: string,
    reportingCurrency: string,
    from: string,
    to: string,
    queryable: Queryable = this.database,
  ) {
    const result = await queryable.query<ReportAccountBreakdownRow>(
      `SELECT a.id AS "accountId",
              a.name AS "accountName",
              a.type AS "accountType",
              SUM(t.amount)::text AS "amountMinor",
              COUNT(*)::integer AS "transactionCount"
         FROM transactions t
         JOIN accounts a
           ON a.id = t.account_id
        WHERE t.workspace_id = $1
          AND t.deleted_at IS NULL
          AND t.transaction_date BETWEEN $2 AND $3
          AND t.currency = $4
          AND t.type = 'expense'
        GROUP BY a.id, a.name, a.type
        ORDER BY SUM(t.amount) DESC, a.name ASC`,
      [workspaceId, from, to, reportingCurrency],
    );

    return result.rows;
  }

  async getCashFlow(
    workspaceId: string,
    reportingCurrency: string,
    from: string,
    to: string,
    queryable: Queryable = this.database,
  ) {
    const result = await queryable.query<ReportCashFlowRow>(
      `SELECT t.transaction_date::text AS "date",
              COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0)::text AS "incomeMinor",
              COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0)::text AS "expenseMinor",
              COALESCE(SUM(CASE WHEN t.type = 'transfer' THEN t.amount ELSE 0 END), 0)::text AS "transferMinor",
              (
                COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) -
                COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0)
              )::text AS "netMinor",
              COUNT(*)::integer AS "transactionCount"
         FROM transactions t
        WHERE t.workspace_id = $1
          AND t.deleted_at IS NULL
          AND t.transaction_date BETWEEN $2 AND $3
          AND t.currency = $4
        GROUP BY t.transaction_date
        ORDER BY t.transaction_date ASC`,
      [workspaceId, from, to, reportingCurrency],
    );

    return result.rows;
  }

  async createGeneratedReport(
    input: {
      expiresAt: string;
      id: string;
      parameters: Record<string, unknown>;
      requestedByUserId: string;
      reportType: GeneratedReportRecord["reportType"];
      storageKey: string;
      workspaceId: string;
    },
    queryable: Queryable = this.database,
  ) {
    const result = await queryable.query<GeneratedReportRecord>(
      `INSERT INTO generated_reports (
         id,
         workspace_id,
         requested_by_user_id,
         type,
         parameters,
         status,
         storage_key,
         expires_at
       ) VALUES ($1, $2, $3, $4, $5::jsonb, 'completed', $6, $7)
       RETURNING id,
                 workspace_id AS "workspaceId",
                 requested_by_user_id AS "requestedByUserId",
                 type AS "reportType",
                 parameters,
                 status,
                 storage_key AS "storageKey",
                 expires_at AS "expiresAt",
                 created_at AS "createdAt",
                 updated_at AS "updatedAt"`,
      [
        input.id,
        input.workspaceId,
        input.requestedByUserId,
        input.reportType,
        JSON.stringify(input.parameters),
        input.storageKey,
        input.expiresAt,
      ],
    );

    return result.rows[0] ?? null;
  }

  async findGeneratedReport(
    workspaceId: string,
    exportId: string,
    queryable: Queryable = this.database,
  ) {
    const result = await queryable.query<GeneratedReportRecord>(
      `SELECT id,
              workspace_id AS "workspaceId",
              requested_by_user_id AS "requestedByUserId",
              type AS "reportType",
              parameters,
              status,
              storage_key AS "storageKey",
              expires_at AS "expiresAt",
              created_at AS "createdAt",
              updated_at AS "updatedAt"
         FROM generated_reports
        WHERE workspace_id = $1
          AND id = $2
        LIMIT 1`,
      [workspaceId, exportId],
    );

    return result.rows[0] ?? null;
  }
}
