import { AppError } from "../../shared/errors/appError.js";
import { createId } from "../../shared/security/ids.js";
import { decimalStringToMinorUnits } from "../../shared/money/decimal.js";
import type { Database } from "../../shared/database/database.js";
import { AuthRepository } from "../auth/auth.repository.js";
import { WorkspaceRepository } from "../workspaces/workspace.repository.js";
import { GoalRepository } from "./goal.repository.js";
import type { CreateContributionBody, CreateGoalBody, UpdateGoalBody } from "./goal.schemas.js";

function notFound() {
  return new AppError({
    code: "NOT_FOUND",
    message: "The requested resource was not found.",
    status: 404,
  });
}

export class GoalService {
  private readonly workspaceRepository: WorkspaceRepository;
  private readonly repository: GoalRepository;
  private readonly authRepository: AuthRepository;

  constructor(private readonly database: Database) {
    this.workspaceRepository = new WorkspaceRepository(database);
    this.repository = new GoalRepository(database);
    this.authRepository = new AuthRepository(database);
  }

  private async ensureWorkspaceAccess(userId: string, workspaceId: string) {
    const workspace = await this.workspaceRepository.findWorkspaceForUser(userId, workspaceId);

    if (!workspace) {
      throw notFound();
    }

    return workspace;
  }

  async listGoals(userId: string, workspaceId: string) {
    await this.ensureWorkspaceAccess(userId, workspaceId);
    return this.repository.listByWorkspace(workspaceId);
  }

  async getGoal(userId: string, workspaceId: string, goalId: string) {
    await this.ensureWorkspaceAccess(userId, workspaceId);
    const goal = await this.repository.findById(workspaceId, goalId);

    if (!goal) {
      throw notFound();
    }

    return goal;
  }

