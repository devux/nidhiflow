import type { Queryable } from "../../shared/database/database.js";

export interface UserRecord {
  createdAt: string;
  displayName: string;
  email: string;
  emailVerifiedAt: string | null;
  id: string;
  locale: string;
  passwordHash: string | null;
  preferredCurrency: string;
  status: string;
  theme: string;
  timezone: string;
  updatedAt: string;
}

export interface SessionRecord {
  createdAt: string;
  deviceName: string | null;
  expiresAt: string;
  id: string;
  ipAddress: string | null;
  lastUsedAt: string | null;
  refreshTokenHash: string;
  replacedBySessionId: string | null;
  revokeReason: string | null;
  revokedAt: string | null;
  rotatedFromSessionId: string | null;
  tokenFamilyId: string;
  updatedAt: string;
  userAgent: string | null;
  userId: string;
}

export interface VerificationTokenRecord {
  displayName: string;
  email: string;
  id: string;
  locale: string;
  preferredCurrency: string;
  status: string;
  theme: string;
  timezone: string;
  tokenExpiresAt: string;
  tokenUsedAt: string | null;
  userEmailVerifiedAt: string | null;
  userId: string;
}

export interface PasswordResetTokenRecord {
  id: string;
  passwordHash: string | null;
  tokenExpiresAt: string;
  tokenUsedAt: string | null;
  userId: string;
}

export class AuthRepository {
  constructor(private readonly database: Queryable) {}

  async findUserByEmail(email: string) {
    const result = await this.database.query<UserRecord>(
      `SELECT id,
              email,
              password_hash AS "passwordHash",
              email_verified_at AS "emailVerifiedAt",
              display_name AS "displayName",
              locale,
              timezone,
              preferred_currency AS "preferredCurrency",
              theme,
              status,
              created_at AS "createdAt",
              updated_at AS "updatedAt"
         FROM users
        WHERE email = $1
          AND deleted_at IS NULL
        LIMIT 1`,
      [email],
    );

    return result.rows[0] ?? null;
  }

  async findUserById(userId: string) {
    const result = await this.database.query<UserRecord>(
      `SELECT id,
              email,
              password_hash AS "passwordHash",
              email_verified_at AS "emailVerifiedAt",
              display_name AS "displayName",
              locale,
              timezone,
              preferred_currency AS "preferredCurrency",
              theme,
              status,
              created_at AS "createdAt",
              updated_at AS "updatedAt"
         FROM users
        WHERE id = $1
          AND deleted_at IS NULL
        LIMIT 1`,
      [userId],
    );

    return result.rows[0] ?? null;
  }

