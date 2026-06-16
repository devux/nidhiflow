import { AppError } from "../../shared/errors/appError.js";
import { createId } from "../../shared/security/ids.js";
import type { Database } from "../../shared/database/database.js";
import { AuthRepository } from "../auth/auth.repository.js";
import { AccountRepository } from "../accounts/account.repository.js";
import { WorkspaceCategoryRepository } from "../categories/workspace-category.repository.js";
import { WorkspaceRepository } from "../workspaces/workspace.repository.js";
import { RecurringTransactionRepository } from "./recurringTransaction.repository.js";
import type {
  CreateRecurringTransactionBody,
  UpdateRecurringTransactionBody,
} from "./recurringTransaction.schemas.js";

function notFound() {
  return new AppError({
    code: "NOT_FOUND",
    message: "The requested resource was not found.",
    status: 404,
  });
}

export class RecurringTransactionService {
  private readonly workspaceRepository: WorkspaceRepository;
  private readonly repository: RecurringTransactionRepository;
  private readonly authRepository: AuthRepository;

  constructor(private readonly database: Database) {
    this.workspaceRepository = new WorkspaceRepository(database);
    this.repository = new RecurringTransactionRepository(database);
    this.authRepository = new AuthRepository(database);
  }

  private async ensureWorkspaceAccess(userId: string, workspaceId: string) {
    const workspace = await this.workspaceRepository.findWorkspaceForUser(userId, workspaceId);

    if (!workspace) {
      throw notFound();
    }

    return workspace;
  }

  async listRecurringTransactions(userId: string, workspaceId: string) {
    await this.ensureWorkspaceAccess(userId, workspaceId);
    return this.repository.listByWorkspace(workspaceId);
  }

  async getRecurringTransaction(
    userId: string,
    workspaceId: string,
    recurringTransactionId: string,
  ) {
    await this.ensureWorkspaceAccess(userId, workspaceId);
    const template = await this.repository.findById(workspaceId, recurringTransactionId);

    if (!template) {
      throw notFound();
    }

    return template;
  }

