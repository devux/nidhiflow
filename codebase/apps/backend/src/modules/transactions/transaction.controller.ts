import type { Request, Response } from "express";

import { sendSuccess } from "../../app/http.js";
import type { AuthContext } from "../../app/middleware/authenticate.js";
import type { TransactionService } from "./transaction.service.js";
import type {
  CreateNotificationTransactionBody,
  CreateTransactionBody,
  TransactionListQuery,
  UpdateTransactionBody,
} from "./transaction.schemas.js";

function getAuthContext(response: Response) {
  return response.locals.auth as AuthContext;
}

export class TransactionController {
  constructor(private readonly service: TransactionService) {}

  listTransactions = async (
    request: Request<{ workspaceId: string }, never, never, TransactionListQuery>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const transactions = await this.service.listTransactions(
      auth.userId,
      request.params.workspaceId,
      request.query,
    );

    sendSuccess(response, {
      data: transactions,
      message: "Transactions retrieved successfully.",
    });
  };

  createTransaction = async (
    request: Request<{ workspaceId: string }, never, CreateTransactionBody>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const transaction = await this.service.createTransaction(
      auth.userId,
      request.params.workspaceId,
      request.body,
      response.locals.requestId as string,
    );

    sendSuccess(response, {
      data: transaction,
      message: "Transaction created successfully.",
      status: 201,
    });
  };

  createNotificationTransaction = async (
    request: Request<{ workspaceId: string }, never, CreateNotificationTransactionBody>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const result = await this.service.createNotificationTransaction(
      auth.userId,
      request.params.workspaceId,
      request.body,
      response.locals.requestId as string,
    );

    sendSuccess(response, {
      data: result,
      message: result.duplicate
        ? "Notification transaction already exists."
        : "Notification transaction created successfully.",
      status: result.duplicate ? 200 : 201,
    });
  };

  updateTransaction = async (
    request: Request<{ transactionId: string; workspaceId: string }, never, UpdateTransactionBody>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const transaction = await this.service.updateTransaction(
      auth.userId,
      request.params.workspaceId,
      request.params.transactionId,
      request.body,
      response.locals.requestId as string,
    );

    sendSuccess(response, {
      data: transaction,
      message: "Transaction updated successfully.",
    });
  };

  deleteTransaction = async (
    request: Request<{ transactionId: string; workspaceId: string }>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const transaction = await this.service.deleteTransaction(
      auth.userId,
      request.params.workspaceId,
      request.params.transactionId,
      response.locals.requestId as string,
    );

    sendSuccess(response, {
      data: transaction,
      message: "Transaction deleted successfully.",
    });
  };
}
