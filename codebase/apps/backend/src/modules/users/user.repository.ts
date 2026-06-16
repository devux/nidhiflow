import type { Queryable } from "../../shared/database/database.js";

export interface CurrentUserRecord {
  createdAt: string;
  displayName: string;
  email: string;
  emailVerifiedAt: string;
  id: string;
  locale: string;
  preferredCurrency: string;
  theme: string;
  timezone: string;
  updatedAt: string;
}

export class UserRepository {
  constructor(private readonly database: Queryable) {}

  async findCurrentUser(userId: string) {
    const result = await this.database.query<CurrentUserRecord>(
      `SELECT id,
              email,
              display_name AS "displayName",
              locale,
              timezone,
              preferred_currency AS "preferredCurrency",
              theme,
              email_verified_at AS "emailVerifiedAt",
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
    const assignments: string[] = [];
    const values: unknown[] = [userId];

    if (updates.displayName !== undefined) {
      values.push(updates.displayName);
      assignments.push(`display_name = $${values.length}`);
    }

    if (updates.locale !== undefined) {
      values.push(updates.locale);
      assignments.push(`locale = $${values.length}`);
    }

    if (updates.timezone !== undefined) {
      values.push(updates.timezone);
      assignments.push(`timezone = $${values.length}`);
    }

    if (updates.preferredCurrency !== undefined) {
      values.push(updates.preferredCurrency);
      assignments.push(`preferred_currency = $${values.length}`);
    }

    if (updates.theme !== undefined) {
      values.push(updates.theme);
      assignments.push(`theme = $${values.length}`);
    }

    values.push(userId);

    await this.database.query(
      `UPDATE users
          SET ${assignments.join(", ")},
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $${values.length}`,
      values,
    );

    return this.findCurrentUser(userId);
  }
}