  async createRecurringTransaction(
    userId: string,
    workspaceId: string,
    input: CreateRecurringTransactionBody,
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
      const repository = new RecurringTransactionRepository(transaction);
      const accountRepository = new AccountRepository(transaction);
      const categoryRepository = new WorkspaceCategoryRepository(transaction);

      const account = await accountRepository.findById(workspaceId, input.accountId, transaction);
      if (!account) {
        throw notFound();
      }

      if (input.type === "transfer") {
        if (!input.destinationAccountId) {
          throw new AppError({
            code: "VALIDATION_ERROR",
            message: "The request could not be processed.",
            status: 422,
          });
        }
      } else if (input.categoryId) {
        const category = await categoryRepository.findActiveCategoryForTransaction(
          workspaceId,
          input.categoryId,
          input.type,
          transaction,
        );
        if (!category) {
          throw notFound();
        }
      }

      const template = await repository.create(
        {
          accountId: input.accountId,
          amount: input.amount.amount,
          categoryId: input.categoryId ?? null,
          currency: input.amount.currency,
          destinationAccountId: input.destinationAccountId ?? null,
          id: createId("rct"),
          isActive: true,
          name: input.name,
          nextOccurrence: input.nextOccurrence ?? null,
          note: input.note ?? null,
          scheduleRule: input.scheduleRule,
          timezone: input.timezone,
          type: input.type,
          updatedByUserId: userId,
          workspaceId,
        },
        transaction,
      );

      await this.authRepository.insertAuditLog(
        {
          action: "recurring_transaction.created",
          actorUserId: userId,
          changeMetadata: { type: input.type },
          id: createId("aud"),
          requestId,
          resourceId: template?.id ?? "",
          resourceType: "recurring_transaction",
          workspaceId,
        },
        transaction,
      );

      return template;
    });
  }

  async updateRecurringTransaction(
    userId: string,
    workspaceId: string,
    recurringTransactionId: string,
    input: UpdateRecurringTransactionBody,
    requestId: string | null,
  ) {
    await this.ensureWorkspaceAccess(userId, workspaceId);

    return this.database.transaction(async (transaction) => {
      const repository = new RecurringTransactionRepository(transaction);
      const accountRepository = new AccountRepository(transaction);
      const categoryRepository = new WorkspaceCategoryRepository(transaction);

      if (input.accountId) {
        const account = await accountRepository.findById(workspaceId, input.accountId, transaction);
        if (!account) {
          throw notFound();
        }
      }

      if (input.type !== "transfer" && input.categoryId) {
        const category = await categoryRepository.findActiveCategoryForTransaction(
          workspaceId,
          input.categoryId,
          input.type ?? "expense",
          transaction,
        );
        if (!category) {
          throw notFound();
        }
      }

      const updates: Parameters<typeof repository.update>[2] = {
        updatedByUserId: userId,
      };

      if (input.accountId !== undefined) {
        updates.accountId = input.accountId;
      }

      if (input.amount !== undefined) {
        updates.amount = input.amount.amount;
      }

      if (input.categoryId !== undefined) {
        updates.categoryId = input.categoryId;
      }

      if (input.destinationAccountId !== undefined) {
        updates.destinationAccountId = input.destinationAccountId;
      }

      if (input.isActive !== undefined) {
        updates.isActive = input.isActive;
      }

      if (input.name !== undefined) {
        updates.name = input.name;
      }

      if (input.nextOccurrence !== undefined) {
        updates.nextOccurrence = input.nextOccurrence;
      }

      if (input.note !== undefined) {
        updates.note = input.note;
      }

      if (input.scheduleRule !== undefined) {
        updates.scheduleRule = input.scheduleRule;
      }

      if (input.timezone !== undefined) {
        updates.timezone = input.timezone;
      }

      if (input.type !== undefined) {
        updates.type = input.type;
      }

      const template = await repository.update(
        workspaceId,
        recurringTransactionId,
        updates,
        transaction,
      );

      if (!template) {
        throw notFound();
      }

      await this.authRepository.insertAuditLog(
        {
          action: "recurring_transaction.updated",
          actorUserId: userId,
          changeMetadata: { fields: Object.keys(input) },
          id: createId("aud"),
          requestId,
          resourceId: recurringTransactionId,
          resourceType: "recurring_transaction",
          workspaceId,
        },
        transaction,
      );

      return template;
    });
  }

  async archiveRecurringTransaction(
    userId: string,
    workspaceId: string,
    recurringTransactionId: string,
    requestId: string | null,
  ) {
    await this.ensureWorkspaceAccess(userId, workspaceId);

    return this.database.transaction(async (transaction) => {
      const repository = new RecurringTransactionRepository(transaction);
      const template = await repository.archive(workspaceId, recurringTransactionId, transaction);

      if (!template) {
        throw notFound();
      }

      await this.authRepository.insertAuditLog(
        {
          action: "recurring_transaction.archived",
          actorUserId: userId,
          changeMetadata: null,
          id: createId("aud"),
          requestId,
          resourceId: recurringTransactionId,
          resourceType: "recurring_transaction",
          workspaceId,
        },
        transaction,
      );

      return template;
    });
  }

  async pauseRecurringTransaction(
    userId: string,
    workspaceId: string,
    recurringTransactionId: string,
    requestId: string | null,
  ) {
    return this.updateRecurringTransaction(
      userId,
      workspaceId,
      recurringTransactionId,
      { isActive: false },
      requestId,
    );
  }

  async resumeRecurringTransaction(
    userId: string,
    workspaceId: string,
    recurringTransactionId: string,
    requestId: string | null,
  ) {
    return this.updateRecurringTransaction(
      userId,
      workspaceId,
      recurringTransactionId,
      { isActive: true },
      requestId,
    );
  }
}
