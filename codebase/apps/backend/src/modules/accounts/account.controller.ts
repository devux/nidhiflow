import type { Request, Response } from "express";

import { sendSuccess } from "../../app/http.js";
import type { AuthContext } from "../../app/middleware/authenticate.js";
import type { AccountService } from "./account.service.js";
import type { CreateAccountBody, UpdateAccountBody } from "./account.schemas.js";

function getAuthContext(response: Response) {
  return response.locals.auth as AuthContext;
}

export class AccountController {
  constructor(private readonly service: AccountService) {}

  listAccounts = async (request: Request<{ workspaceId: string }>, response: Response) => {
    const auth = getAuthContext(response);
    const accounts = await this.service.listAccounts(auth.userId, request.params.workspaceId);

    sendSuccess(response, {
      data: accounts,
      message: "Accounts retrieved successfully.",
    });
  };

  getSummary = async (request: Request<{ workspaceId: string }>, response: Response) => {
    const auth = getAuthContext(response);
    const summary = await this.service.getSummary(auth.userId, request.params.workspaceId);

    sendSuccess(response, {
      data: summary,
      message: "Account summary retrieved successfully.",
    });
  };

  getAccount = async (
    request: Request<{ accountId: string; workspaceId: string }>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const account = await this.service.getAccount(
      auth.userId,
      request.params.workspaceId,
      request.params.accountId,
    );

    sendSuccess(response, {
      data: account,
      message: "Account retrieved successfully.",
    });
  };

  createAccount = async (
    request: Request<{ workspaceId: string }, never, CreateAccountBody>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const account = await this.service.createAccount(
      auth.userId,
      request.params.workspaceId,
      request.body,
      response.locals.requestId as string,
    );

    sendSuccess(response, {
      data: account,
      message: "Account created successfully.",
      status: 201,
    });
  };

  updateAccount = async (
    request: Request<{ accountId: string; workspaceId: string }, never, UpdateAccountBody>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const account = await this.service.updateAccount(
      auth.userId,
      request.params.workspaceId,
      request.params.accountId,
      request.body,
      response.locals.requestId as string,
    );

    sendSuccess(response, {
      data: account,
      message: "Account updated successfully.",
    });
  };

  archiveAccount = async (
    request: Request<{ accountId: string; workspaceId: string }>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const account = await this.service.archiveAccount(
      auth.userId,
      request.params.workspaceId,
      request.params.accountId,
      response.locals.requestId as string,
    );

    sendSuccess(response, {
      data: account,
      message: "Account archived successfully.",
    });
  };

  restoreAccount = async (
    request: Request<{ accountId: string; workspaceId: string }>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const account = await this.service.restoreAccount(
      auth.userId,
      request.params.workspaceId,
      request.params.accountId,
      response.locals.requestId as string,
    );

    sendSuccess(response, {
      data: account,
      message: "Account restored successfully.",
    });
  };
}
