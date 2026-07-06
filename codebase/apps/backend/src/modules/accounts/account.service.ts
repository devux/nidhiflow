import { AppError } from "../../shared/errors/appError.js";
import { createId } from "../../shared/security/ids.js";
import type { Database } from "../../shared/database/database.js";
import { AuthRepository } from "../auth/auth.repository.js";
import { notifyWorkspaceMembers } from "../notifications/workspaceNotification.service.js";
import { WorkspaceRepository } from "../workspaces/workspace.repository.js";
import { AccountRepository } from "./account.repository.js";
import type {
  CreateAccountBody,
  CreateLoanPaymentBody,
  UpdateAccountBody,
} from "./account.schemas.js";

function duplicateAccountName() {
  return new AppError({
    code: "CONFLICT",
    message: "An active account with this name already exists.",
    status: 409,
  });
}

function normalizeDecimal(value: string) {
  const trimmed = value.trim();
  const negative = trimmed.startsWith("-");
  const [wholePartRaw, fractionalPart = ""] = (negative ? trimmed.slice(1) : trimmed).split(".");
  const wholePart = BigInt(wholePartRaw || "0");
  const normalizedFraction = `${fractionalPart}0000`.slice(0, 4);
  const magnitude = wholePart * 10_000n + BigInt(normalizedFraction);

  return negative ? -magnitude : magnitude;
}

function isLiabilityAccountType(type: string) {
  return type === "credit_card" || type === "loan" || type === "other_liability";
}

export class AccountService {
  private readonly workspaceRepository: WorkspaceRepository;
  private readonly repository: AccountRepository;
  private readonly authRepository: AuthRepository;

