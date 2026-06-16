import type { Request, Response } from "express";

import { sendSuccess } from "../../app/http.js";
import type { AuthContext } from "../../app/middleware/authenticate.js";
import type { GoalService } from "./goal.service.js";
import type { CreateContributionBody, CreateGoalBody, UpdateGoalBody } from "./goal.schemas.js";

function getAuthContext(response: Response) {
  return response.locals.auth as AuthContext;
}

export class GoalController {
  constructor(private readonly service: GoalService) {}

  listGoals = async (request: Request<{ workspaceId: string }>, response: Response) => {
    const auth = getAuthContext(response);
    const goals = await this.service.listGoals(auth.userId, request.params.workspaceId);

    sendSuccess(response, {
      data: goals,
      message: "Goals retrieved successfully.",
    });
  };

  getGoal = async (
    request: Request<{ goalId: string; workspaceId: string }>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const goal = await this.service.getGoal(
      auth.userId,
      request.params.workspaceId,
      request.params.goalId,
    );

    sendSuccess(response, {
      data: goal,
      message: "Goal retrieved successfully.",
    });
  };

  createGoal = async (
    request: Request<{ workspaceId: string }, never, CreateGoalBody>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const goal = await this.service.createGoal(
      auth.userId,
      request.params.workspaceId,
      request.body,
      response.locals.requestId as string,
    );

    sendSuccess(response, {
      data: goal,
      message: "Goal created successfully.",
      status: 201,
    });
  };

  updateGoal = async (
    request: Request<{ goalId: string; workspaceId: string }, never, UpdateGoalBody>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const goal = await this.service.updateGoal(
      auth.userId,
      request.params.workspaceId,
      request.params.goalId,
      request.body,
      response.locals.requestId as string,
    );

    sendSuccess(response, {
      data: goal,
      message: "Goal updated successfully.",
    });
  };

  archiveGoal = async (
    request: Request<{ goalId: string; workspaceId: string }>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const goal = await this.service.archiveGoal(
      auth.userId,
      request.params.workspaceId,
      request.params.goalId,
      response.locals.requestId as string,
    );

    sendSuccess(response, {
      data: goal,
      message: "Goal archived successfully.",
    });
  };

  createContribution = async (
    request: Request<{ goalId: string; workspaceId: string }, never, CreateContributionBody>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const contribution = await this.service.createContribution(
      auth.userId,
      request.params.workspaceId,
      request.params.goalId,
      request.body,
      response.locals.requestId as string,
    );

    sendSuccess(response, {
      data: contribution,
      message: "Goal contribution created successfully.",
      status: 201,
    });
  };

  deleteContribution = async (
    request: Request<{ contributionId: string; goalId: string; workspaceId: string }>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    await this.service.deleteContribution(
      auth.userId,
      request.params.workspaceId,
      request.params.goalId,
      request.params.contributionId,
      response.locals.requestId as string,
    );

    sendSuccess(response, {
      data: null,
      message: "Goal contribution deleted successfully.",
    });
  };
}
