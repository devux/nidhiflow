import { AppError } from "../../shared/errors/appError.js";
import type { Database } from "../../shared/database/database.js";
import { AuthRepository } from "../auth/auth.repository.js";
import { UserRepository } from "./user.repository.js";

export class UserService {
  private readonly authRepository: AuthRepository;
  private readonly userRepository: UserRepository;

  constructor(database: Database) {
    this.authRepository = new AuthRepository(database);
    this.userRepository = new UserRepository(database);
  }

  async getCurrentUser(userId: string) {
    const user = await this.userRepository.findCurrentUser(userId);

    if (!user) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "The requested resource was not found.",
        status: 404,
      });
    }

    return user;
  }

  async updateCurrentUser(
    userId: string,
    updates: Partial<{
      displayName: string;
      locale: string;
      preferredCurrency: string;
      theme: string;
      timezone: string;
    }>,
  ) {
    const user = await this.userRepository.updateCurrentUser(userId, updates);

    if (!user) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "The requested resource was not found.",
        status: 404,
      });
    }

    return user;
  }

  async listSessions(userId: string, currentSessionId: string) {
    const sessions = await this.authRepository.listSessionsByUser(userId);

    return sessions.map((session) => ({
      id: session.id,
      deviceName: session.deviceName,
      expiresAt: session.expiresAt,
      ipAddress: session.ipAddress,
      isCurrent: session.id === currentSessionId,
      lastUsedAt: session.lastUsedAt,
      revokedAt: session.revokedAt,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
    }));
  }

  async revokeSession(userId: string, sessionId: string) {
    const revokedCount = await this.authRepository.revokeSession(sessionId, {
      reason: "user_session_revoked",
      userId,
    });

    if (revokedCount === 0) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "The requested resource was not found.",
        status: 404,
      });
    }
  }
}
