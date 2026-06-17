import type { Database, Queryable } from "../../shared/database/database.js";
import { AppError } from "../../shared/errors/appError.js";
import { createId } from "../../shared/security/ids.js";
import { createPayloadFingerprint } from "../../shared/security/fingerprint.js";
import type {
  GuestMigrationCommitInput,
  GuestMigrationPreviewInput,
} from "./guestMigration.schemas.js";
import {
  GuestMigrationRepository,
  type GuestMigrationCommitSummary,
  type GuestMigrationPreviewItem,
  type GuestMigrationPreviewSummary,
} from "./guestMigration.repository.js";
import { WorkspaceRepository } from "../workspaces/workspace.repository.js";
import { UserRepository } from "../users/user.repository.js";
import { AuthRepository } from "../auth/auth.repository.js";

interface ResolvedWorkspace {
  id: string;
  membershipId: string;
  membershipRole: "manager" | "member";
  name: string;
  reportingCurrency: string;
  timezone: string;
  type: "personal" | "family";
}

interface PreparedPreview {
  items: GuestMigrationPreviewItem[];
  summary: GuestMigrationPreviewSummary;
}

function minorToDecimalString(amountMinor: string) {
  const amount = BigInt(amountMinor);
  const sign = amount < 0n ? "-" : "";
  const absolute = amount < 0n ? -amount : amount;
  const units = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, "0");

  return `${sign}${units.toString()}.${fraction}`;
}

function expirationFromNow(days: number) {
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + days);
  return expiresAt.toISOString();
}

export class GuestMigrationService {
  private readonly authRepository: AuthRepository;
  private readonly guestMigrationRepository: GuestMigrationRepository;
  private readonly userRepository: UserRepository;
  private readonly workspaceRepository: WorkspaceRepository;

  constructor(private readonly database: Database) {
    this.authRepository = new AuthRepository(database);
    this.guestMigrationRepository = new GuestMigrationRepository(database);
    this.userRepository = new UserRepository(database);
    this.workspaceRepository = new WorkspaceRepository(database);
  }

