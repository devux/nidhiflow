import { AppError } from "../../shared/errors/appError.js";
import { createId } from "../../shared/security/ids.js";
import type { Database } from "../../shared/database/database.js";
import { AuthRepository } from "../auth/auth.repository.js";
import { WorkspaceCategoryRepository } from "../categories/workspace-category.repository.js";
import { WorkspaceRepository } from "../workspaces/workspace.repository.js";
import { BudgetRepository } from "./budget.repository.js";
import type { CreateBudgetBody, UpdateBudgetBody } from "./budget.schemas.js";

function notFound() {
  return new AppError({
    code: "NOT_FOUND",
    message: "The requested resource was not found.",
    status: 404,
  });
}

export class BudgetService {
  private readonly workspaceRepository: WorkspaceRepository;
  private readonly repository: BudgetRepository;
  private readonly authRepository: AuthRepository;

  constructor(private readonly database: Database) {
    this.workspaceRepository = new WorkspaceRepository(database);
    this.repository = new BudgetRepository(database);
    this.authRepository = new AuthRepository(database);
  }

  private async ensureWorkspaceAccess(userId: string, workspaceId: string) {
    const workspace = await this.workspaceRepository.findWorkspaceForUser(userId, workspaceId);

    if (!workspace) {
      throw notFound();
    }

    return workspace;
  }

  async listBudgets(userId: string, workspaceId: string) {
    await this.ensureWorkspaceAccess(userId, workspaceId);
    return this.repository.listByWorkspace(workspaceId);
  }

  async getSummary(userId: string, workspaceId: string) {
    await this.ensureWorkspaceAccess(userId, workspaceId);
    return this.repository.summary(workspaceId);
  }

  async getBudget(userId: string, workspaceId: string, budgetId: string) {
    await this.ensureWorkspaceAccess(userId, workspaceId);
    const budget = await this.repository.findById(workspaceId, budgetId);

    if (!budget) {
      throw notFound();
    }

    return budget;
  }

  async createBudget(
    userId: string,
    workspaceId: string,
    input: CreateBudgetBody,
    requestId: string | null,
  ) {
    const workspace = await this.ensureWorkspaceAccess(userId, workspaceId);

    if (input.limitAmount.currency !== workspace.reportingCurrency) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "The request could not be processed.",
        status: 422,
      });
    }

    if (input.periodStart > input.periodEnd) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "The request could not be processed.",
        status: 422,
      });
    }

    return this.database.transaction(async (transaction) => {
      const repository = new BudgetRepository(transaction);
      const categoryRepository = new WorkspaceCategoryRepository(transaction);

      if (input.categoryId) {
        const category = await categoryRepository.findActiveCategoryForTransaction(
          workspaceId,
          input.categoryId,
          "expense",
          transaction,
        );

        if (!category) {
          throw notFound();
        }
      }

      const budget = await repository.create(
        {
          categoryId: input.categoryId ?? null,
          currency: input.limitAmount.currency,
          id: createId("bgt"),
          limitAmount: input.limitAmount.amount,
          periodEnd: input.periodEnd,
          periodStart: input.periodStart,
          workspaceId,
        },
        transaction,
      );

      await this.authRepository.insertAuditLog(
        {
          action: "budget.created",
          actorUserId: userId,
          changeMetadata: {
            categoryId: input.categoryId ?? null,
            periodEnd: input.periodEnd,
            periodStart: input.periodStart,
          },
          id: createId("aud"),
          requestId,
          resourceId: budget?.id ?? "",
          resourceType: "budget",
          workspaceId,
        },
        transaction,
      );

      return budget;
    });
  }

  async updateBudget(
    userId: string,
    workspaceId: string,
    budgetId: string,
    input: UpdateBudgetBody,
    requestId: string | null,
  ) {
    const workspace = await this.ensureWorkspaceAccess(userId, workspaceId);

    if (input.limitAmount?.currency && input.limitAmount.currency !== workspace.reportingCurrency) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "The request could not be processed.",
        status: 422,
      });
    }

    return this.database.transaction(async (transaction) => {
      const repository = new BudgetRepository(transaction);
      const categoryRepository = new WorkspaceCategoryRepository(transaction);

      if (input.categoryId) {
        const category = await categoryRepository.findActiveCategoryForTransaction(
          workspaceId,
          input.categoryId,
          "expense",
          transaction,
        );

        if (!category) {
          throw notFound();
        }
      }

      const updates: Parameters<typeof repository.update>[2] = {};

      if (input.categoryId !== undefined) {
        updates.categoryId = input.categoryId;
      }

      if (input.currency !== undefined) {
        updates.currency = input.currency;
      }

      if (input.limitAmount !== undefined) {
        updates.limitAmount = input.limitAmount.amount;
      }

      if (input.periodEnd !== undefined) {
        updates.periodEnd = input.periodEnd;
      }

      if (input.periodStart !== undefined) {
        updates.periodStart = input.periodStart;
      }

      const budget = await repository.update(workspaceId, budgetId, updates, transaction);

      if (!budget) {
        throw notFound();
      }

      await this.authRepository.insertAuditLog(
        {
          action: "budget.updated",
          actorUserId: userId,
          changeMetadata: {
            fields: Object.keys(input),
          },
          id: createId("aud"),
          requestId,
          resourceId: budgetId,
          resourceType: "budget",
          workspaceId,
        },
        transaction,
      );

      return budget;
    });
  }

  async archiveBudget(
    userId: string,
    workspaceId: string,
    budgetId: string,
    requestId: string | null,
  ) {
    await this.ensureWorkspaceAccess(userId, workspaceId);

    return this.database.transaction(async (transaction) => {
      const repository = new BudgetRepository(transaction);
      const budget = await repository.archive(workspaceId, budgetId, transaction);

      if (!budget) {
        throw notFound();
      }

      await this.authRepository.insertAuditLog(
        {
          action: "budget.archived",
          actorUserId: userId,
          changeMetadata: null,
          id: createId("aud"),
          requestId,
          resourceId: budgetId,
          resourceType: "budget",
          workspaceId,
        },
        transaction,
      );

      return budget;
    });
  }
}
