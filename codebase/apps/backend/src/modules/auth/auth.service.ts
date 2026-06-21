import type { Environment } from "../../app/config/environment.js";
import type { Queryable } from "../../shared/database/database.js";
import type { Database } from "../../shared/database/database.js";
import { AppError } from "../../shared/errors/appError.js";
import { createId } from "../../shared/security/ids.js";
import { createAccessToken } from "../../shared/security/jwt.js";
import { hashPassword, verifyPassword } from "../../shared/security/passwords.js";
import { createOpaqueToken, hashToken } from "../../shared/security/tokens.js";
import { AuthEmailService } from "./authEmail.js";
import { AuthRepository } from "./auth.repository.js";
import { WorkspaceRepository } from "../workspaces/workspace.repository.js";

interface SessionDeviceContext {
  deviceName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenTtlSeconds: number;
  sessionId: string;
}

function addDuration(date: Date, amount: number, unit: "days" | "hours") {
  const value = new Date(date);

  if (unit === "days") {
    value.setUTCDate(value.getUTCDate() + amount);
  } else {
    value.setUTCHours(value.getUTCHours() + amount);
  }

  return value.toISOString();
}

function ensureActiveAccount(
  user: {
    emailVerifiedAt: string | null;
    passwordHash: string | null;
    status: string;
  } | null,
): asserts user is {
  emailVerifiedAt: string;
  passwordHash: string;
  status: string;
} {
  if (!user || !user.passwordHash || !user.emailVerifiedAt || user.status !== "active") {
    throw new AppError({
      code: "INVALID_CREDENTIALS",
      message: "Email or password is incorrect.",
      status: 401,
    });
  }
}

export class AuthService {
  private readonly repository: AuthRepository;
  private readonly emailService: AuthEmailService;
  private readonly workspaceRepository: WorkspaceRepository;

  constructor(
    private readonly database: Database,
    private readonly environment: Environment,
  ) {
    this.repository = new AuthRepository(database);
    this.emailService = new AuthEmailService(environment);
    this.workspaceRepository = new WorkspaceRepository(database);
  }

  private async ensurePersonalWorkspace(
    queryable: Queryable,
    user: {
      displayName: string;
      id: string;
      preferredCurrency: string;
      timezone: string;
    },
    requestId: string | null,
  ) {
    const existing = await this.workspaceRepository.findPersonalWorkspaceForUser(
      user.id,
      queryable,
    );

    if (existing) {
      return existing;
    }

    const workspaceId = createId("wrk");

    await this.workspaceRepository.createPersonalWorkspace(
      {
        createdByUserId: user.id,
        id: workspaceId,
        membershipId: createId("wsm"),
        name: `${user.displayName}'s Workspace`,
        reportingCurrency: user.preferredCurrency,
        timezone: user.timezone,
      },
      queryable,
    );
    await this.repository.insertAuditLog(
      {
        action: "workspace.personal.created",
        actorUserId: user.id,
        changeMetadata: { type: "personal" },
        id: createId("aud"),
        requestId,
        resourceId: workspaceId,
        resourceType: "workspace",
        workspaceId,
      },
      queryable,
    );

    return this.workspaceRepository.findWorkspaceForUser(user.id, workspaceId, queryable);
  }

  private async createSessionTokens(
    queryable: Queryable,
    input: {
      device: SessionDeviceContext;
      requestId: string | null;
      rotatedFromSessionId: string | null;
      tokenFamilyId?: string;
      userId: string;
    },
  ): Promise<AuthTokens> {
    const sessionId = createId("ses");
    const refreshSecret = createOpaqueToken(48);
    const refreshToken = `${sessionId}.${refreshSecret}`;
    const refreshTokenHash = hashToken(refreshSecret);
    const tokenFamilyId = input.tokenFamilyId ?? createId("fam");
    const refreshTokenTtlSeconds = this.environment.REFRESH_SESSION_TTL_DAYS * 24 * 60 * 60;

    await this.repository.createSession(
      {
        deviceName: input.device.deviceName,
        expiresAt: addDuration(new Date(), this.environment.REFRESH_SESSION_TTL_DAYS, "days"),
        id: sessionId,
        ipAddress: input.device.ipAddress,
        refreshTokenHash,
        rotatedFromSessionId: input.rotatedFromSessionId,
        tokenFamilyId,
        userAgent: input.device.userAgent,
        userId: input.userId,
      },
      queryable,
    );

    const accessToken = createAccessToken({
      audience: this.environment.JWT_ACCESS_AUDIENCE,
      expiresInSeconds: this.environment.JWT_ACCESS_TTL_SECONDS,
      issuer: this.environment.JWT_ACCESS_ISSUER,
      secret: this.environment.JWT_ACCESS_SECRET,
      sessionId,
      subject: input.userId,
    }).token;

    await this.repository.insertAuditLog(
      {
        action: "auth.session.created",
        actorUserId: input.userId,
        changeMetadata: { sessionId },
        id: createId("aud"),
        requestId: input.requestId,
        resourceId: sessionId,
        resourceType: "auth_session",
        workspaceId: null,
      },
      queryable,
    );

    return {
      accessToken,
      refreshToken,
      refreshTokenTtlSeconds,
      sessionId,
    };
  }

