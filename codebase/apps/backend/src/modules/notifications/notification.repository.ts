import type { Queryable } from "../../shared/database/database.js";

export interface NotificationRecord {
  body: string;
  createdAt: string;
  id: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  sentAt: string | null;
  title: string;
  type: string;
  userId: string;
  workspaceId: string | null;
}

export interface NotificationPreferencesRecord {
  billRemindersEnabled: boolean;
  budgetAlertsEnabled: boolean;
  createdAt: string;
  emailEnabled: boolean;
  flowLaunchEnabled: boolean;
  goalUpdatesEnabled: boolean;
  inAppEnabled: boolean;
  timezone: string;
  updatedAt: string;
  userId: string;
}

export interface FlowLaunchSubscriptionRecord {
  consentedAt: string;
  createdAt: string;
  email: string | null;
  id: string;
  unsubscribedAt: string | null;
  userId: string | null;
}

export class NotificationRepository {
  constructor(private readonly database: Queryable) {}

  async listNotifications(userId: string, queryable: Queryable = this.database) {
    const result = await queryable.query<NotificationRecord>(
      `SELECT id,
              user_id AS "userId",
              workspace_id AS "workspaceId",
              type,
              title,
              body,
              payload,
              read_at AS "readAt",
              sent_at AS "sentAt",
              created_at AS "createdAt"
         FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 100`,
      [userId],
    );

    return result.rows;
  }

  async markRead(userId: string, notificationId: string, queryable: Queryable = this.database) {
    const result = await queryable.query<NotificationRecord>(
      `UPDATE notifications
          SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP),
              updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
          AND id = $2
       RETURNING id,
                 user_id AS "userId",
                 workspace_id AS "workspaceId",
                 type,
                 title,
                 body,
                 payload,
                 read_at AS "readAt",
                 sent_at AS "sentAt",
                 created_at AS "createdAt"`,
      [userId, notificationId],
    );

    return result.rows[0] ?? null;
  }

  async markAllRead(userId: string, queryable: Queryable = this.database) {
    const result = await queryable.query<{ count: string }>(
      `WITH updated AS (
         UPDATE notifications
            SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP),
                updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $1
            AND read_at IS NULL
          RETURNING id
       )
       SELECT COUNT(*)::text AS count FROM updated`,
      [userId],
    );

    return Number(result.rows[0]?.count ?? "0");
  }

  async findPreferences(userId: string, queryable: Queryable = this.database) {
    const result = await queryable.query<NotificationPreferencesRecord>(
      `SELECT user_id AS "userId",
              in_app_enabled AS "inAppEnabled",
              email_enabled AS "emailEnabled",
              bill_reminders_enabled AS "billRemindersEnabled",
              budget_alerts_enabled AS "budgetAlertsEnabled",
              goal_updates_enabled AS "goalUpdatesEnabled",
              flow_launch_enabled AS "flowLaunchEnabled",
              timezone,
              created_at AS "createdAt",
              updated_at AS "updatedAt"
         FROM notification_preferences
        WHERE user_id = $1
        LIMIT 1`,
      [userId],
    );

    return result.rows[0] ?? null;
  }

  async ensurePreferences(userId: string, timezone: string, queryable: Queryable = this.database) {
    await queryable.query(
      `INSERT INTO notification_preferences (user_id, timezone)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId, timezone],
    );

    return this.findPreferences(userId, queryable);
  }

  async updatePreferences(
    userId: string,
    updates: Partial<{
      billRemindersEnabled: boolean | undefined;
      budgetAlertsEnabled: boolean | undefined;
      emailEnabled: boolean | undefined;
      flowLaunchEnabled: boolean | undefined;
      goalUpdatesEnabled: boolean | undefined;
      inAppEnabled: boolean | undefined;
      timezone: string | undefined;
    }>,
    queryable: Queryable = this.database,
  ) {
    const assignments: string[] = [];
    const values: unknown[] = [userId];

    const fields: Array<[keyof typeof updates, string]> = [
      ["inAppEnabled", "in_app_enabled"],
      ["emailEnabled", "email_enabled"],
      ["billRemindersEnabled", "bill_reminders_enabled"],
      ["budgetAlertsEnabled", "budget_alerts_enabled"],
      ["goalUpdatesEnabled", "goal_updates_enabled"],
      ["flowLaunchEnabled", "flow_launch_enabled"],
      ["timezone", "timezone"],
    ];

    for (const [key, column] of fields) {
      if (updates[key] !== undefined) {
        values.push(updates[key]);
        assignments.push(`${column} = $${values.length}`);
      }
    }

    if (assignments.length > 0) {
      await queryable.query(
        `UPDATE notification_preferences
            SET ${assignments.join(", ")},
                updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $1`,
        values,
      );
    }

    return this.findPreferences(userId, queryable);
  }

  async createFlowLaunchSubscription(
    input: {
      email: string | null;
      id: string;
      tokenHash: string;
      userId: string | null;
    },
    queryable: Queryable = this.database,
  ) {
    const result = await queryable.query<FlowLaunchSubscriptionRecord>(
      `INSERT INTO flow_launch_subscriptions (
         id,
         email,
         user_id,
         token_hash
       ) VALUES ($1, $2, $3, $4)
       RETURNING id,
                 email,
                 user_id AS "userId",
                 consented_at AS "consentedAt",
                 unsubscribed_at AS "unsubscribedAt",
                 created_at AS "createdAt"`,
      [input.id, input.email, input.userId, input.tokenHash],
    );

    return result.rows[0] ?? null;
  }

  async unsubscribeFlowLaunch(tokenHash: string, queryable: Queryable = this.database) {
    const result = await queryable.query<FlowLaunchSubscriptionRecord>(
      `UPDATE flow_launch_subscriptions
          SET unsubscribed_at = COALESCE(unsubscribed_at, CURRENT_TIMESTAMP),
              updated_at = CURRENT_TIMESTAMP
        WHERE token_hash = $1
       RETURNING id,
                 email,
                 user_id AS "userId",
                 consented_at AS "consentedAt",
                 unsubscribed_at AS "unsubscribedAt",
                 created_at AS "createdAt"`,
      [tokenHash],
    );

    return result.rows[0] ?? null;
  }
}
