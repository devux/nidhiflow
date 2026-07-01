import type { Queryable } from "../../shared/database/database.js";

export type AppReportedStatus = "PENDING" | "SUCCESS" | "FAILURE" | "CANCELLED" | "UNKNOWN";

export interface PaymentRecord {
  amount: string;
  appReportedStatus: AppReportedStatus;
  approvalRefNo: string | null;
  callbackReceivedAt: string | null;
  createdAt: string;
  currency: "INR";
  id: string;
  launchedAt: string | null;
  note: string | null;
  payeeName: string | null;
  payeeUpiId: string;
  rawResponse: string | null;
  responseCode: string | null;
  selectedUpiApp: string;
  source: "QR_SCAN" | "MANUAL_ENTRY";
  transactionRef: string;
  updatedAt: string;
  upiUri: string;
  userId: string;
  verificationStatus: "UNVERIFIED" | "VERIFIED" | "REJECTED";
}

const selectColumns = `
  id, user_id AS "userId", payee_upi_id AS "payeeUpiId", payee_name AS "payeeName",
  amount::text AS amount, currency, note, transaction_ref AS "transactionRef",
  selected_upi_app AS "selectedUpiApp", source, upi_uri AS "upiUri",
  app_reported_status AS "appReportedStatus", verification_status AS "verificationStatus",
  raw_response AS "rawResponse", approval_ref_no AS "approvalRefNo",
  response_code AS "responseCode", launched_at AS "launchedAt",
  callback_received_at AS "callbackReceivedAt", created_at AS "createdAt",
  updated_at AS "updatedAt"`;

export class PaymentRepository {
  constructor(private readonly database: Queryable) {}

  async create(
    input: Omit<
      PaymentRecord,
      | "appReportedStatus"
      | "approvalRefNo"
      | "callbackReceivedAt"
      | "createdAt"
      | "launchedAt"
      | "rawResponse"
      | "responseCode"
      | "updatedAt"
      | "verificationStatus"
    >,
    queryable: Queryable = this.database,
  ) {
    const result = await queryable.query<PaymentRecord>(
      `INSERT INTO payments (id, user_id, payee_upi_id, payee_name, amount, currency, note,
         transaction_ref, selected_upi_app, source, upi_uri, launched_at)
       VALUES ($1,$2,$3,$4,$5::numeric(19,2),$6,$7,$8,$9,$10,$11,CURRENT_TIMESTAMP)
       RETURNING ${selectColumns}`,
      [
        input.id,
        input.userId,
        input.payeeUpiId,
        input.payeeName,
        input.amount,
        input.currency,
        input.note,
        input.transactionRef,
        input.selectedUpiApp,
        input.source,
        input.upiUri,
      ],
    );
    return result.rows[0] ?? null;
  }

  async findForUser(userId: string, paymentId: string, queryable: Queryable = this.database) {
    const result = await queryable.query<PaymentRecord>(
      `SELECT ${selectColumns} FROM payments WHERE user_id = $1 AND id = $2 LIMIT 1`,
      [userId, paymentId],
    );
    return result.rows[0] ?? null;
  }

  async listForUser(userId: string, queryable: Queryable = this.database) {
    const result = await queryable.query<PaymentRecord>(
      `SELECT ${selectColumns} FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [userId],
    );
    return result.rows;
  }

  async updateStatus(
    input: {
      appReportedStatus: Exclude<AppReportedStatus, "PENDING">;
      approvalRefNo?: string | undefined;
      paymentId: string;
      rawResponse?: string | undefined;
      responseCode?: string | undefined;
      userId: string;
    },
    queryable: Queryable = this.database,
  ) {
    const result = await queryable.query<PaymentRecord>(
      `UPDATE payments
          SET app_reported_status = $3, raw_response = $4, approval_ref_no = $5,
              response_code = $6, callback_received_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND id = $2
       RETURNING ${selectColumns}`,
      [
        input.userId,
        input.paymentId,
        input.appReportedStatus,
        input.rawResponse ?? null,
        input.approvalRefNo ?? null,
        input.responseCode ?? null,
      ],
    );
    return result.rows[0] ?? null;
  }
}