  async register(
    input: {
      displayName: string;
      email: string;
      locale: string;
      password: string;
      preferredCurrency: string;
      theme: string;
      timezone: string;
    },
    requestId: string | null,
  ) {
    const passwordHash = await hashPassword(input.password);

    const verificationToken = await this.database.transaction(async (transaction) => {
      const repository = new AuthRepository(transaction);
      const existingUser = await repository.findUserByEmail(input.email);
      const pendingVerificationToken = createOpaqueToken(48);

      if (existingUser?.emailVerifiedAt) {
        return null;
      }

      if (existingUser) {
        await repository.updatePendingUser(
          existingUser.id,
          {
            displayName: input.displayName,
            locale: input.locale,
            passwordHash,
            preferredCurrency: input.preferredCurrency,
            theme: input.theme,
            timezone: input.timezone,
          },
          transaction,
        );
        await repository.revokeOutstandingEmailVerificationTokens(existingUser.id, transaction);
        await repository.createEmailVerificationToken(
          {
            expiresAt: addDuration(
              new Date(),
              this.environment.EMAIL_VERIFICATION_TTL_HOURS,
              "hours",
            ),
            id: createId("evt"),
            tokenHash: hashToken(pendingVerificationToken),
            userId: existingUser.id,
          },
          transaction,
        );
        return pendingVerificationToken;
      }

      const userId = createId("usr");

      await repository.createUser(
        {
          displayName: input.displayName,
          email: input.email,
          id: userId,
          locale: input.locale,
          passwordHash,
          preferredCurrency: input.preferredCurrency,
          status: "pending_verification",
          theme: input.theme,
          timezone: input.timezone,
        },
        transaction,
      );

      await repository.createEmailVerificationToken(
        {
          expiresAt: addDuration(
            new Date(),
            this.environment.EMAIL_VERIFICATION_TTL_HOURS,
            "hours",
          ),
          id: createId("evt"),
          tokenHash: hashToken(pendingVerificationToken),
          userId,
        },
        transaction,
      );
      await repository.insertAuditLog(
        {
          action: "auth.registered",
          actorUserId: userId,
          changeMetadata: { verified: false },
          id: createId("aud"),
          requestId,
          resourceId: userId,
          resourceType: "user",
          workspaceId: null,
        },
        transaction,
      );

      return pendingVerificationToken;
    });

    if (verificationToken) {
      await this.emailService.sendVerificationEmail({
        displayName: input.displayName,
        email: input.email,
        token: verificationToken,
      });
    }

    return {
      debugToken:
        this.environment.APP_ENV === "production" ? undefined : (verificationToken ?? undefined),
      message: "If the details are valid, verification instructions are ready for this account.",
    };
  }