  async createUser(
    user: {
      displayName: string;
      email: string;
      id: string;
      locale: string;
      passwordHash: string;
      preferredCurrency: string;
      status: string;
      theme: string;
      timezone: string;
    },
    queryable: Queryable = this.database,
  ) {
    await queryable.query(
      `INSERT INTO users (
         id,
         email,
         password_hash,
         display_name,
         locale,
         timezone,
         preferred_currency,
         theme,
         status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        user.id,
        user.email,
        user.passwordHash,
        user.displayName,
        user.locale,
        user.timezone,
        user.preferredCurrency,
        user.theme,
        user.status,
      ],
    );
  }

  async updatePendingUser(
    userId: string,
    updates: {
      displayName: string;
      locale: string;
      passwordHash: string;
      preferredCurrency: string;
      theme: string;
      timezone: string;
    },
    queryable: Queryable = this.database,
  ) {
    await queryable.query(
      `UPDATE users
          SET password_hash = $2,
              display_name = $3,
              locale = $4,
              timezone = $5,
              preferred_currency = $6,
              theme = $7,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $1`,
      [
        userId,
        updates.passwordHash,
        updates.displayName,
        updates.locale,
        updates.timezone,
        updates.preferredCurrency,
        updates.theme,
      ],
    );
  }

  async markUserVerified(userId: string, queryable: Queryable = this.database) {
    await queryable.query(
      `UPDATE users
          SET email_verified_at = CURRENT_TIMESTAMP,
              status = 'active',
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $1`,
      [userId],
    );
  }

  async updatePasswordHash(
    userId: string,
    passwordHash: string,
    queryable: Queryable = this.database,
  ) {
    await queryable.query(
      `UPDATE users
          SET password_hash = $2,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $1`,
      [userId, passwordHash],
    );
  }

  async createEmailVerificationToken(
    token: { expiresAt: string; id: string; tokenHash: string; userId: string },
    queryable: Queryable = this.database,
  ) {
    await queryable.query(
      `INSERT INTO email_verification_tokens (id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [token.id, token.userId, token.tokenHash, token.expiresAt],
    );
  }

  async revokeOutstandingEmailVerificationTokens(
    userId: string,
    queryable: Queryable = this.database,
  ) {
    await queryable.query(
      `UPDATE email_verification_tokens
          SET used_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
          AND used_at IS NULL`,
      [userId],
    );
  }

  async findEmailVerificationTokenByHash(tokenHash: string) {
    const result = await this.database.query<VerificationTokenRecord>(
      `SELECT evt.id,
              evt.user_id AS "userId",
              evt.expires_at AS "tokenExpiresAt",
              evt.used_at AS "tokenUsedAt",
              u.email,
              u.display_name AS "displayName",
              u.locale,
              u.timezone,
              u.preferred_currency AS "preferredCurrency",
              u.theme,
              u.status,
              u.email_verified_at AS "userEmailVerifiedAt"
         FROM email_verification_tokens evt
         JOIN users u
           ON u.id = evt.user_id
        WHERE evt.token_hash = $1
        LIMIT 1`,
      [tokenHash],
    );

    return result.rows[0] ?? null;
  }

  async markEmailVerificationTokenUsed(tokenId: string, queryable: Queryable = this.database) {
    await queryable.query(
      `UPDATE email_verification_tokens
          SET used_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $1`,
      [tokenId],
    );
  }

  async createPasswordResetToken(
    token: { expiresAt: string; id: string; tokenHash: string; userId: string },
    queryable: Queryable = this.database,
  ) {
    await queryable.query(
      `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [token.id, token.userId, token.tokenHash, token.expiresAt],
    );
  }

  async revokeOutstandingPasswordResetTokens(userId: string, queryable: Queryable = this.database) {
    await queryable.query(
      `UPDATE password_reset_tokens
          SET used_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
          AND used_at IS NULL`,
      [userId],
    );
  }

  async findPasswordResetTokenByHash(tokenHash: string) {
    const result = await this.database.query<PasswordResetTokenRecord>(
      `SELECT prt.id,
              prt.user_id AS "userId",
              prt.expires_at AS "tokenExpiresAt",
              prt.used_at AS "tokenUsedAt",
              u.password_hash AS "passwordHash"
         FROM password_reset_tokens prt
         JOIN users u
           ON u.id = prt.user_id
        WHERE prt.token_hash = $1
        LIMIT 1`,
      [tokenHash],
    );

    return result.rows[0] ?? null;
  }

  async markPasswordResetTokenUsed(tokenId: string, queryable: Queryable = this.database) {
    await queryable.query(
      `UPDATE password_reset_tokens
          SET used_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $1`,
      [tokenId],
    );
  }

  async createSession(
    session: {
      deviceName: string | null;
      expiresAt: string;
      id: string;
      ipAddress: string | null;
      refreshTokenHash: string;
      rotatedFromSessionId: string | null;
      tokenFamilyId: string;
      userAgent: string | null;
      userId: string;
    },
    queryable: Queryable = this.database,
  ) {
    await queryable.query(
      `INSERT INTO auth_sessions (
         id,
         user_id,
         refresh_token_hash,
         token_family_id,
         rotated_from_session_id,
         user_agent,
         ip_address,
         device_name,
         expires_at,
         last_used_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
      [
        session.id,
        session.userId,
        session.refreshTokenHash,
        session.tokenFamilyId,
        session.rotatedFromSessionId,
        session.userAgent,
        session.ipAddress,
        session.deviceName,
        session.expiresAt,
      ],
    );
  }

  async findSessionById(sessionId: string) {
    const result = await this.database.query<SessionRecord>(
      `SELECT id,
              user_id AS "userId",
              refresh_token_hash AS "refreshTokenHash",
              token_family_id AS "tokenFamilyId",
              rotated_from_session_id AS "rotatedFromSessionId",
              replaced_by_session_id AS "replacedBySessionId",
              user_agent AS "userAgent",
              ip_address AS "ipAddress",
              device_name AS "deviceName",
              expires_at AS "expiresAt",
              last_used_at AS "lastUsedAt",
              revoked_at AS "revokedAt",
              revoke_reason AS "revokeReason",
              created_at AS "createdAt",
              updated_at AS "updatedAt"
         FROM auth_sessions
        WHERE id = $1
        LIMIT 1`,
      [sessionId],
    );

    return result.rows[0] ?? null;
  }

  async revokeSession(
    sessionId: string,
    options: { reason: string; userId?: string },
    queryable: Queryable = this.database,
  ) {
    const parameters: unknown[] = [sessionId, options.reason];
    const ownershipClause = options.userId ? "AND user_id = $3" : "";

    if (options.userId) {
      parameters.push(options.userId);
    }

    const result = await queryable.query(
      `UPDATE auth_sessions
          SET revoked_at = CURRENT_TIMESTAMP,
              revoke_reason = $2,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND revoked_at IS NULL
          ${ownershipClause}`,
      parameters,
    );

    return result.rowCount ?? 0;
  }

  async revokeSessionFamily(
    tokenFamilyId: string,
    reason: string,
    queryable: Queryable = this.database,
  ) {
    await queryable.query(
      `UPDATE auth_sessions
          SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP),
              revoke_reason = COALESCE(revoke_reason, $2),
              updated_at = CURRENT_TIMESTAMP
        WHERE token_family_id = $1`,
      [tokenFamilyId, reason],
    );
  }

  async replaceSession(
    currentSessionId: string,
    replacementSessionId: string,
    queryable: Queryable = this.database,
  ) {
    await queryable.query(
      `UPDATE auth_sessions
          SET revoked_at = CURRENT_TIMESTAMP,
              revoke_reason = 'rotated',
              replaced_by_session_id = $2,
              updated_at = CURRENT_TIMESTAMP,
              last_used_at = CURRENT_TIMESTAMP
        WHERE id = $1`,
      [currentSessionId, replacementSessionId],
    );
  }

  async revokeAllUserSessions(
    userId: string,
    reason: string,
    queryable: Queryable = this.database,
  ) {
    await queryable.query(
      `UPDATE auth_sessions
          SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP),
              revoke_reason = COALESCE(revoke_reason, $2),
              updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1`,
      [userId, reason],
    );
  }

  async listSessionsByUser(userId: string) {
    const result = await this.database.query<SessionRecord>(
      `SELECT id,
              user_id AS "userId",
              refresh_token_hash AS "refreshTokenHash",
              token_family_id AS "tokenFamilyId",
              rotated_from_session_id AS "rotatedFromSessionId",
              replaced_by_session_id AS "replacedBySessionId",
              user_agent AS "userAgent",
              ip_address AS "ipAddress",
              device_name AS "deviceName",
              expires_at AS "expiresAt",
              last_used_at AS "lastUsedAt",
              revoked_at AS "revokedAt",
              revoke_reason AS "revokeReason",
              created_at AS "createdAt",
              updated_at AS "updatedAt"
         FROM auth_sessions
        WHERE user_id = $1
          AND revoked_at IS NULL
          AND expires_at > CURRENT_TIMESTAMP
        ORDER BY created_at DESC`,
      [userId],
    );

    return result.rows;
  }

  async insertAuditLog(
    entry: {
      action: string;
      actorUserId: string | null;
      changeMetadata: Record<string, unknown> | null;
      id: string;
      requestId: string | null;
      resourceId: string;
      resourceType: string;
      workspaceId: string | null;
    },
    queryable: Queryable = this.database,
  ) {
    await queryable.query(
      `INSERT INTO audit_logs (
         id,
         actor_user_id,
         workspace_id,
         action,
         resource_type,
         resource_id,
         change_metadata,
         request_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)`,
      [
        entry.id,
        entry.actorUserId,
        entry.workspaceId,
        entry.action,
        entry.resourceType,
        entry.resourceId,
        entry.changeMetadata ? JSON.stringify(entry.changeMetadata) : null,
        entry.requestId,
      ],
    );
  }
}
