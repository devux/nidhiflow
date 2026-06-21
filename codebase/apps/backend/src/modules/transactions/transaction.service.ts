import { AppError } from "../../shared/errors/appError.js";
import { createId } from "../../shared/security/ids.js";
import type { Database, Queryable } from "../../shared/database/database.js";
import { AuthRepository } from "../auth/auth.repository.js";
import { AccountRepository } from "../accounts/account.repository.js";
import { WorkspaceCategoryRepository } from "../categories/workspace-category.repository.js";
import { WorkspaceRepository } from "../workspaces/workspace.repository.js";
import { TransactionRepository } from "./transaction.repository.js";
import type {
  CreateTransactionBody,
  TransactionListQuery,
  UpdateTransactionBody,
} from "./transaction.schemas.js";

function notFound() {
  return new AppError({
    code: "NOT_FOUND",
    message: "The requested resource was not found.",
    status: 404,
  });
}

export class TransactionService {
  private readonly workspaceRepository: WorkspaceRepository;
  private readonly repository: TransactionRepository;
  private readonly authRepository: AuthRepository;

  constructor(private readonly database: Database) {
    this.workspaceRepository = new WorkspaceRepository(database);
    this.repository = new TransactionRepository(database);
    this.authRepository = new AuthRepository(database);
  }

  private async ensureWorkspaceAccess(userId: string, workspaceId: string) {
    const workspace = await this.workspaceRepository.findWorkspaceForUser(userId, workspaceId);

    if (!workspace) {
      throw notFound();
    }

    return workspace;
  }

