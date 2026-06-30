import crypto from "node:crypto";

import { AppError } from "../../shared/errors/appError.js";
import { createId } from "../../shared/security/ids.js";
import { createOpaqueToken, hashToken } from "../../shared/security/tokens.js";
import type { Database } from "../../shared/database/database.js";
import type { Environment } from "../../app/config/environment.js";
import { AuthRepository } from "../auth/auth.repository.js";
import { WorkspaceRepository } from "./workspace.repository.js";
import type {
  CreateWorkspaceBody,
  CreateWorkspaceInvitationBody,
  UpdateWorkspaceBody,
  WorkspaceMembershipMoveBody,
} from "./workspace.schemas.js";

function notFound() {
  return new AppError({
    code: "NOT_FOUND",
    message: "The requested resource was not found.",
    status: 404,
  });
}

function forbidden(message = "You do not have access to this resource.") {
  return new AppError({
    code: "FORBIDDEN",
    message,
    status: 403,
  });
}

function conflict(message: string) {
  return new AppError({
    code: "CONFLICT",
    message,
    status: 409,
  });
}

function ownershipTransferRequired() {
  return new AppError({
    code: "OWNERSHIP_TRANSFER_REQUIRED",
    message:
      "Transfer workspace ownership before joining another workspace, or stay in the current workspace.",
    status: 409,
  });
}

function isUniqueConstraintViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

function addDays(date: Date, days: number) {
  const value = new Date(date);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString();
}

function createShareCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(8);
  const raw = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");

  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

export class WorkspaceService {
  private readonly repository: WorkspaceRepository;
  private readonly authRepository: AuthRepository;

  constructor(
    private readonly database: Database,
    private readonly environment?: Environment,
  ) {
    this.repository = new WorkspaceRepository(database);
    this.authRepository = new AuthRepository(database);
  }

  async listWorkspaces(userId: string) {
    return this.repository.listMemberships(userId);
  }

  async getWorkspace(userId: string, workspaceId: string) {
    const workspace = await this.repository.findWorkspaceForUser(userId, workspaceId);

    if (!workspace) {
      throw notFound();
    }

    return workspace;
  }

  private async ensureWorkspaceAccess(userId: string, workspaceId: string) {
    const workspace = await this.repository.findWorkspaceForUser(userId, workspaceId);

    if (!workspace) {
      throw notFound();
    }

    return workspace;
  }

  private async ensureManager(userId: string, workspaceId: string) {
    const workspace = await this.ensureWorkspaceAccess(userId, workspaceId);

    if (workspace.membershipRole !== "manager") {
      throw forbidden("Only workspace managers can manage membership.");
    }

    return workspace;
  }

  async createWorkspace(userId: string, input: CreateWorkspaceBody, requestId: string | null) {
    return this.database.transaction(async (transaction) => {
      const repository = new WorkspaceRepository(transaction);

      const existingWorkspace = await repository.findCurrentWorkspaceForUser(userId, transaction);

      if (existingWorkspace) {
        throw conflict("This account already belongs to a workspace.");
      }

      const workspaceId = createId("wrk");
      const workspace = await repository.createWorkspace(
        {
          createdByUserId: userId,
          id: workspaceId,
          membershipId: createId("wsm"),
          name: input.name,
          reportingCurrency: input.reportingCurrency,
          timezone: input.timezone,
          type: input.type,
        },
        transaction,
      );

      await new AuthRepository(transaction).insertAuditLog(
        {
          action: `workspace.${input.type}.created`,
          actorUserId: userId,
          changeMetadata: {
            name: input.name,
            reportingCurrency: input.reportingCurrency,
            timezone: input.timezone,
            type: input.type,
          },
          id: createId("aud"),
          requestId,
          resourceId: workspaceId,
          resourceType: "workspace",
          workspaceId,
        },
        transaction,
      );

      return workspace;
    });
  }

