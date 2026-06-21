import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

import { parseEnvironment } from "../app/config/environment.js";
import { createDatabase } from "../shared/database/database.js";
import { createId } from "../shared/security/ids.js";
import { hashPassword } from "../shared/security/passwords.js";

dotenv.config({
  path: fileURLToPath(new URL("../../../../.env.production", import.meta.url)),
});
dotenv.config({
  path: fileURLToPath(new URL("../../../../.env", import.meta.url)),
});

function requireSeedValue(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required to seed a test user.`);
  }

  return value;
}

async function main() {
  const environment = parseEnvironment(process.env);
  const database = createDatabase(environment);
  const email = requireSeedValue("SEED_TEST_USER_EMAIL").toLowerCase();
  const password = requireSeedValue("SEED_TEST_USER_PASSWORD");
  const displayName = requireSeedValue("SEED_TEST_USER_DISPLAY_NAME");
  const preferredCurrency = process.env.SEED_TEST_USER_CURRENCY?.trim().toUpperCase() || "INR";
  const locale = process.env.SEED_TEST_USER_LOCALE?.trim() || "en-IN";
  const timezone = process.env.SEED_TEST_USER_TIMEZONE?.trim() || "Asia/Kolkata";
  const passwordHash = await hashPassword(password);

  try {
    const result = await database.transaction(async (transaction) => {
      const existingUser = await transaction.query<{ id: string }>(
        `SELECT id
           FROM users
          WHERE email = $1
            AND deleted_at IS NULL
          LIMIT 1`,
        [email],
      );
      const userId = existingUser.rows[0]?.id ?? createId("usr");

      if (existingUser.rows[0]) {
        await transaction.query(
          `UPDATE users
              SET password_hash = $2,
                  email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP),
                  display_name = $3,
                  locale = $4,
                  timezone = $5,
                  preferred_currency = $6,
                  theme = 'system',
                  status = 'active',
                  updated_at = CURRENT_TIMESTAMP
            WHERE id = $1`,
          [userId, passwordHash, displayName, locale, timezone, preferredCurrency],
        );
      } else {
        await transaction.query(
          `INSERT INTO users (
             id,
             email,
             password_hash,
             email_verified_at,
             display_name,
             locale,
             timezone,
             preferred_currency,
             theme,
             status
           ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6, $7, 'system', 'active')`,
          [userId, email, passwordHash, displayName, locale, timezone, preferredCurrency],
        );
      }

      const existingWorkspace = await transaction.query<{ id: string }>(
        `SELECT w.id
           FROM workspaces w
           JOIN workspace_members wm
             ON wm.workspace_id = w.id
          WHERE wm.user_id = $1
            AND w.type = 'personal'
            AND w.deleted_at IS NULL
          ORDER BY w.created_at ASC
          LIMIT 1`,
        [userId],
      );

      if (existingWorkspace.rows[0]) {
        return { createdWorkspace: false, userId, workspaceId: existingWorkspace.rows[0].id };
      }

      const workspaceId = createId("wrk");

      await transaction.query(
        `INSERT INTO workspaces (
           id,
           name,
           type,
           reporting_currency,
           timezone,
           created_by_user_id
         ) VALUES ($1, $2, 'personal', $3, $4, $5)`,
        [workspaceId, `${displayName}'s Workspace`, preferredCurrency, timezone, userId],
      );
      await transaction.query(
        `INSERT INTO workspace_members (
           id,
           workspace_id,
           user_id,
           membership_role
         ) VALUES ($1, $2, $3, 'manager')`,
        [createId("wsm"), workspaceId, userId],
      );

      return { createdWorkspace: true, userId, workspaceId };
    });

    console.log(
      JSON.stringify(
        {
          email,
          status: "seeded",
          ...result,
        },
        null,
        2,
      ),
    );
  } finally {
    await database.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Failed to seed test user.");
  process.exitCode = 1;
});
