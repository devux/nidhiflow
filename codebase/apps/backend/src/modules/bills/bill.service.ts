import { AppError } from "../../shared/errors/appError.js";
import { createId } from "../../shared/security/ids.js";
import type { Database } from "../../shared/database/database.js";
import { AuthRepository } from "../auth/auth.repository.js";
import { AccountRepository } from "../accounts/account.repository.js";
import { CategoryRepository } from "../categories/category.repository.js";
import { WorkspaceCategoryRepository } from "../categories/workspace-category.repository.js";
import { TransactionRepository } from "../transactions/transaction.repository.js";
import { WorkspaceRepository } from "../workspaces/workspace.repository.js";
import { BillRepository } from "./bill.repository.js";
import type { CreateBillBody, UpdateBillBody } from "./bill.schemas.js";

function notFound() {
  return new AppError({
    code: "NOT_FOUND",
    message: "The requested resource was not found.",
    status: 404,
  });
}

export class BillService {
  private readonly workspaceRepository: WorkspaceRepository;
  private readonly repository: BillRepository;
  private readonly authRepository: AuthRepository;

  constructor(private readonly database: Database) {
    this.workspaceRepository = new WorkspaceRepository(database);
    this.repository = new BillRepository(database);
    this.authRepository = new AuthRepository(database);
  }

  private async ensureWorkspaceAccess(userId: string, workspaceId: string) {
    const workspace = await this.workspaceRepository.findWorkspaceForUser(userId, workspaceId);

    if (!workspace) {
      throw notFound();
    }

    return workspace;
  }

  async listBills(userId: string, workspaceId: string) {
    await this.ensureWorkspaceAccess(userId, workspaceId);
    return this.repository.listByWorkspace(workspaceId);
  }

  async getBill(userId: string, workspaceId: string, billId: string) {
    await this.ensureWorkspaceAccess(userId, workspaceId);
    const bill = await this.repository.findById(workspaceId, billId);

    if (!bill) {
      throw notFound();
    }

    return bill;
  }