  private async getTargetWorkspace(
    userId: string,
    queryable?: Queryable,
  ): Promise<ResolvedWorkspace> {
    const workspace = await this.workspaceRepository.findPersonalWorkspaceForUser(
      userId,
      queryable ?? this.database,
    );

    if (!workspace) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "The requested resource was not found.",
        status: 404,
      });
    }

    return workspace;
  }

  private async preparePreview(
    userId: string,
    input: GuestMigrationPreviewInput,
    workspace: ResolvedWorkspace,
  ): Promise<PreparedPreview> {
    const clientIds = input.transactions.map((transaction) => transaction.id);
    const existingTransactions =
      await this.guestMigrationRepository.findExistingTransactionsByClientIds(
        workspace.id,
        clientIds,
      );
    const existingByClientId = new Map(
      existingTransactions
        .filter(
          (transaction): transaction is typeof transaction & { clientId: string } =>
            !!transaction.clientId,
        )
        .map((transaction) => [transaction.clientId, transaction]),
    );
    const categoryNames = [
      ...new Set(input.transactions.map((transaction) => transaction.category)),
    ];
    const categories =
      await this.guestMigrationRepository.findSystemCategoriesByNames(categoryNames);
    const categoryKeyToId = new Map(
      categories.map((category) => [`${category.transactionType}:${category.name}`, category.id]),
    );

    for (const transaction of input.transactions) {
      if (!categoryKeyToId.has(`${transaction.type}:${transaction.category}`)) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          details: [
            {
              field: "transactions.category",
              message: `Unknown system category: ${transaction.category}.`,
            },
          ],
          message: "The request could not be processed.",
          status: 422,
        });
      }
    }

    let incomeMinor = 0n;
    let expenseMinor = 0n;
    let importableTransactions = 0;
    let duplicateTransactions = 0;
    let skippedDeletedTransactions = 0;

    const items = input.transactions.map<GuestMigrationPreviewItem>((transaction) => {
      const existing = existingByClientId.get(transaction.id);

      if (transaction.deletedAt) {
        skippedDeletedTransactions += 1;

        return {
          amountMinor: transaction.amountMinor,
          category: transaction.category,
          clientId: transaction.id,
          currency: transaction.currency,
          note: transaction.note,
          status: "skipped_deleted",
          transactionDate: transaction.transactionDate,
          type: transaction.type,
        };
      }

      if (existing) {
        duplicateTransactions += 1;

        return {
          amountMinor: transaction.amountMinor,
          category: transaction.category,
          clientId: transaction.id,
          currency: transaction.currency,
          existingTransactionId: existing.id,
          note: transaction.note,
          status: "duplicate",
          transactionDate: transaction.transactionDate,
          type: transaction.type,
        };
      }

      importableTransactions += 1;

      if (transaction.type === "income") {
        incomeMinor += BigInt(transaction.amountMinor);
      } else {
        expenseMinor += BigInt(transaction.amountMinor);
      }

      return {
        amountMinor: transaction.amountMinor,
        category: transaction.category,
        clientId: transaction.id,
        currency: transaction.currency,
        note: transaction.note,
        status: "importable",
        transactionDate: transaction.transactionDate,
        type: transaction.type,
      };
    });

    void userId;

    return {
      items,
      summary: {
        balanceMinor: (incomeMinor - expenseMinor).toString(),
        duplicateTransactions,
        expenseMinor: expenseMinor.toString(),
        importableTransactions,
        incomeMinor: incomeMinor.toString(),
        skippedDeletedTransactions,
        totalTransactions: input.transactions.length,
      },
    };
  }

  async preview(userId: string, input: GuestMigrationPreviewInput) {
    const workspace = await this.getTargetWorkspace(userId);
    const preview = await this.preparePreview(userId, input, workspace);

    return {
      clientMigrationId: input.clientMigrationId,
      targetWorkspace: {
        id: workspace.id,
        name: input.workspace?.name ?? workspace.name,
        reportingCurrency: input.workspace?.currency ?? input.guestProfile.currency,
        timezone: input.workspace?.timezone ?? input.guestProfile.timezone,
        type: workspace.type,
      },
      transactions: preview.items,
      summary: preview.summary,
    };
  }

  async commit(
    userId: string,
    input: GuestMigrationCommitInput,
    idempotencyKey: string,
    requestId: string | null,
  ) {
    const workspace = await this.getTargetWorkspace(userId);
    const payloadFingerprint = createPayloadFingerprint(input);
    const existingMigration = await this.guestMigrationRepository.findGuestMigration(
      userId,
      workspace.id,
      input.clientMigrationId,
    );

    if (existingMigration) {
      if (existingMigration.payloadFingerprint !== payloadFingerprint) {
        throw new AppError({
          code: "CONFLICT",
          message: "This guest migration ID has already been used with different data.",
          status: 409,
        });
      }

      return {
        clientMigrationId: existingMigration.clientMigrationId,
        idMapping: existingMigration.idMapping,
        migrationId: existingMigration.id,
        summary: existingMigration.resultSummary,
        verification: {
          verified: true,
          ...existingMigration.resultSummary,
        },
        workspaceId: existingMigration.workspaceId,
      };
    }

    const existingIdempotency = await this.guestMigrationRepository.findIdempotencyKey(
      userId,
      workspace.id,
      idempotencyKey,
    );

    if (existingIdempotency) {
      if (existingIdempotency.requestFingerprint !== payloadFingerprint) {
        throw new AppError({
          code: "CONFLICT",
          message: "This idempotency key has already been used with different data.",
          status: 409,
        });
      }

      if (existingIdempotency.responseReference) {
        const storedMigration = await this.guestMigrationRepository.findGuestMigration(
          userId,
          workspace.id,
          input.clientMigrationId,
        );

        if (storedMigration) {
          return {
            clientMigrationId: storedMigration.clientMigrationId,
            idMapping: storedMigration.idMapping,
            migrationId: storedMigration.id,
            summary: storedMigration.resultSummary,
            verification: {
              verified: true,
              ...storedMigration.resultSummary,
            },
            workspaceId: storedMigration.workspaceId,
          };
        }
      }
    }

    const migrationId = createId("mig");

    return this.database.transaction(async (transaction) => {
      const user = await this.userRepository.findCurrentUser(userId);

      if (!user) {
        throw new AppError({
          code: "NOT_FOUND",
          message: "The requested resource was not found.",
          status: 404,
        });
      }

      const preview = await this.preparePreview(userId, input, workspace);
      const repository = new GuestMigrationRepository(transaction);

      if (!existingIdempotency) {
        await repository.createIdempotencyKey(
          {
            actorUserId: userId,
            expiresAt: expirationFromNow(7),
            id: createId("idk"),
            key: idempotencyKey,
            requestFingerprint: payloadFingerprint,
            responseReference: null,
            responseStatus: null,
            workspaceId: workspace.id,
          },
          transaction,
        );
      }

      await this.userRepository.updateCurrentUser(
        userId,
        {
          displayName: input.guestProfile.displayName,
          locale: input.guestProfile.locale,
          preferredCurrency: input.guestProfile.currency,
          timezone: input.guestProfile.timezone,
        },
        transaction,
      );
      await this.workspaceRepository.updateWorkspaceSettings(
        workspace.id,
        {
          name: input.workspace?.name ?? workspace.name,
          reportingCurrency: input.workspace?.currency ?? input.guestProfile.currency,
          timezone: input.workspace?.timezone ?? input.guestProfile.timezone,
        },
        transaction,
      );

      const categories = await repository.findSystemCategoriesByNames([
        ...new Set(input.transactions.map((item) => item.category)),
      ]);
      const categoryKeyToId = new Map(
        categories.map((category) => [`${category.transactionType}:${category.name}`, category.id]),
      );

      const idMapping: {
        transactions: Array<{
          clientId: string;
          serverId: string;
          status: "duplicate" | "imported";
        }>;
      } = { transactions: [] };

      let importedTransactions = 0;
      let migrationAccountId: string | null = null;
      const hasImportableTransactions = preview.items.some((item) => item.status === "importable");

      if (hasImportableTransactions) {
        const existingMigrationAccount = await repository.findMigrationAccount(
          workspace.id,
          transaction,
        );
        migrationAccountId = existingMigrationAccount?.id ?? createId("acc");

        if (!existingMigrationAccount) {
          await repository.createMigrationAccount(
            {
              currency: input.workspace?.currency ?? input.guestProfile.currency,
              id: migrationAccountId,
              workspaceId: workspace.id,
            },
            transaction,
          );
        }
      }

      for (const item of preview.items) {
        if (item.status === "skipped_deleted") {
          continue;
        }

        if (item.status === "duplicate" && item.existingTransactionId) {
          idMapping.transactions.push({
            clientId: item.clientId,
            serverId: item.existingTransactionId,
            status: "duplicate",
          });
          continue;
        }

        const original = input.transactions.find((transaction) => transaction.id === item.clientId);
        const categoryId = categoryKeyToId.get(`${item.type}:${item.category}`);

        if (!original || !categoryId || !migrationAccountId) {
          throw new AppError({
            code: "VALIDATION_ERROR",
            message: "The request could not be processed.",
            status: 422,
          });
        }

        const serverId = createId("txn");

        await repository.createTransaction(
          {
            accountId: migrationAccountId,
            amount: minorToDecimalString(item.amountMinor),
            categoryId,
            clientId: item.clientId,
            createdByUserId: userId,
            currency: item.currency,
            id: serverId,
            note: item.note,
            occurredAt: original.createdAt,
            transactionDate: item.transactionDate,
            type: item.type,
            updatedByUserId: userId,
            workspaceId: workspace.id,
          },
          transaction,
        );
        importedTransactions += 1;
        idMapping.transactions.push({
          clientId: item.clientId,
          serverId,
          status: "imported",
        });
      }

      const resultSummary: GuestMigrationCommitSummary = {
        balanceMinor: preview.summary.balanceMinor,
        duplicateTransactions: preview.summary.duplicateTransactions,
        expenseMinor: preview.summary.expenseMinor,
        importedTransactions,
        incomeMinor: preview.summary.incomeMinor,
        skippedDeletedTransactions: preview.summary.skippedDeletedTransactions,
        totalTransactions: preview.summary.totalTransactions,
      };

      await repository.createGuestMigration(
        {
          clientMigrationId: input.clientMigrationId,
          id: migrationId,
          idMapping,
          payloadFingerprint,
          previewSummary: preview.summary,
          resultSummary,
          userId,
          workspaceId: workspace.id,
        },
        transaction,
      );
      await repository.updateIdempotencyKeyResult(
        userId,
        workspace.id,
        idempotencyKey,
        {
          responseReference: migrationId,
          responseStatus: 201,
        },
        transaction,
      );
      await this.authRepository.insertAuditLog(
        {
          action: "guest_migration.committed",
          actorUserId: userId,
          changeMetadata: {
            clientMigrationId: input.clientMigrationId,
            importedTransactions,
          },
          id: createId("aud"),
          requestId,
          resourceId: migrationId,
          resourceType: "guest_migration",
          workspaceId: workspace.id,
        },
        transaction,
      );

      return {
        clientMigrationId: input.clientMigrationId,
        idMapping,
        migrationId,
        summary: resultSummary,
        verification: {
          verified: true,
          ...resultSummary,
        },
        workspaceId: workspace.id,
      };
    });
  }
}