  async updateWorkspace(
    userId: string,
    workspaceId: string,
    input: UpdateWorkspaceBody,
    requestId: string | null,
  ) {
    await this.ensureManager(userId, workspaceId);

    return this.database.transaction(async (transaction) => {
      const repository = new WorkspaceRepository(transaction);
      await repository.updateWorkspaceSettings(workspaceId, input, transaction);
      const workspace = await repository.findWorkspaceForUser(userId, workspaceId, transaction);

      await new AuthRepository(transaction).insertAuditLog(
        {
          action: "workspace.updated",
          actorUserId: userId,
          changeMetadata: input,
          id: createId("aud"),
          requestId,
          resourceId: workspaceId,
          resourceType: "workspace",
          workspaceId,
        },
        transaction,
      );

      return workspace;
    });
  }

  async archiveWorkspace(userId: string, workspaceId: string, requestId: string | null) {
    const workspace = await this.ensureManager(userId, workspaceId);

    if (workspace.type === "personal") {
      throw conflict("Personal workspaces cannot be deleted through family collaboration.");
    }

    await this.database.transaction(async (transaction) => {
      const repository = new WorkspaceRepository(transaction);
      await repository.archiveWorkspace(workspaceId, transaction);
      await new AuthRepository(transaction).insertAuditLog(
        {
          action: "workspace.archived",
          actorUserId: userId,
          changeMetadata: { type: workspace.type },
          id: createId("aud"),
          requestId,
          resourceId: workspaceId,
          resourceType: "workspace",
          workspaceId,
        },
        transaction,
      );
    });

    return { id: workspaceId, archived: true };
  }

  async listMembers(userId: string, workspaceId: string) {
    await this.ensureWorkspaceAccess(userId, workspaceId);
    return this.repository.listMembers(workspaceId);
  }

  async createInvitation(
    userId: string,
    workspaceId: string,
    input: CreateWorkspaceInvitationBody,
    requestId: string | null,
  ) {
    const workspace = await this.ensureManager(userId, workspaceId);

    const token = createOpaqueToken(48);
    const invitationId = createId("wsi");
    const invitation = await this.database.transaction(async (transaction) => {
      const repository = new WorkspaceRepository(transaction);
      const created = await repository.createInvitation(
        {
          expiresAt: addDays(new Date(), 7),
          id: invitationId,
          invitedByUserId: userId,
          invitedEmail: input.email,
          tokenHash: hashToken(token),
          workspaceId,
        },
        transaction,
      );

      await new AuthRepository(transaction).insertAuditLog(
        {
          action: "workspace.invitation.created",
          actorUserId: userId,
          changeMetadata: { invitedEmail: input.email },
          id: createId("aud"),
          requestId,
          resourceId: invitationId,
          resourceType: "workspace_invitation",
          workspaceId,
        },
        transaction,
      );

      return created;
    });

    return {
      ...invitation,
      ...(this.environment?.APP_ENV !== "production" ? { debugToken: token } : {}),
    };
  }

  async createShareCode(userId: string, workspaceId: string, requestId: string | null) {
    const workspace = await this.ensureManager(userId, workspaceId);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = createShareCode();
      const invitationId = createId("wsi");

      try {
        const invitation = await this.database.transaction(async (transaction) => {
          const repository = new WorkspaceRepository(transaction);
          const created = await repository.createInvitation(
            {
              expiresAt: addDays(new Date(), 7),
              id: invitationId,
              invitedByUserId: userId,
              invitedEmail: null,
              tokenHash: hashToken(code),
              workspaceId,
            },
            transaction,
          );

          await new AuthRepository(transaction).insertAuditLog(
            {
              action: "workspace.share_code.created",
              actorUserId: userId,
              changeMetadata: { expiresAt: created?.expiresAt ?? null },
              id: createId("aud"),
              requestId,
              resourceId: invitationId,
              resourceType: "workspace_invitation",
              workspaceId,
            },
            transaction,
          );

          return created;
        });

        if (!invitation) {
          break;
        }

        return {
          code,
          expiresAt: invitation.expiresAt,
          id: invitation.id,
          workspaceId,
        };
      } catch (error) {
        if (!isUniqueConstraintViolation(error)) {
          throw error;
        }
      }
    }