  async createBill(
    userId: string,
    workspaceId: string,
    input: CreateBillBody,
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
      const repository = new BillRepository(transaction);
      const accountRepository = new AccountRepository(transaction);
      const categoryRepository = new WorkspaceCategoryRepository(transaction);

      const account = await accountRepository.findById(workspaceId, input.accountId, transaction);
      if (!account) {
        throw notFound();
      }

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

      const bill = await repository.create(
        {
          accountId: input.accountId,
          amount: input.amount.amount,
          categoryId: input.categoryId ?? null,
          currency: input.amount.currency,
          dueDate: input.dueDate,
          id: createId("bil"),
          name: input.name,
          recurrenceRule: input.recurrenceRule ?? null,
          status: "pending",
          workspaceId,
        },
        transaction,
      );

      await this.authRepository.insertAuditLog(
        {
          action: "bill.created",
          actorUserId: userId,
          changeMetadata: {
            dueDate: input.dueDate,
          },
          id: createId("aud"),
          requestId,
          resourceId: bill?.id ?? "",
          resourceType: "bill",
          workspaceId,
        },
        transaction,
      );

      return bill;
    });
  }

  async updateBill(
    userId: string,
    workspaceId: string,
    billId: string,
    input: UpdateBillBody,
    requestId: string | null,
  ) {
    const workspace = await this.ensureWorkspaceAccess(userId, workspaceId);

    if (input.amount?.currency && input.amount.currency !== workspace.reportingCurrency) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "The request could not be processed.",
        status: 422,
      });
    }

    return this.database.transaction(async (transaction) => {
      const repository = new BillRepository(transaction);
      const categoryRepository = new WorkspaceCategoryRepository(transaction);
      const accountRepository = new AccountRepository(transaction);

      if (input.accountId) {
        const account = await accountRepository.findById(workspaceId, input.accountId, transaction);
        if (!account) {
          throw notFound();
        }
      }

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

      if (input.accountId !== undefined) {
        updates.accountId = input.accountId;
      }

      if (input.amount !== undefined) {
        updates.amount = input.amount.amount;
      }

      if (input.categoryId !== undefined) {
        updates.categoryId = input.categoryId;
      }

      if (input.dueDate !== undefined) {
        updates.dueDate = input.dueDate;
      }

      if (input.name !== undefined) {
        updates.name = input.name;
      }

      if (input.recurrenceRule !== undefined) {
        updates.recurrenceRule = input.recurrenceRule;
      }

      if (input.status !== undefined) {
        updates.status = input.status;
      }

      const bill = await repository.update(workspaceId, billId, updates, transaction);

      if (!bill) {
        throw notFound();
      }

      await this.authRepository.insertAuditLog(
        {
          action: "bill.updated",
          actorUserId: userId,
          changeMetadata: {
            fields: Object.keys(input),
          },
          id: createId("aud"),
          requestId,
          resourceId: billId,
          resourceType: "bill",
          workspaceId,
        },
        transaction,
      );

      return bill;
    });
  }

  async archiveBill(userId: string, workspaceId: string, billId: string, requestId: string | null) {
    await this.ensureWorkspaceAccess(userId, workspaceId);

    return this.database.transaction(async (transaction) => {
      const repository = new BillRepository(transaction);
      const bill = await repository.archive(workspaceId, billId, transaction);

      if (!bill) {
        throw notFound();
      }

      await this.authRepository.insertAuditLog(
        {
          action: "bill.archived",
          actorUserId: userId,
          changeMetadata: null,
          id: createId("aud"),
          requestId,
          resourceId: billId,
          resourceType: "bill",
          workspaceId,
        },
        transaction,
      );

      return bill;
    });
  }

  async markPaid(userId: string, workspaceId: string, billId: string, requestId: string | null) {
    await this.ensureWorkspaceAccess(userId, workspaceId);

    return this.database.transaction(async (transaction) => {
      const billRepository = new BillRepository(transaction);
      const transactionRepository = new TransactionRepository(transaction);
      const bill = await billRepository.findById(workspaceId, billId, transaction);

      if (!bill) {
        throw notFound();
      }

      if (bill.paidTransactionId) {
        const existingTransaction = await transactionRepository.findById(
          workspaceId,
          bill.paidTransactionId,
          transaction,
        );

        return { bill, transaction: existingTransaction, created: false };
      }

      const systemCategories = await new CategoryRepository(this.database).listSystemCategories(
        "expense",
      );
      const category = bill.categoryId
        ? systemCategories.find((item) => item.id === bill.categoryId)
        : systemCategories.find((item) => item.name === "Bills");

      if (!category) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "The request could not be processed.",
          status: 422,
        });
      }

      if (!bill.accountId) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "The request could not be processed.",
          status: 422,
        });
      }

      const paymentTransaction = await transactionRepository.create(
        {
          accountId: bill.accountId,
          amount: bill.amount,
          categoryId: category.id,
          createdByUserId: userId,
          currency: bill.currency,
          destinationAccountId: null,
          id: createId("txn"),
          note: `Bill payment: ${bill.name}`.slice(0, 100),
          transactionDate: bill.dueDate,
          type: "expense",
          updatedByUserId: userId,
          workspaceId,
        },
        transaction,
      );

      const updatedBill = await billRepository.markPaid(
        workspaceId,
        billId,
        paymentTransaction?.id ?? "",
        transaction,
      );

      await this.authRepository.insertAuditLog(
        {
          action: "bill.marked_paid",
          actorUserId: userId,
          changeMetadata: {
            transactionId: paymentTransaction?.id ?? null,
          },
          id: createId("aud"),
          requestId,
          resourceId: billId,
          resourceType: "bill",
          workspaceId,
        },
        transaction,
      );

      return { bill: updatedBill, transaction: paymentTransaction, created: true };
    });
  }
}