  private async validateTransactionInput(
    workspaceId: string,
    input: CreateTransactionBody | UpdateTransactionBody,
    transaction: Queryable,
  ) {
    const accountRepository = new AccountRepository(transaction);
    const categoryRepository = new WorkspaceCategoryRepository(transaction);
    const sourceAccount = await accountRepository.findById(
      workspaceId,
      input.accountId,
      transaction,
    );

    if (!sourceAccount) {
      throw notFound();
    }

    if (sourceAccount.isArchived) {
      throw new AppError({
        code: "CONFLICT",
        message: "Archived accounts cannot receive new transactions.",
        status: 409,
      });
    }

    if (sourceAccount.currency !== input.money.currency) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "The request could not be processed.",
        status: 422,
      });
    }

    let destinationAccount: Awaited<ReturnType<typeof accountRepository.findById>> = null;
    let categoryId: string | null = null;

    if (input.type === "transfer") {
      if (!input.destinationAccountId) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "The request could not be processed.",
          status: 422,
        });
      }

      if (input.destinationAccountId === input.accountId) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "The request could not be processed.",
          status: 422,
        });
      }

      destinationAccount = await accountRepository.findById(
        workspaceId,
        input.destinationAccountId,
        transaction,
      );

      if (!destinationAccount) {
        throw notFound();
      }

      if (destinationAccount.isArchived) {
        throw new AppError({
          code: "CONFLICT",
          message: "Archived accounts cannot receive new transactions.",
          status: 409,
        });
      }

      if (destinationAccount.currency !== input.money.currency) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "The request could not be processed.",
          status: 422,
        });
      }
    } else {
      if (!input.categoryId) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "The request could not be processed.",
          status: 422,
        });
      }

      const category = await categoryRepository.findActiveCategoryForTransaction(
        workspaceId,
        input.categoryId,
        input.type,
        transaction,
      );

      if (!category) {
        throw notFound();
      }

      categoryId = category.id;
    }

    return {
      categoryId,
      destinationAccountId: destinationAccount?.id ?? null,
    };
  }

  async listTransactions(userId: string, workspaceId: string, filters: TransactionListQuery) {
    await this.ensureWorkspaceAccess(userId, workspaceId);
    const repositoryFilters: Partial<{
      accountId: string;
      categoryId: string;
      from: string;
      to: string;
      type: "income" | "expense" | "transfer";
    }> = {};

    if (filters.accountId !== undefined) {
      repositoryFilters.accountId = filters.accountId;
    }

    if (filters.categoryId !== undefined) {
      repositoryFilters.categoryId = filters.categoryId;
    }

    if (filters.from !== undefined) {
      repositoryFilters.from = filters.from;
    }

    if (filters.to !== undefined) {
      repositoryFilters.to = filters.to;
    }

    if (filters.type !== undefined) {
      repositoryFilters.type = filters.type;
    }

    return this.repository.listByWorkspace(workspaceId, repositoryFilters);
  }

  async createTransaction(
    userId: string,
    workspaceId: string,
    input: CreateTransactionBody,
    requestId: string | null,
  ) {
    await this.ensureWorkspaceAccess(userId, workspaceId);

    return this.database.transaction(async (transaction) => {
      const repository = new TransactionRepository(transaction);
      const validated = await this.validateTransactionInput(workspaceId, input, transaction);

      const created = await repository.create(
        {
          accountId: input.accountId,
          amount: input.money.amount,
          categoryId: validated.categoryId,
          createdByUserId: userId,
          currency: input.money.currency,
          destinationAccountId: validated.destinationAccountId,
          id: createId("txn"),
          note: input.note ?? null,
          transactionDate: input.transactionDate,
          type: input.type,
          updatedByUserId: userId,
          workspaceId,
        },
        transaction,
      );

      await this.authRepository.insertAuditLog(
        {
          action: "transaction.created",
          actorUserId: userId,
          changeMetadata: {
            amount: created?.amount ?? input.money.amount,
            destinationAccountId: created?.destinationAccountId ?? null,
            type: input.type,
          },
          id: createId("aud"),
          requestId,
          resourceId: created?.id ?? "",
          resourceType: "transaction",
          workspaceId,
        },
        transaction,
      );

      return created;
    });
  }

  async updateTransaction(
    userId: string,
    workspaceId: string,
    transactionId: string,
    input: UpdateTransactionBody,
    requestId: string | null,
  ) {
    await this.ensureWorkspaceAccess(userId, workspaceId);

    return this.database.transaction(async (transaction) => {
      const repository = new TransactionRepository(transaction);
      const existing = await repository.findById(workspaceId, transactionId, transaction);

      if (!existing) {
        throw notFound();
      }

      const validated = await this.validateTransactionInput(workspaceId, input, transaction);
      const updated = await repository.update(
        workspaceId,
        transactionId,
        {
          accountId: input.accountId,
          amount: input.money.amount,
          categoryId: validated.categoryId,
          currency: input.money.currency,
          destinationAccountId: validated.destinationAccountId,
          note: input.note ?? null,
          transactionDate: input.transactionDate,
          type: input.type,
          updatedByUserId: userId,
        },
        transaction,
      );

      if (!updated) {
        throw notFound();
      }

      await this.authRepository.insertAuditLog(
        {
          action: "transaction.updated",
          actorUserId: userId,
          changeMetadata: {
            fields: ["type", "money", "accountId", "categoryId", "transactionDate", "note"],
          },
          id: createId("aud"),
          requestId,
          resourceId: transactionId,
          resourceType: "transaction",
          workspaceId,
        },
        transaction,
      );

      return updated;
    });
  }

  async deleteTransaction(
    userId: string,
    workspaceId: string,
    transactionId: string,
    requestId: string | null,
  ) {
    await this.ensureWorkspaceAccess(userId, workspaceId);

    return this.database.transaction(async (transaction) => {
      const repository = new TransactionRepository(transaction);
      const deleted = await repository.softDelete(workspaceId, transactionId, userId, transaction);

      if (!deleted) {
        throw notFound();
      }

      await this.authRepository.insertAuditLog(
        {
          action: "transaction.deleted",
          actorUserId: userId,
          changeMetadata: null,
          id: createId("aud"),
          requestId,
          resourceId: transactionId,
          resourceType: "transaction",
          workspaceId,
        },
        transaction,
      );

      return deleted;
    });
  }
}
