import crypto from "node:crypto";

import { AppError } from "../../shared/errors/appError.js";
import { createId } from "../../shared/security/ids.js";
import type { Database } from "../../shared/database/database.js";
import { AuthRepository } from "../auth/auth.repository.js";
import { PaymentRepository } from "./payment.repository.js";
import type { CreatePaymentBody, UpdatePaymentStatusBody } from "./payment.schemas.js";
import { prepareUpiPayment } from "./paymentUpiUri.js";

function notFound() {
  return new AppError({
    code: "NOT_FOUND",
    message: "The requested resource was not found.",
    status: 404,
  });
}

function createTransactionRef() {
  return `NDF${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
}

export class PaymentService {
  private readonly repository: PaymentRepository;
  private readonly auditRepository: AuthRepository;

  constructor(private readonly database: Database) {
    this.repository = new PaymentRepository(database);
    this.auditRepository = new AuthRepository(database);
  }

  async create(userId: string, input: CreatePaymentBody, requestId: string | null) {
    const transactionRef = createTransactionRef();
    const prepared = prepareUpiPayment(input, transactionRef);

    return this.database.transaction(async (transaction) => {
      const repository = new PaymentRepository(transaction);
      const payment = await repository.create(
        {
          amount: input.amount,
          currency: "INR",
          id: createId("pay"),
          note: prepared.note,
          payeeName: prepared.payeeName,
          payeeUpiId: prepared.payeeUpiId,
          selectedUpiApp: input.selectedUpiApp,
          source: input.source,
          transactionRef,
          upiUri: prepared.upiUri,
          userId,
        },
        transaction,
      );
      if (!payment)
        throw new AppError({
          code: "INTERNAL_ERROR",
          message: "Payment intent could not be created.",
          status: 500,
        });
      await this.auditRepository.insertAuditLog(
        {
          action: "payment.intent_created",
          actorUserId: userId,
          changeMetadata: {
            amount: input.amount,
            currency: "INR",
            selectedUpiApp: input.selectedUpiApp,
            source: input.source,
          },
          id: createId("aud"),
          requestId,
          resourceId: payment.id,
          resourceType: "payment",
          workspaceId: null,
        },
        transaction,
      );
      return payment;
    });
  }

  async get(userId: string, paymentId: string) {
    const payment = await this.repository.findForUser(userId, paymentId);
    if (!payment) throw notFound();
    return payment;
  }

  async list(userId: string, requestedUserId: string) {
    if (userId !== requestedUserId) throw notFound();
    return this.repository.listForUser(userId);
  }

  async updateStatus(userId: string, input: UpdatePaymentStatusBody, requestId: string | null) {
    const current = await this.repository.findForUser(userId, input.paymentId);
    if (!current) throw notFound();
    if (current.selectedUpiApp !== input.selectedUpiApp) {
      throw new AppError({
        code: "CONFLICT",
        message: "The selected UPI app does not match this payment intent.",
        status: 409,
      });
    }
    return this.database.transaction(async (transaction) => {
      const repository = new PaymentRepository(transaction);
      const payment = await repository.updateStatus({ ...input, userId }, transaction);
      if (!payment) throw notFound();
      await this.auditRepository.insertAuditLog(
        {
          action: "payment.app_status_reported",
          actorUserId: userId,
          changeMetadata: {
            appReportedStatus: input.appReportedStatus,
            hasRawResponse: Boolean(input.rawResponse),
            selectedUpiApp: input.selectedUpiApp,
          },
          id: createId("aud"),
          requestId,
          resourceId: input.paymentId,
          resourceType: "payment",
          workspaceId: null,
        },
        transaction,
      );
      return payment;
    });
  }
}
