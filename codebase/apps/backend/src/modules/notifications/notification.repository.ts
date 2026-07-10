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
  monthlyReportsEnabled: boolean;
  pushEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursEnd: string;
  quietHoursStart: string;
  recurringRemindersEnabled: boolean;
  securityAlertsEnabled: boolean;
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

export interface WorkspaceNotificationRecipient {
  userId: string;
}

export interface PushTokenRecord {
  browser: string | null;
  createdAt: string;
  deviceName: string | null;
  id: string;
  isActive: boolean;
  lastUsedAt: string;
  os: string | null;
  platform: "android" | "web";
  token: string;
  tokenHash: string;
  updatedAt: string;
  userId: string;
}

export interface PushDeliveryRecord {
  body: string;
  id: string;
  notificationId: string;
  payload: Record<string, unknown>;
  title: string;
  type: string;
  userId: string;
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

  async listWorkspaceNotificationRecipients(
    workspaceId: string,
    actorUserId: string,
    queryable: Queryable = this.database,
  ) {
    const result = await queryable.query<WorkspaceNotificationRecipient>(
      `SELECT wm.user_id AS "userId"
         FROM workspace_members wm
         LEFT JOIN notification_preferences np
           ON np.user_id = wm.user_id
        WHERE wm.workspace_id = $1
          AND wm.user_id <> $2
          AND COALESCE(np.in_app_enabled, TRUE) = TRUE`,
      [workspaceId, actorUserId],
    );

    return result.rows;
  }

  async getWorkspaceNotificationContext(
    workspaceId: string,
    actorUserId: string,
    queryable: Queryable = this.database,
  ) {
    const result = await queryable.query<{ actorDisplayName: string; workspaceName: string }>(
      `SELECT u.display_name AS "actorDisplayName",
              w.name AS "workspaceName"
         FROM users u
         JOIN workspaces w
           ON w.id = $1
        WHERE u.id = $2
          AND u.deleted_at IS NULL
          AND w.deleted_at IS NULL
        LIMIT 1`,
      [workspaceId, actorUserId],
    );

    return result.rows[0] ?? null;
  }

