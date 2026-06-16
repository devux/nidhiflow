import type { Request, Response } from "express";

import { sendSuccess } from "../../app/http.js";
import type { AuthContext } from "../../app/middleware/authenticate.js";
import type { BudgetService } from "./budget.service.js";
import type { CreateBudgetBody, UpdateBudgetBody } from "./budget.schemas.js";

function getAuthContext(response: Response) {
  return response.locals.auth as AuthContext;
}

export class BudgetController {
  constructor(private readonly service: BudgetService) {}

  listBudgets = async (request: Request<{ workspaceId: string }>, response: Response) => {
    const auth = getAuthContext(response);
    const budgets = await this.service.listBudgets(auth.userId, request.params.workspaceId);

    sendSuccess(response, {
      data: budgets,
      message: "Budgets retrieved successfully.",
    });
  };

  getSummary = async (request: Request<{ workspaceId: string }>, response: Response) => {
    const auth = getAuthContext(response);
    const summary = await this.service.getSummary(auth.userId, request.params.workspaceId);

    sendSuccess(response, {
      data: summary,
      message: "Budget summary retrieved successfully.",
    });
  };

  getBudget = async (
    request: Request<{ budgetId: string; workspaceId: string }>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const budget = await this.service.getBudget(
      auth.userId,
      request.params.workspaceId,
      request.params.budgetId,
    );

    sendSuccess(response, {
      data: budget,
      message: "Budget retrieved successfully.",
    });
  };

  createBudget = async (
    request: Request<{ workspaceId: string }, never, CreateBudgetBody>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const budget = await this.service.createBudget(
      auth.userId,
      request.params.workspaceId,
      request.body,
      response.locals.requestId as string,
    );

    sendSuccess(response, {
      data: budget,
      message: "Budget created successfully.",
      status: 201,
    });
  };

  updateBudget = async (
    request: Request<{ budgetId: string; workspaceId: string }, never, UpdateBudgetBody>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const budget = await this.service.updateBudget(
      auth.userId,
      request.params.workspaceId,
      request.params.budgetId,
      request.body,
      response.locals.requestId as string,
    );

    sendSuccess(response, {
      data: budget,
      message: "Budget updated successfully.",
    });
  };

  archiveBudget = async (
    request: Request<{ budgetId: string; workspaceId: string }>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const budget = await this.service.archiveBudget(
      auth.userId,
      request.params.workspaceId,
      request.params.budgetId,
      response.locals.requestId as string,
    );

    sendSuccess(response, {
      data: budget,
      message: "Budget archived successfully.",
    });
  };
}