  async createGoal(
    userId: string,
    workspaceId: string,
    input: CreateGoalBody,
    requestId: string | null,
  ) {
    const workspace = await this.ensureWorkspaceAccess(userId, workspaceId);

    if (
      input.targetAmount.currency !== workspace.reportingCurrency ||
      input.currency !== workspace.reportingCurrency
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "The request could not be processed.",
        status: 422,
      });
    }

    return this.database.transaction(async (transaction) => {
      const repository = new GoalRepository(transaction);
      const goal = await repository.create(
        {
          currency: input.currency,
          id: createId("gol"),
          imageKey: null,
          name: input.name,
          status: "active",
          targetAmount: input.targetAmount.amount,
          targetDate: input.targetDate ?? null,
          type: input.type,
          workspaceId,
        },
        transaction,
      );

      await this.authRepository.insertAuditLog(
        {
          action: "goal.created",
          actorUserId: userId,
          changeMetadata: {
            targetDate: input.targetDate ?? null,
            type: input.type,
          },
          id: createId("aud"),
          requestId,
          resourceId: goal?.id ?? "",
          resourceType: "goal",
          workspaceId,
        },
        transaction,
      );

      return goal;
    });
  }

  async updateGoal(
    userId: string,
    workspaceId: string,
    goalId: string,
    input: UpdateGoalBody,
    requestId: string | null,
  ) {
    const workspace = await this.ensureWorkspaceAccess(userId, workspaceId);

    if (input.currency && input.currency !== workspace.reportingCurrency) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "The request could not be processed.",
        status: 422,
      });
    }

    return this.database.transaction(async (transaction) => {
      const repository = new GoalRepository(transaction);
      const goal = await repository.findById(workspaceId, goalId, transaction);

      if (!goal) {
        throw notFound();
      }

      if (
        input.status === "completed" &&
        decimalStringToMinorUnits(goal.fundedAmount) < decimalStringToMinorUnits(goal.targetAmount)
      ) {
        throw new AppError({
          code: "CONFLICT",
          message: "The goal cannot be marked completed before it is fully funded.",
          status: 409,
        });
      }

      const updates: Parameters<typeof repository.update>[2] = {};

      if (input.currency !== undefined) {
        updates.currency = input.currency;
      }

      if (input.name !== undefined) {
        updates.name = input.name;
      }

      if (input.status !== undefined) {
        updates.status = input.status;
      }

      if (input.targetAmount !== undefined) {
        updates.targetAmount = input.targetAmount.amount;
      }

      if (input.targetDate !== undefined) {
        updates.targetDate = input.targetDate;
      }

      if (input.type !== undefined) {
        updates.type = input.type;
      }

      const updated = await repository.update(workspaceId, goalId, updates, transaction);

      if (!updated) {
        throw notFound();
      }

      await this.authRepository.insertAuditLog(
        {
          action: "goal.updated",
          actorUserId: userId,
          changeMetadata: {
            fields: Object.keys(input),
          },
          id: createId("aud"),
          requestId,
          resourceId: goalId,
          resourceType: "goal",
          workspaceId,
        },
        transaction,
      );

      return updated;
    });
  }

  async archiveGoal(userId: string, workspaceId: string, goalId: string, requestId: string | null) {
    await this.ensureWorkspaceAccess(userId, workspaceId);

    return this.database.transaction(async (transaction) => {
      const repository = new GoalRepository(transaction);
      const goal = await repository.archive(workspaceId, goalId, transaction);

      if (!goal) {
        throw notFound();
      }

      await this.authRepository.insertAuditLog(
        {
          action: "goal.archived",
          actorUserId: userId,
          changeMetadata: null,
          id: createId("aud"),
          requestId,
          resourceId: goalId,
          resourceType: "goal",
          workspaceId,
        },
        transaction,
      );

      return goal;
    });
  }

  async createContribution(
    userId: string,
    workspaceId: string,
    goalId: string,
    input: CreateContributionBody,
    requestId: string | null,
  ) {
    const workspace = await this.ensureWorkspaceAccess(userId, workspaceId);

    if (input.amount.currency !== workspace.reportingCurrency) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "The request could not be processed.",
        status: 422,
      });
    }

    return this.database.transaction(async (transaction) => {
      const repository = new GoalRepository(transaction);
      const goal = await repository.findById(workspaceId, goalId, transaction);

      if (!goal) {
        throw notFound();
      }

      if (goal.status !== "active") {
        throw new AppError({
          code: "CONFLICT",
          message: "Only active goals can receive contributions.",
          status: 409,
        });
      }

      const contribution = await repository.createContribution(
        {
          amount: input.amount.amount,
          contributionDate: input.contributionDate,
          currency: input.amount.currency,
          goalId,
          id: createId("gcn"),
          transactionId: input.transactionId ?? null,
        },
        transaction,
      );

      await this.authRepository.insertAuditLog(
        {
          action: "goal.contribution.created",
          actorUserId: userId,
          changeMetadata: {
            amount: input.amount.amount,
            contributionDate: input.contributionDate,
          },
          id: createId("aud"),
          requestId,
          resourceId: contribution?.id ?? "",
          resourceType: "goal_contribution",
          workspaceId,
        },
        transaction,
      );

      return contribution;
    });
  }

  async deleteContribution(
    userId: string,
    workspaceId: string,
    goalId: string,
    contributionId: string,
    requestId: string | null,
  ) {
    await this.ensureWorkspaceAccess(userId, workspaceId);

    return this.database.transaction(async (transaction) => {
      const repository = new GoalRepository(transaction);
      const goal = await repository.findById(workspaceId, goalId, transaction);

      if (!goal) {
        throw notFound();
      }

      await repository.deleteContribution(goalId, contributionId, transaction);
      await this.authRepository.insertAuditLog(
        {
          action: "goal.contribution.deleted",
          actorUserId: userId,
          changeMetadata: null,
          id: createId("aud"),
          requestId,
          resourceId: contributionId,
          resourceType: "goal_contribution",
          workspaceId,
        },
        transaction,
      );
    });
  }
}