  constructor(private readonly database: Database) {
    this.workspaceRepository = new WorkspaceRepository(database);
    this.repository = new AccountRepository(database);
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

  async listAccounts(userId: string, workspaceId: string) {
    await this.ensureWorkspaceAccess(userId, workspaceId);
    return this.repository.listByWorkspace(workspaceId);
  }

  async getAccount(userId: string, workspaceId: string, accountId: string) {
    await this.ensureWorkspaceAccess(userId, workspaceId);
    const account = await this.repository.findById(workspaceId, accountId);

    if (!account) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "The requested resource was not found.",
        status: 404,
      });
    }

    return account;
  }

  async getSummary(userId: string, workspaceId: string) {
    await this.ensureWorkspaceAccess(userId, workspaceId);
    return this.repository.summary(workspaceId);
  }

  async listLoanPayments(userId: string, workspaceId: string, accountId: string) {
    await this.ensureWorkspaceAccess(userId, workspaceId);
    const account = await this.repository.findById(workspaceId, accountId);

    if (!account || !isLiabilityAccountType(account.type)) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "The requested resource was not found.",
        status: 404,
      });
    }

    return this.repository.listPayments(workspaceId, accountId);
  }

  async createLoanPayment(
    userId: string,
    workspaceId: string,
    accountId: string,
    input: CreateLoanPaymentBody,
    requestId: string | null,
  ) {
    await this.ensureWorkspaceAccess(userId, workspaceId);

    return this.database.transaction(async (transaction) => {
      const repository = new AccountRepository(transaction);
      const account = await repository.findById(workspaceId, accountId, transaction);

      if (!account || !isLiabilityAccountType(account.type)) {
        throw new AppError({
          code: "NOT_FOUND",
          message: "The requested resource was not found.",
          status: 404,
        });
      }
      if (account.isArchived) {
        throw new AppError({
          code: "CONFLICT",
          message: "Archived loans cannot receive payments.",
          status: 409,
        });
      }
      if (account.currency !== input.amount.currency) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "Payment currency must match the loan currency.",
          status: 422,
        });
      }

      const outstanding = normalizeDecimal(account.currentBalance);
      const paymentAmount = normalizeDecimal(input.amount.amount);
      if (outstanding <= 0n || paymentAmount > outstanding) {
        throw new AppError({
          code: "CONFLICT",
          message: "Payment cannot exceed the outstanding loan balance.",
          status: 409,
        });
      }

      const payment = await repository.createPayment(
        {
          accountId,
          amount: input.amount.amount,
          createdByUserId: userId,
          currency: input.amount.currency,
          id: createId("lpy"),
          paymentDate: input.paymentDate,
        },
        transaction,
      );

      await this.authRepository.insertAuditLog(
        {
          action: "liability.payment.created",
          actorUserId: userId,
          changeMetadata: { paymentDate: input.paymentDate },
          id: createId("aud"),
          requestId,
          resourceId: payment?.id ?? "",
          resourceType: "loan_payment",
          workspaceId,
        },
        transaction,
      );
      if (payment) {
        await notifyWorkspaceMembers(
          {
            action: "liability.payment.created",
            actorUserId: userId,
            resourceId: accountId,
            workspaceId,
          },
          transaction,
        );
      }

      return payment;
    });
  }

  async createAccount(
    userId: string,
    workspaceId: string,
    input: CreateAccountBody,
    requestId: string | null,
  ) {
    await this.ensureWorkspaceAccess(userId, workspaceId);

    return this.database.transaction(async (transaction) => {
      const repository = new AccountRepository(transaction);
      const existingAccount = await repository.findActiveByName(
        workspaceId,
        input.name,
        transaction,
      );

      if (existingAccount) {
        const isIdempotentCreate =
          existingAccount.currency === input.currency &&
          existingAccount.currency === input.openingBalance.currency &&
          existingAccount.type === input.type &&
          normalizeDecimal(existingAccount.openingBalance) ===
            normalizeDecimal(input.openingBalance.amount);

        if (isIdempotentCreate) {
          return { account: existingAccount, created: false };
        }

        throw duplicateAccountName();
      }

      const account = await repository.create(
        {
          currency: input.openingBalance.currency,
          id: createId("acc"),
          name: input.name,
          openingBalance: input.openingBalance.amount,
          type: input.type,
          workspaceId,
        },
        transaction,
      );

      await this.authRepository.insertAuditLog(
        {
          action: "account.created",
          actorUserId: userId,
          changeMetadata: {
            currency: input.openingBalance.currency,
            openingBalance: input.openingBalance.amount,
            type: input.type,
          },
          id: createId("aud"),
          requestId,
          resourceId: account?.id ?? "",
          resourceType: "account",
          workspaceId,
        },
        transaction,
      );
      if (account && isLiabilityAccountType(account.type)) {
        await notifyWorkspaceMembers(
          {
            action: "liability.created",
            actorUserId: userId,
            resourceId: account.id,
            workspaceId,
          },
          transaction,
        );
      }

      return { account, created: true };
    });
  }

  async updateAccount(
    userId: string,
    workspaceId: string,
    accountId: string,
    input: UpdateAccountBody,
    requestId: string | null,
  ) {
    await this.ensureWorkspaceAccess(userId, workspaceId);

    return this.database.transaction(async (transaction) => {
      const repository = new AccountRepository(transaction);
      const updates: {
        currency?: string;
        name?: string;
        openingBalance?: string;
        type?: NonNullable<UpdateAccountBody["type"]>;
      } = {};

      if (input.currency !== undefined) {
        updates.currency = input.currency;
      }

      if (input.name !== undefined) {
        updates.name = input.name;
      }

      if (input.openingBalance !== undefined) {
        updates.openingBalance = input.openingBalance.amount;
      }

      if (input.type !== undefined) {
        updates.type = input.type;
      }

      if (input.name !== undefined) {
        const existingAccount = await repository.findActiveByName(
          workspaceId,
          input.name,
          transaction,
        );

        if (existingAccount && existingAccount.id !== accountId) {
          throw duplicateAccountName();
        }
      }

      const account = await repository.update(workspaceId, accountId, updates, transaction);

      if (!account) {
        throw new AppError({
          code: "NOT_FOUND",
          message: "The requested resource was not found.",
          status: 404,
        });
      }

      await this.authRepository.insertAuditLog(
        {
          action: "account.updated",
          actorUserId: userId,
          changeMetadata: {
            fields: Object.keys(input),
          },
          id: createId("aud"),
          requestId,
          resourceId: accountId,
          resourceType: "account",
          workspaceId,
        },
        transaction,
      );
      if (isLiabilityAccountType(account.type)) {
        await notifyWorkspaceMembers(
          {
            action: "liability.updated",
            actorUserId: userId,
            resourceId: accountId,
            workspaceId,
          },
          transaction,
        );
      }

      return account;
    });
  }

  async archiveAccount(
    userId: string,
    workspaceId: string,
    accountId: string,
    requestId: string | null,
  ) {
    await this.ensureWorkspaceAccess(userId, workspaceId);
    return this.database.transaction(async (transaction) => {
      const repository = new AccountRepository(transaction);
      const account = await repository.archive(workspaceId, accountId, transaction);

      if (!account) {
        throw new AppError({
          code: "NOT_FOUND",
          message: "The requested resource was not found.",
          status: 404,
        });
      }

      await this.authRepository.insertAuditLog(
        {
          action: "account.archived",
          actorUserId: userId,
          changeMetadata: null,
          id: createId("aud"),
          requestId,
          resourceId: accountId,
          resourceType: "account",
          workspaceId,
        },
        transaction,
      );
      if (isLiabilityAccountType(account.type)) {
        await notifyWorkspaceMembers(
          {
            action: "liability.archived",
            actorUserId: userId,
            resourceId: accountId,
            workspaceId,
          },
          transaction,
        );
      }

      return account;
    });
  }

  async restoreAccount(
    userId: string,
    workspaceId: string,
    accountId: string,
    requestId: string | null,
  ) {
    await this.ensureWorkspaceAccess(userId, workspaceId);
    return this.database.transaction(async (transaction) => {
      const repository = new AccountRepository(transaction);
      const account = await repository.restore(workspaceId, accountId, transaction);

      if (!account) {
        throw new AppError({
          code: "NOT_FOUND",
          message: "The requested resource was not found.",
          status: 404,
        });
      }

      await this.authRepository.insertAuditLog(
        {
          action: "account.restored",
          actorUserId: userId,
          changeMetadata: null,
          id: createId("aud"),
          requestId,
          resourceId: accountId,
          resourceType: "account",
          workspaceId,
        },
        transaction,
      );
      if (isLiabilityAccountType(account.type)) {
        await notifyWorkspaceMembers(
          {
            action: "liability.restored",
            actorUserId: userId,
            resourceId: accountId,
            workspaceId,
          },
          transaction,
        );
      }

      return account;
    });
  }
}