  async login(
    input: { deviceName: string | null; email: string; password: string },
    device: SessionDeviceContext,
    requestId: string | null,
  ) {
    const user = await this.repository.findUserByEmail(input.email);

    ensureActiveAccount(user);

    const passwordMatches = await verifyPassword(input.password, user.passwordHash);

    if (!passwordMatches) {
      throw new AppError({
        code: "INVALID_CREDENTIALS",
        message: "Email or password is incorrect.",
        status: 401,
      });
    }

    const tokens = await this.database.transaction((transaction) =>
      this.createSessionTokens(transaction, {
        device: {
          ...device,
          deviceName: input.deviceName ?? device.deviceName,
        },
        requestId,
        rotatedFromSessionId: null,
        userId: user.id,
      }),
    );
    const workspaces = await this.workspaceRepository.listMemberships(user.id);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      refreshTokenTtlSeconds: tokens.refreshTokenTtlSeconds,
      user: {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        locale: user.locale,
        preferredCurrency: user.preferredCurrency,
        theme: user.theme,
        timezone: user.timezone,
      },
      workspaces,
    };
  }

  async verifyEmail(token: string, device: SessionDeviceContext, requestId: string | null) {
    const tokenRecord = await this.repository.findEmailVerificationTokenByHash(hashToken(token));

    if (
      !tokenRecord ||
      tokenRecord.tokenUsedAt ||
      tokenRecord.userEmailVerifiedAt ||
      new Date(tokenRecord.tokenExpiresAt).getTime() <= Date.now()
    ) {
      throw new AppError({
        code: "INVALID_TOKEN",
        message: "The verification token is invalid or expired.",
        status: 400,
      });
    }

    return this.database.transaction(async (transaction) => {
      const repository = new AuthRepository(transaction);

      await repository.markEmailVerificationTokenUsed(tokenRecord.id, transaction);
      await repository.markUserVerified(tokenRecord.userId, transaction);
      const workspace = await this.ensurePersonalWorkspace(
        transaction,
        {
          displayName: tokenRecord.displayName,
          id: tokenRecord.userId,
          preferredCurrency: tokenRecord.preferredCurrency,
          timezone: tokenRecord.timezone,
        },
        requestId,
      );
      const tokens = await this.createSessionTokens(transaction, {
        device,
        requestId,
        rotatedFromSessionId: null,
        userId: tokenRecord.userId,
      });

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        refreshTokenTtlSeconds: tokens.refreshTokenTtlSeconds,
        user: {
          id: tokenRecord.userId,
          displayName: tokenRecord.displayName,
          email: tokenRecord.email,
          locale: tokenRecord.locale,
          preferredCurrency: tokenRecord.preferredCurrency,
          theme: tokenRecord.theme,
          timezone: tokenRecord.timezone,
        },
        workspace,
      };
    });
  }

  async resendVerification(email: string) {
    const user = await this.repository.findUserByEmail(email);

    if (!user || user.emailVerifiedAt) {
      return {
        debugToken: undefined,
        message: "If the details are valid, verification instructions are ready for this account.",
      };
    }

    const verificationToken = createOpaqueToken(48);

    await this.database.transaction(async (transaction) => {
      const repository = new AuthRepository(transaction);

      await repository.revokeOutstandingEmailVerificationTokens(user.id, transaction);
      await repository.createEmailVerificationToken(
        {
          expiresAt: addDuration(
            new Date(),
            this.environment.EMAIL_VERIFICATION_TTL_HOURS,
            "hours",
          ),
          id: createId("evt"),
          tokenHash: hashToken(verificationToken),
          userId: user.id,
        },
        transaction,
      );
    });

    await this.emailService.sendVerificationEmail({
      displayName: user.displayName,
      email: user.email,
      token: verificationToken,
    });

    return {
      debugToken: this.environment.APP_ENV === "production" ? undefined : verificationToken,
      message: "If the details are valid, verification instructions are ready for this account.",
    };
  }

  async forgotPassword(email: string) {
    const user = await this.repository.findUserByEmail(email);

    if (!user || !user.emailVerifiedAt || user.status !== "active") {
      return {
        debugToken: undefined,
        message:
          "If the details are valid, password reset instructions are ready for this account.",
      };
    }

    const resetToken = createOpaqueToken(48);

    await this.database.transaction(async (transaction) => {
      const repository = new AuthRepository(transaction);

      await repository.revokeOutstandingPasswordResetTokens(user.id, transaction);
      await repository.createPasswordResetToken(
        {
          expiresAt: addDuration(new Date(), this.environment.PASSWORD_RESET_TTL_HOURS, "hours"),
          id: createId("prt"),
          tokenHash: hashToken(resetToken),
          userId: user.id,
        },
        transaction,
      );
    });

    await this.emailService.sendPasswordResetEmail({
      displayName: user.displayName,
      email: user.email,
      token: resetToken,
    });

    return {
      debugToken: this.environment.APP_ENV === "production" ? undefined : resetToken,
      message: "If the details are valid, password reset instructions are ready for this account.",
    };
  }

  async resetPassword(token: string, password: string, requestId: string | null) {
    const resetToken = await this.repository.findPasswordResetTokenByHash(hashToken(token));

    if (
      !resetToken ||
      resetToken.tokenUsedAt ||
      !resetToken.passwordHash ||
      new Date(resetToken.tokenExpiresAt).getTime() <= Date.now()
    ) {
      throw new AppError({
        code: "INVALID_TOKEN",
        message: "The password reset token is invalid or expired.",
        status: 400,
      });
    }

    const passwordHash = await hashPassword(password);

    await this.database.transaction(async (transaction) => {
      const repository = new AuthRepository(transaction);

      await repository.markPasswordResetTokenUsed(resetToken.id, transaction);
      await repository.updatePasswordHash(resetToken.userId, passwordHash, transaction);
      await repository.revokeAllUserSessions(resetToken.userId, "password_reset", transaction);
      await repository.insertAuditLog(
        {
          action: "auth.password.reset",
          actorUserId: resetToken.userId,
          changeMetadata: null,
          id: createId("aud"),
          requestId,
          resourceId: resetToken.userId,
          resourceType: "user",
          workspaceId: null,
        },
        transaction,
      );
    });

    return {
      message: "Password reset successfully.",
    };
  }

  async refresh(rawRefreshToken: string, device: SessionDeviceContext, requestId: string | null) {
    const [sessionId, refreshSecret] = rawRefreshToken.split(".");

    if (!sessionId || !refreshSecret) {
      throw new AppError({
        code: "INVALID_SESSION",
        message: "The current session is invalid or expired.",
        status: 401,
      });
    }

    const session = await this.repository.findSessionById(sessionId);

    if (!session) {
      throw new AppError({
        code: "INVALID_SESSION",
        message: "The current session is invalid or expired.",
        status: 401,
      });
    }

    const incomingHash = hashToken(refreshSecret);

    if (session.refreshTokenHash !== incomingHash) {
      throw new AppError({
        code: "INVALID_SESSION",
        message: "The current session is invalid or expired.",
        status: 401,
      });
    }

    if (session.revokedAt) {
      await this.database.transaction(async (transaction) => {
        const repository = new AuthRepository(transaction);

        await repository.revokeSessionFamily(
          session.tokenFamilyId,
          "refresh_token_reuse",
          transaction,
        );
        await repository.insertAuditLog(
          {
            action: "auth.refresh.reuse_detected",
            actorUserId: session.userId,
            changeMetadata: { sessionId: session.id, tokenFamilyId: session.tokenFamilyId },
            id: createId("aud"),
            requestId,
            resourceId: session.tokenFamilyId,
            resourceType: "auth_session_family",
            workspaceId: null,
          },
          transaction,
        );
      });

      throw new AppError({
        code: "SESSION_REUSED",
        message: "The current session is invalid or expired.",
        status: 401,
      });
    }

    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      throw new AppError({
        code: "INVALID_SESSION",
        message: "The current session is invalid or expired.",
        status: 401,
      });
    }

    const user = await this.repository.findUserById(session.userId);

    ensureActiveAccount(user);

    return this.database.transaction(async (transaction) => {
      const repository = new AuthRepository(transaction);
      const tokens = await this.createSessionTokens(transaction, {
        device: {
          deviceName: session.deviceName ?? device.deviceName,
          ipAddress: device.ipAddress ?? session.ipAddress,
          userAgent: device.userAgent ?? session.userAgent,
        },
        requestId,
        rotatedFromSessionId: session.id,
        tokenFamilyId: session.tokenFamilyId,
        userId: session.userId,
      });

      await repository.replaceSession(session.id, tokens.sessionId, transaction);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        refreshTokenTtlSeconds: tokens.refreshTokenTtlSeconds,
      };
    });
  }

  async logout(rawRefreshToken: string | null, requestId: string | null) {
    if (!rawRefreshToken) {
      return {
        message: "Session closed successfully.",
      };
    }

    const [sessionId, refreshSecret] = rawRefreshToken.split(".");

    if (!sessionId || !refreshSecret) {
      return {
        message: "Session closed successfully.",
      };
    }

    const session = await this.repository.findSessionById(sessionId);

    if (!session || session.refreshTokenHash !== hashToken(refreshSecret)) {
      return {
        message: "Session closed successfully.",
      };
    }

    await this.database.transaction(async (transaction) => {
      const repository = new AuthRepository(transaction);

      await repository.revokeSession(session.id, { reason: "logout" }, transaction);
      await repository.insertAuditLog(
        {
          action: "auth.logout",
          actorUserId: session.userId,
          changeMetadata: { sessionId: session.id },
          id: createId("aud"),
          requestId,
          resourceId: session.id,
          resourceType: "auth_session",
          workspaceId: null,
        },
        transaction,
      );
    });

    return {
      message: "Session closed successfully.",
    };
  }

  async logoutAll(userId: string, requestId: string | null) {
    await this.database.transaction(async (transaction) => {
      const repository = new AuthRepository(transaction);

      await repository.revokeAllUserSessions(userId, "logout_all", transaction);
      await repository.insertAuditLog(
        {
          action: "auth.logout_all",
          actorUserId: userId,
          changeMetadata: null,
          id: createId("aud"),
          requestId,
          resourceId: userId,
          resourceType: "user",
          workspaceId: null,
        },
        transaction,
      );
    });

    return {
      message: "All sessions closed successfully.",
    };
  }
}
