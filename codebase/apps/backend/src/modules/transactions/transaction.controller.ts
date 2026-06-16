import type { Request, Response } from "express";

import { sendSuccess } from "../../app/http.js";
import type { AuthContext } from "../../app/middleware/authenticate.js";
import type { TransactionService } from "./transaction.service.js";
import type { CreateTransactionBody, TransactionListQuery } from "./transaction.schemas.js";

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
}