    throw new AppError({
      code: "INTERNAL_ERROR",
      message: "The share code could not be created.",
      status: 500,
    });
  }

  async acceptInvitation(
    userId: string,
    token: string,
    input: WorkspaceMembershipMoveBody,
    requestId: string | null,
  ) {
    const user = await this.authRepository.findUserById(userId);
    const invitation = await this.repository.findInvitationByTokenHash(hashToken(token));

    if (!user || !invitation) {
      throw notFound();
    }

    if (invitation.status !== "pending" || invitation.revokedAt) {
      throw conflict("This invitation is no longer available.");
    }

    if (new Date(invitation.expiresAt).getTime() <= Date.now()) {
      await this.repository.expireInvitation(invitation.id);
      throw conflict("This invitation has expired.");
    }

    if (
      invitation.invitedEmail &&
      user.email.toLowerCase() !== invitation.invitedEmail.toLowerCase()
    ) {
      throw forbidden("This invitation is for a different account.");
    }

    return this.database.transaction(async (transaction) => {
      const repository = new WorkspaceRepository(transaction);
      const authRepository = new AuthRepository(transaction);
      const currentWorkspace = await repository.findCurrentWorkspaceForUser(userId, transaction);

      if (currentWorkspace?.id === invitation.workspaceId) {
        throw conflict("You already belong to this workspace.");
      }

      if (currentWorkspace) {
        const remainingMembers = (
          await repository.listMembers(currentWorkspace.id, transaction)
        ).filter((member) => member.userId !== userId);

        if (currentWorkspace.membershipRole === "manager" && remainingMembers.length > 0) {
          if (!input.transferOwnership) {
            throw ownershipTransferRequired();
          }

          const successor = remainingMembers[0];

          if (!successor) {
            throw conflict("Workspace ownership could not be transferred.");
          }

          await repository.transferOwnership(currentWorkspace.id, successor.userId, transaction);
          await authRepository.insertAuditLog(
            {
              action: "workspace.ownership.transferred",
              actorUserId: userId,
              changeMetadata: { successorUserId: successor.userId },
              id: createId("aud"),
              requestId,
              resourceId: currentWorkspace.id,
              resourceType: "workspace",
              workspaceId: currentWorkspace.id,
            },
            transaction,
          );
        }

        await repository.removeMember(currentWorkspace.id, userId, transaction);
        await repository.archiveWorkspaceIfEmpty(currentWorkspace.id, transaction);
      }

      await repository.addMember(
        {
          membershipId: createId("wsm"),
          membershipRole: "member",
          userId,
          workspaceId: invitation.workspaceId,
        },
        transaction,
      );
      await repository.acceptInvitation(invitation.id, userId, transaction);
      await authRepository.insertAuditLog(
        {
          action: "workspace.member.joined",
          actorUserId: userId,
          changeMetadata: {
            invitationId: invitation.id,
            invitedEmail: invitation.invitedEmail,
          },
          id: createId("aud"),
          requestId,
          resourceId: userId,
          resourceType: "workspace_member",
          workspaceId: invitation.workspaceId,
        },
        transaction,
      );

      return repository.findWorkspaceForUser(userId, invitation.workspaceId, transaction);
    });
  }

  async joinShareCode(
    userId: string,
    code: string,
    input: WorkspaceMembershipMoveBody,
    requestId: string | null,
  ) {
    return this.acceptInvitation(userId, code.toUpperCase(), input, requestId);
  }

  async removeMember(
    actorUserId: string,
    workspaceId: string,
    targetUserId: string,
    requestId: string | null,
  ) {
    const workspace = await this.ensureManager(actorUserId, workspaceId);

    const members = await this.repository.listMembers(workspaceId);
    const target = members.find((member) => member.userId === targetUserId);

    if (!target) {
      throw notFound();
    }

    if (
      target.membershipRole === "manager" &&
      (await this.repository.countManagers(workspaceId)) <= 1
    ) {
      throw conflict("A workspace must keep at least one manager.");
    }

    const targetUser = await this.authRepository.findUserById(targetUserId);

    if (!targetUser) {
      throw notFound();
    }

    return this.database.transaction(async (transaction) => {
      const repository = new WorkspaceRepository(transaction);
      const authRepository = new AuthRepository(transaction);
      await repository.removeMember(workspaceId, targetUserId, transaction);

      const newWorkspaceId = createId("wrk");
      await repository.createWorkspace(
        {
          createdByUserId: targetUserId,
          id: newWorkspaceId,
          membershipId: createId("wsm"),
          name: `${targetUser.displayName}'s Workspace`,
          reportingCurrency: targetUser.preferredCurrency,
          timezone: targetUser.timezone,
          type: "personal",
        },
        transaction,
      );

      await authRepository.insertAuditLog(
        {
          action: "workspace.member.removed",
          actorUserId,
          changeMetadata: {
            newWorkspaceId,
            removedUserId: targetUserId,
            removedRole: target.membershipRole,
          },
          id: createId("aud"),
          requestId,
          resourceId: targetUserId,
          resourceType: "workspace_member",
          workspaceId,
        },
        transaction,
      );

      return { newWorkspaceId, removed: true, userId: targetUserId };
    });
  }

  async leaveWorkspace(
    userId: string,
    workspaceId: string,
    input: WorkspaceMembershipMoveBody,
    requestId: string | null,
  ) {
    const workspace = await this.ensureWorkspaceAccess(userId, workspaceId);
    const user = await this.authRepository.findUserById(userId);

    if (!user) {
      throw notFound();
    }

    return this.database.transaction(async (transaction) => {
      const repository = new WorkspaceRepository(transaction);
      const authRepository = new AuthRepository(transaction);
      const currentWorkspace = await repository.findCurrentWorkspaceForUser(userId, transaction);

      if (!currentWorkspace || currentWorkspace.id !== workspaceId) {
        throw notFound();
      }

      const remainingMembers = (await repository.listMembers(workspaceId, transaction)).filter(
        (member) => member.userId !== userId,
      );

      if (workspace.membershipRole === "manager" && remainingMembers.length > 0) {
        if (!input.transferOwnership) {
          throw ownershipTransferRequired();
        }

        const successor = remainingMembers[0];

        if (!successor) {
          throw conflict("Workspace ownership could not be transferred.");
        }

        await repository.transferOwnership(workspaceId, successor.userId, transaction);
        await authRepository.insertAuditLog(
          {
            action: "workspace.ownership.transferred",
            actorUserId: userId,
            changeMetadata: { successorUserId: successor.userId },
            id: createId("aud"),
            requestId,
            resourceId: workspaceId,
            resourceType: "workspace",
            workspaceId,
          },
          transaction,
        );
      }

      await repository.removeMember(workspaceId, userId, transaction);
      await repository.archiveWorkspaceIfEmpty(workspaceId, transaction);

      const newWorkspaceId = createId("wrk");
      const newWorkspace = await repository.createWorkspace(
        {
          createdByUserId: userId,
          id: newWorkspaceId,
          membershipId: createId("wsm"),
          name: `${user.displayName}'s Workspace`,
          reportingCurrency: user.preferredCurrency,
          timezone: user.timezone,
          type: "personal",
        },
        transaction,
      );

      await authRepository.insertAuditLog(
        {
          action: "workspace.member.left",
          actorUserId: userId,
          changeMetadata: {
            newWorkspaceId,
            role: workspace.membershipRole,
          },
          id: createId("aud"),
          requestId,
          resourceId: userId,
          resourceType: "workspace_member",
          workspaceId,
        },
        transaction,
      );

      await authRepository.insertAuditLog(
        {
          action: "workspace.personal.created_after_leave",
          actorUserId: userId,
          changeMetadata: {
            reportingCurrency: user.preferredCurrency,
            timezone: user.timezone,
          },
          id: createId("aud"),
          requestId,
          resourceId: newWorkspaceId,
          resourceType: "workspace",
          workspaceId: newWorkspaceId,
        },
        transaction,
      );

      return newWorkspace;
    });
  }
}
