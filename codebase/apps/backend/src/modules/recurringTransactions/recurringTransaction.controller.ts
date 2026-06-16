import type { Request, Response } from "express";

import { sendSuccess } from "../../app/http.js";
import type { AuthContext } from "../../app/middleware/authenticate.js";
import type { RecurringTransactionService } from "./recurringTransaction.service.js";
import type {
  CreateRecurringTransactionBody,
  UpdateRecurringTransactionBody,
} from "./recurringTransaction.schemas.js";

function getAuthContext(response: Response) {
  return response.locals.auth as AuthContext;
}

export class RecurringTransactionController {
  constructor(private readonly service: RecurringTransactionService) {}

  listRecurringTransactions = async (
    request: Request<{ workspaceId: string }>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const templates = await this.service.listRecurringTransactions(
      auth.userId,
      request.params.workspaceId,
    );

    sendSuccess(response, {
      data: templates,
      message: "Recurring transactions retrieved successfully.",
    });
  };

  getRecurringTransaction = async (
    request: Request<{ recurringTransactionId: string; workspaceId: string }>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const template = await this.service.getRecurringTransaction(
      auth.userId,
      request.params.workspaceId,
      request.params.recurringTransactionId,
    );

    sendSuccess(response, {
      data: template,
      message: "Recurring transaction retrieved successfully.",
    });
  };

  createRecurringTransaction = async (
    request: Request<{ workspaceId: string }, never, CreateRecurringTransactionBody>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const template = await this.service.createRecurringTransaction(
      auth.userId,
      request.params.workspaceId,
      request.body,
      response.locals.requestId as string,
    );

    sendSuccess(response, {
      data: template,
      message: "Recurring transaction created successfully.",
      status: 201,
    });
  };

  updateRecurringTransaction = async (
    request: Request<
      { recurringTransactionId: string; workspaceId: string },
      never,
      UpdateRecurringTransactionBody
    >,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const template = await this.service.updateRecurringTransaction(
      auth.userId,
      request.params.workspaceId,
      request.params.recurringTransactionId,
      request.body,
      response.locals.requestId as string,
    );

    sendSuccess(response, {
      data: template,
      message: "Recurring transaction updated successfully.",
    });
  };

  archiveRecurringTransaction = async (
    request: Request<{ recurringTransactionId: string; workspaceId: string }>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const template = await this.service.archiveRecurringTransaction(
      auth.userId,
      request.params.workspaceId,
      request.params.recurringTransactionId,
      response.locals.requestId as string,
    );

    sendSuccess(response, {
      data: template,
      message: "Recurring transaction archived successfully.",
    });
  };

  pauseRecurringTransaction = async (
    request: Request<{ recurringTransactionId: string; workspaceId: string }>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const template = await this.service.pauseRecurringTransaction(
      auth.userId,
      request.params.workspaceId,
      request.params.recurringTransactionId,
      response.locals.requestId as string,
    );

    sendSuccess(response, {
      data: template,
      message: "Recurring transaction paused successfully.",
    });
  };

  resumeRecurringTransaction = async (
    request: Request<{ recurringTransactionId: string; workspaceId: string }>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const template = await this.service.resumeRecurringTransaction(
      auth.userId,
      request.params.workspaceId,
      request.params.recurringTransactionId,
      response.locals.requestId as string,
    );

    sendSuccess(response, {
      data: template,
      message: "Recurring transaction resumed successfully.",
    });
  };
}
