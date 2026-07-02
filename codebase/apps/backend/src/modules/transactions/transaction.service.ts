import { AppError } from "../../shared/errors/appError.js";
import { createId } from "../../shared/security/ids.js";
import type { Database, Queryable } from "../../shared/database/database.js";
import { AuthRepository } from "../auth/auth.repository.js";
import { AccountRepository } from "../accounts/account.repository.js";
import { WorkspaceCategoryRepository } from "../categories/workspace-category.repository.js";
import { WorkspaceRepository } from "../workspaces/workspace.repository.js";
import { TransactionRepository } from "./transaction.repository.js";
import type {
  CreateNotificationTransactionBody,
  CreateTransactionBody,
  TransactionListQuery,
  UpdateTransactionBody,
} from "./transaction.schemas.js";

const notificationCategoryIds = {
  income: {
    business: "cat_business",
    freelance: "cat_freelance",
    interest: "cat_interest",
    salary: "cat_salary",
    uncategorized: "cat_uncategorized_income",
  },
  expense: {
    bills: "cat_bills",
    education: "cat_education",
    entertainment: "cat_entertainment",
    food: "cat_food",
    health: "cat_health",
    home: "cat_home",
    shopping: "cat_shopping",
    transport: "cat_transport",
    travel: "cat_travel",
    uncategorized: "cat_uncategorized_expense",
  },
} as const;

function notificationCategoryId(input: CreateNotificationTransactionBody) {
  const categoryMap = notificationCategoryIds[input.type] as Record<string, string>;
  return categoryMap[input.categoryHint] ?? categoryMap.uncategorized;
}

function validateNotificationDates(input: CreateNotificationTransactionBody) {
  const detectedAt = new Date(input.detectedAt);
  const now = Date.now();
  const maximumAgeMs = 8 * 24 * 60 * 60 * 1_000;
  const maximumFutureSkewMs = 5 * 60 * 1_000;
  if (
    Number.isNaN(detectedAt.getTime()) ||
    detectedAt.getTime() < now - maximumAgeMs ||
    detectedAt.getTime() > now + maximumFutureSkewMs
  ) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: "The notification detection time is outside the accepted range.",
      status: 422,
    });
  }

  const transactionDate = Date.parse(`${input.transactionDate}T00:00:00.000Z`);
  const detectedDate = Date.parse(`${detectedAt.toISOString().slice(0, 10)}T00:00:00.000Z`);
  if (Math.abs(transactionDate - detectedDate) > 24 * 60 * 60 * 1_000) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: "The transaction date does not match the notification detection time.",
      status: 422,
    });
  }
}

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

  private async ensureWorkspaceAccess(userId: string, workspaceId: string, queryable?: Queryable) {
    const workspace = await this.workspaceRepository.findWorkspaceForUser(
      userId,
      workspaceId,
      queryable,
    );

    if (!workspace) {
      throw notFound();
    }

    return workspace;
  }

  private async validateTransactionInput(
    workspaceId: string,
    input: CreateTransactionBody,
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

  async createNotificationTransaction(
    userId: string,
    workspaceId: string,
    input: CreateNotificationTransactionBody,
    requestId: string | null,
  ) {
    const categoryId = notificationCategoryId(input);
    const transactionInput: CreateTransactionBody = {
      accountId: input.accountId,
      categoryId,
      money: { amount: input.amount, currency: input.currency },
      ...(input.merchantHint ? { note: input.merchantHint } : {}),
      transactionDate: input.transactionDate,
      type: input.type,
    };

    return this.database.transaction(async (transaction) => {
      await this.ensureWorkspaceAccess(userId, workspaceId, transaction);
      const repository = new TransactionRepository(transaction);
      const existing = await repository.findByNotificationFingerprint(
        userId,
        workspaceId,
        input.sourceFingerprint,
        transaction,
      );
      if (existing) {
        return { duplicate: true, transaction: existing };
      }
      validateNotificationDates(input);
      const validated = await this.validateTransactionInput(
        workspaceId,
        transactionInput,
        transaction,
      );
      const created = await repository.create(
        {
          accountId: input.accountId,
          amount: input.amount,
          categoryId: validated.categoryId,
          createdByUserId: userId,
          currency: input.currency,
          destinationAccountId: null,
          id: createId("txn"),
          note: input.merchantHint ?? null,
          source: "ANDROID_NOTIFICATION",
          sourceDetectedAt: input.detectedAt,
          sourceFingerprint: input.sourceFingerprint,
          sourcePackage: input.sourcePackage,
          sourceParserVersion: input.parserVersion,
          transactionDate: input.transactionDate,
          type: input.type,
          updatedByUserId: userId,
          workspaceId,
        },
        transaction,
      );

      if (!created) {
        const existing = await repository.findByNotificationFingerprint(
          userId,
          workspaceId,
          input.sourceFingerprint,
          transaction,
        );
        if (!existing) {
          throw new AppError({
            code: "CONFLICT",
            message: "The notification transaction could not be created.",
            status: 409,
          });
        }
        return { duplicate: true, transaction: existing };
      }

      await this.authRepository.insertAuditLog(
        {
          action: "transaction.notification_created",
          actorUserId: userId,
          changeMetadata: {
            source: "ANDROID_NOTIFICATION",
            sourcePackage: input.sourcePackage,
            sourceParserVersion: input.parserVersion,
            type: input.type,
          },
          id: createId("aud"),
          requestId,
          resourceId: created.id,
          resourceType: "transaction",
          workspaceId,
        },
        transaction,
      );

      return { duplicate: false, transaction: created };
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
