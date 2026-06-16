import { AppError } from "../../shared/errors/appError.js";
import { createId } from "../../shared/security/ids.js";
import type { Database } from "../../shared/database/database.js";
import { AuthRepository } from "../auth/auth.repository.js";
import { WorkspaceRepository } from "../workspaces/workspace.repository.js";
import { WorkspaceCategoryRepository } from "./workspace-category.repository.js";
import type { CreateCategoryBody, UpdateCategoryBody } from "../accounts/account.schemas.js";

function notFound() {
  return new AppError({
    code: "NOT_FOUND",
    message: "The requested resource was not found.",
    status: 404,
  });
}

export class WorkspaceCategoryService {
  private readonly workspaceRepository: WorkspaceRepository;
  private readonly repository: WorkspaceCategoryRepository;
  private readonly authRepository: AuthRepository;

  constructor(private readonly database: Database) {
    this.workspaceRepository = new WorkspaceRepository(database);
    this.repository = new WorkspaceCategoryRepository(database);
    this.authRepository = new AuthRepository(database);
  }

  private async ensureWorkspaceAccess(userId: string, workspaceId: string) {
    const workspace = await this.workspaceRepository.findWorkspaceForUser(userId, workspaceId);

    if (!workspace) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "The requested resource was not found.",
        status: 404,
      });
    }

    return workspace;
  }

  async listCategories(userId: string, workspaceId: string) {
    await this.ensureWorkspaceAccess(userId, workspaceId);
    return this.repository.listByWorkspace(workspaceId);
  }

  async getCategory(userId: string, workspaceId: string, categoryId: string) {
    await this.ensureWorkspaceAccess(userId, workspaceId);
    const category = await this.repository.findById(workspaceId, categoryId);

    if (!category) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "The requested resource was not found.",
        status: 404,
      });
    }

    return category;
  }

  async createCategory(
    userId: string,
    workspaceId: string,
    input: CreateCategoryBody,
    requestId: string | null,
  ) {
    await this.ensureWorkspaceAccess(userId, workspaceId);

    return this.database.transaction(async (transaction) => {
      const repository = new WorkspaceCategoryRepository(transaction);
      if (input.parentCategoryId) {
        const parent = await repository.findById(workspaceId, input.parentCategoryId, transaction);

        if (!parent || parent.isArchived) {
          throw notFound();
        }

        if (parent.transactionType !== input.transactionType) {
          throw new AppError({
            code: "VALIDATION_ERROR",
            message: "The request could not be processed.",
            status: 422,
          });
        }
      }

      const category = await repository.create(
        {
          colorToken: input.colorToken ?? null,
          iconKey: input.iconKey ?? null,
          id: createId("cat"),
          name: input.name,
          parentCategoryId: input.parentCategoryId ?? null,
          transactionType: input.transactionType,
          workspaceId,
        },
        transaction,
      );

      await this.authRepository.insertAuditLog(
        {
          action: "category.created",
          actorUserId: userId,
          changeMetadata: {
            transactionType: input.transactionType,
          },
          id: createId("aud"),
          requestId,
          resourceId: category?.id ?? "",
          resourceType: "category",
          workspaceId,
        },
        transaction,
      );

      return category;
    });
  }

  async updateCategory(
    userId: string,
    workspaceId: string,
    categoryId: string,
    input: UpdateCategoryBody,
    requestId: string | null,
  ) {
    await this.ensureWorkspaceAccess(userId, workspaceId);

    return this.database.transaction(async (transaction) => {
      const repository = new WorkspaceCategoryRepository(transaction);
      if (input.parentCategoryId) {
        const parent = await repository.findById(workspaceId, input.parentCategoryId, transaction);

        if (!parent || parent.isArchived) {
          throw notFound();
        }

        if (input.transactionType && parent.transactionType !== input.transactionType) {
          throw new AppError({
            code: "VALIDATION_ERROR",
            message: "The request could not be processed.",
            status: 422,
          });
        }
      }

      const updates: Partial<{
        colorToken: string | null;
        iconKey: string | null;
        name: string;
        parentCategoryId: string | null;
        transactionType: "income" | "expense";
      }> = {};

      if (input.colorToken !== undefined) {
        updates.colorToken = input.colorToken;
      }

      if (input.iconKey !== undefined) {
        updates.iconKey = input.iconKey;
      }

      if (input.name !== undefined) {
        updates.name = input.name;
      }

      if (input.parentCategoryId !== undefined) {
        updates.parentCategoryId = input.parentCategoryId;
      }

      if (input.transactionType !== undefined) {
        updates.transactionType = input.transactionType;
      }

      const category = await repository.update(workspaceId, categoryId, updates, transaction);

      if (!category) {
        throw notFound();
      }

      await this.authRepository.insertAuditLog(
        {
          action: "category.updated",
          actorUserId: userId,
          changeMetadata: {
            fields: Object.keys(input),
          },
          id: createId("aud"),
          requestId,
          resourceId: categoryId,
          resourceType: "category",
          workspaceId,
        },
        transaction,
      );

      return category;
    });
  }

  async archiveCategory(
    userId: string,
    workspaceId: string,
    categoryId: string,
    requestId: string | null,
  ) {
    await this.ensureWorkspaceAccess(userId, workspaceId);

    return this.database.transaction(async (transaction) => {
      const repository = new WorkspaceCategoryRepository(transaction);
      const category = await repository.archive(workspaceId, categoryId, transaction);

      if (!category) {
        throw notFound();
      }

      await this.authRepository.insertAuditLog(
        {
          action: "category.archived",
          actorUserId: userId,
          changeMetadata: null,
          id: createId("aud"),
          requestId,
          resourceId: categoryId,
          resourceType: "category",
          workspaceId,
        },
        transaction,
      );

      return category;
    });
  }

  async restoreCategory(
    userId: string,
    workspaceId: string,
    categoryId: string,
    requestId: string | null,
  ) {
    await this.ensureWorkspaceAccess(userId, workspaceId);

    return this.database.transaction(async (transaction) => {
      const repository = new WorkspaceCategoryRepository(transaction);
      const category = await repository.restore(workspaceId, categoryId, transaction);

      if (!category) {
        throw notFound();
      }

      await this.authRepository.insertAuditLog(
        {
          action: "category.restored",
          actorUserId: userId,
          changeMetadata: null,
          id: createId("aud"),
          requestId,
          resourceId: categoryId,
          resourceType: "category",
          workspaceId,
        },
        transaction,
      );

      return category;
    });
  }
}