  async createNotification(
    input: {
      body: string;
      id: string;
      payload: Record<string, unknown>;
      title: string;
      type: string;
      userId: string;
      workspaceId: string;
    },
    queryable: Queryable = this.database,
  ) {
    await queryable.query(
      `INSERT INTO notifications (
         id,
         user_id,
         workspace_id,
         type,
         title,
         body,
         payload
       ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        input.id,
        input.userId,
        input.workspaceId,
        input.type,
        input.title,
        input.body,
        JSON.stringify(input.payload),
      ],
    );
  }

  async findPreferences(userId: string, queryable: Queryable = this.database) {
    const result = await queryable.query<NotificationPreferencesRecord>(
      `SELECT user_id AS "userId",
              in_app_enabled AS "inAppEnabled",
              push_enabled AS "pushEnabled",
              email_enabled AS "emailEnabled",
              bill_reminders_enabled AS "billRemindersEnabled",
              budget_alerts_enabled AS "budgetAlertsEnabled",
              goal_updates_enabled AS "goalUpdatesEnabled",
              recurring_reminders_enabled AS "recurringRemindersEnabled",
              monthly_reports_enabled AS "monthlyReportsEnabled",
              security_alerts_enabled AS "securityAlertsEnabled",
              quiet_hours_enabled AS "quietHoursEnabled",
              to_char(quiet_hours_start, 'HH24:MI') AS "quietHoursStart",
              to_char(quiet_hours_end, 'HH24:MI') AS "quietHoursEnd",
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
      monthlyReportsEnabled: boolean | undefined;
      pushEnabled: boolean | undefined;
      quietHoursEnabled: boolean | undefined;
      quietHoursEnd: string | undefined;
      quietHoursStart: string | undefined;
      recurringRemindersEnabled: boolean | undefined;
      securityAlertsEnabled: boolean | undefined;
      timezone: string | undefined;
    }>,
    queryable: Queryable = this.database,
  ) {
    const assignments: string[] = [];
    const values: unknown[] = [userId];

    const fields: Array<[keyof typeof updates, string]> = [
      ["inAppEnabled", "in_app_enabled"],
      ["pushEnabled", "push_enabled"],
      ["emailEnabled", "email_enabled"],
      ["billRemindersEnabled", "bill_reminders_enabled"],
      ["budgetAlertsEnabled", "budget_alerts_enabled"],
      ["goalUpdatesEnabled", "goal_updates_enabled"],
      ["recurringRemindersEnabled", "recurring_reminders_enabled"],
      ["monthlyReportsEnabled", "monthly_reports_enabled"],
      ["securityAlertsEnabled", "security_alerts_enabled"],
      ["quietHoursEnabled", "quiet_hours_enabled"],
      ["quietHoursStart", "quiet_hours_start"],
      ["quietHoursEnd", "quiet_hours_end"],
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

  async upsertPushToken(
    input: {
      browser?: string;
      deviceName?: string;
      id: string;
      os?: string;
      platform: "android" | "web";
      token: string;
      tokenHash: string;
      userId: string;
    },
    queryable: Queryable = this.database,
  ) {
    const result = await queryable.query<PushTokenRecord>(
      `INSERT INTO push_tokens (
         id,
         user_id,
         token,
         token_hash,
         platform,
         device_name,
         browser,
         os
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (token_hash)
       DO UPDATE SET user_id = EXCLUDED.user_id,
                     token = EXCLUDED.token,
                     platform = EXCLUDED.platform,
                     device_name = EXCLUDED.device_name,
                     browser = EXCLUDED.browser,
                     os = EXCLUDED.os,
                     is_active = TRUE,
                     last_used_at = CURRENT_TIMESTAMP,
                     updated_at = CURRENT_TIMESTAMP
       RETURNING id,
                 user_id AS "userId",
                 token,
                 token_hash AS "tokenHash",
                 platform,
                 device_name AS "deviceName",
                 browser,
                 os,
                 is_active AS "isActive",
                 last_used_at AS "lastUsedAt",
                 created_at AS "createdAt",
                 updated_at AS "updatedAt"`,
      [
        input.id,
        input.userId,
        input.token,
        input.tokenHash,
        input.platform,
        input.deviceName ?? null,
        input.browser ?? null,
        input.os ?? null,
      ],
    );

    return result.rows[0] ?? null;
  }

  async deactivatePushToken(userId: string, tokenId: string, queryable: Queryable = this.database) {
    const result = await queryable.query<Pick<PushTokenRecord, "id">>(
      `UPDATE push_tokens
          SET is_active = FALSE,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND user_id = $2
       RETURNING id`,
      [tokenId, userId],
    );

    return result.rows[0] ?? null;
  }

  async deactivatePushTokenByHash(tokenHash: string, queryable: Queryable = this.database) {
    await queryable.query(
      `UPDATE push_tokens
          SET is_active = FALSE,
              updated_at = CURRENT_TIMESTAMP
        WHERE token_hash = $1`,
      [tokenHash],
    );
  }

  async listActivePushTokens(userId: string, queryable: Queryable = this.database) {
    const result = await queryable.query<PushTokenRecord>(
      `SELECT id,
              user_id AS "userId",
              token,
              token_hash AS "tokenHash",
              platform,
              device_name AS "deviceName",
              browser,
              os,
              is_active AS "isActive",
              last_used_at AS "lastUsedAt",
              created_at AS "createdAt",
              updated_at AS "updatedAt"
         FROM push_tokens
        WHERE user_id = $1
          AND is_active = TRUE
        ORDER BY last_used_at DESC`,
      [userId],
    );

    return result.rows;
  }

  async createPushDelivery(
    input: { id: string; notificationId: string; userId: string },
    queryable: Queryable = this.database,
  ) {
    await queryable.query(
      `INSERT INTO push_notification_deliveries (id, notification_id, user_id)
       VALUES ($1, $2, $3)`,
      [input.id, input.notificationId, input.userId],
    );
  }

  async listPendingPushDeliveries(limit: number, queryable: Queryable = this.database) {
    const result = await queryable.query<PushDeliveryRecord>(
      `SELECT pnd.id,
              pnd.notification_id AS "notificationId",
              pnd.user_id AS "userId",
              n.type,
              n.title,
              n.body,
              n.payload
         FROM push_notification_deliveries pnd
         JOIN notifications n
           ON n.id = pnd.notification_id
        WHERE pnd.status = 'pending'
          AND pnd.next_attempt_at <= CURRENT_TIMESTAMP
        ORDER BY pnd.created_at ASC
        LIMIT $1`,
      [limit],
    );

    return result.rows;
  }

  async markPushDeliverySent(deliveryId: string, queryable: Queryable = this.database) {
    await queryable.query(
      `UPDATE push_notification_deliveries
          SET status = 'sent',
              sent_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $1`,
      [deliveryId],
    );
  }

  async markPushDeliverySkipped(
    deliveryId: string,
    reason: string,
    queryable: Queryable = this.database,
  ) {
    await queryable.query(
      `UPDATE push_notification_deliveries
          SET status = 'skipped',
              last_error_code = $2,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $1`,
      [deliveryId, reason],
    );
  }

  async markPushDeliveryFailed(
    deliveryId: string,
    errorCode: string,
    queryable: Queryable = this.database,
  ) {
    await queryable.query(
      `UPDATE push_notification_deliveries
          SET attempts = attempts + 1,
              status = CASE WHEN attempts + 1 >= 5 THEN 'failed' ELSE 'pending' END,
              next_attempt_at = CURRENT_TIMESTAMP + INTERVAL '5 minutes',
              last_error_code = $2,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $1`,
      [deliveryId, errorCode],
    );
  }
}
