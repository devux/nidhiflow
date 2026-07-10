import type { Environment } from "../../app/config/environment.js";
import type { Database } from "../../shared/database/database.js";
import { AppError } from "../../shared/errors/appError.js";
import { createId } from "../../shared/security/ids.js";
import { createOpaqueToken, hashToken } from "../../shared/security/tokens.js";
import { AuthRepository } from "../auth/auth.repository.js";
import { NotificationRepository } from "./notification.repository.js";
import { PushNotificationSender, isInvalidTokenError } from "./pushNotification.sender.js";
import type {
  CreateFlowLaunchSubscriptionBody,
  PushTokenBody,
  UpdateNotificationPreferencesBody,
} from "./notification.schemas.js";

function notFound() {
  return new AppError({
    code: "NOT_FOUND",
    message: "The requested resource was not found.",
    status: 404,
  });
}

export class NotificationService {
  private readonly repository: NotificationRepository;
  private readonly authRepository: AuthRepository;
  private readonly pushSender: PushNotificationSender;

  constructor(
    private readonly database: Database,
    private readonly environment: Environment,
  ) {
    this.repository = new NotificationRepository(database);
    this.authRepository = new AuthRepository(database);
    this.pushSender = new PushNotificationSender(environment);
  }

  async listNotifications(userId: string) {
    return this.repository.listNotifications(userId);
  }

  async markRead(userId: string, notificationId: string) {
    const notification = await this.repository.markRead(userId, notificationId);

    if (!notification) {
      throw notFound();
    }

    return notification;
  }

  async markAllRead(userId: string) {
    const count = await this.repository.markAllRead(userId);
    return { markedRead: count };
  }

  async getPreferences(userId: string) {
    const user = await this.authRepository.findUserById(userId);

    if (!user) {
      throw notFound();
    }

    return this.repository.ensurePreferences(userId, user.timezone);
  }

  async updatePreferences(userId: string, input: UpdateNotificationPreferencesBody) {
    const user = await this.authRepository.findUserById(userId);

    if (!user) {
      throw notFound();
    }

    await this.repository.ensurePreferences(userId, user.timezone);
    return this.repository.updatePreferences(userId, input);
  }

  async registerPushToken(userId: string, input: PushTokenBody) {
    const user = await this.authRepository.findUserById(userId);

    if (!user) {
      throw notFound();
    }

    const tokenInput = {
      id: createId("pht"),
      platform: input.platform,
      token: input.token,
      tokenHash: hashToken(input.token),
      userId,
      ...(input.browser ? { browser: input.browser } : {}),
      ...(input.deviceName ? { deviceName: input.deviceName } : {}),
      ...(input.os ? { os: input.os } : {}),
    };
    const token = await this.repository.upsertPushToken(tokenInput);

    if (!token) {
      throw notFound();
    }

    return {
      browser: token.browser,
      deviceName: token.deviceName,
      id: token.id,
      isActive: token.isActive,
      os: token.os,
      platform: token.platform,
    };
  }

  async unregisterPushToken(userId: string, tokenId: string) {
    const token = await this.repository.deactivatePushToken(userId, tokenId);

    if (!token) {
      throw notFound();
    }

    return { deactivated: true };
  }

  async sendTestPush(userId: string) {
    const preferences = await this.getPreferences(userId);
    if (!preferences?.pushEnabled) {
      return {
        configured: this.pushSender.isConfigured,
        sent: 0,
        skipped: "push_disabled",
      };
    }

    if (isQuietHours(preferences)) {
      return {
        configured: this.pushSender.isConfigured,
        sent: 0,
        skipped: "quiet_hours",
      };
    }

    const tokens = await this.repository.listActivePushTokens(userId);
    if (!this.pushSender.isConfigured || tokens.length === 0) {
      return {
        configured: this.pushSender.isConfigured,
        sent: 0,
        skipped: tokens.length === 0 ? "no_active_tokens" : "fcm_not_configured",
      };
    }

    const result = await this.pushSender.sendToTokens(tokens, {
      body: "Test alert sent.",
      data: { path: "/notifications", type: "test" },
      title: "NidhiFlow",
    });

    await Promise.all(
      result.failed
        .filter((failure) => isInvalidTokenError(failure.errorCode))
        .map((failure) => this.repository.deactivatePushTokenByHash(failure.tokenHash)),
    );

    return {
      configured: true,
      sent: result.sent,
      skipped: result.failed.length,
    };
  }

  async createFlowLaunchSubscription(input: CreateFlowLaunchSubscriptionBody) {
    const token = createOpaqueToken(48);
    const subscription = await this.repository.createFlowLaunchSubscription({
      email: input.email,
      id: createId("fls"),
      tokenHash: hashToken(token),
      userId: null,
    });

    return {
      ...subscription,
      ...(this.environment.APP_ENV !== "production" ? { debugToken: token } : {}),
    };
  }

  async unsubscribeFlowLaunch(token: string) {
    const subscription = await this.repository.unsubscribeFlowLaunch(hashToken(token));

    if (!subscription) {
      throw notFound();
    }

    return subscription;
  }

  async dispatchPendingPushDeliveries(limit = 25) {
    const deliveries = await this.repository.listPendingPushDeliveries(limit);
    let sent = 0;

    for (const delivery of deliveries) {
      try {
        const preferences = await this.getPreferences(delivery.userId);
        if (!preferences?.pushEnabled) {
          await this.repository.markPushDeliverySkipped(delivery.id, "push_disabled");
          continue;
        }

        if (isCategoryDisabled(delivery.payload, preferences)) {
          await this.repository.markPushDeliverySkipped(delivery.id, "category_disabled");
          continue;
        }

        if (!isSecurityNotification(delivery) && isQuietHours(preferences)) {
          await this.repository.markPushDeliverySkipped(delivery.id, "quiet_hours");
          continue;
        }

        const tokens = await this.repository.listActivePushTokens(delivery.userId);
        if (!this.pushSender.isConfigured || tokens.length === 0) {
          await this.repository.markPushDeliverySkipped(
            delivery.id,
            tokens.length === 0 ? "no_active_tokens" : "fcm_not_configured",
          );
          continue;
        }

        const result = await this.pushSender.sendToTokens(tokens, {
          body: delivery.body,
          data: stringifyPushData({
            notificationId: delivery.notificationId,
            path: typeof delivery.payload.path === "string" ? delivery.payload.path : undefined,
            resourceType:
              typeof delivery.payload.resourceType === "string"
                ? delivery.payload.resourceType
                : undefined,
            type: delivery.type,
          }),
          title: delivery.title,
        });

        await Promise.all(
          result.failed
            .filter((failure) => isInvalidTokenError(failure.errorCode))
            .map((failure) => this.repository.deactivatePushTokenByHash(failure.tokenHash)),
        );

        if (result.sent > 0) {
          sent += result.sent;
          await this.repository.markPushDeliverySent(delivery.id);
        } else {
          await this.repository.markPushDeliveryFailed(
            delivery.id,
            result.failed[0]?.errorCode ?? "push_send_failed",
          );
        }
      } catch {
        await this.repository.markPushDeliveryFailed(delivery.id, "push_send_failed");
      }
    }

    return { deliveries: deliveries.length, sent };
  }
}

type Preferences = NonNullable<Awaited<ReturnType<NotificationService["getPreferences"]>>>;

function isCategoryDisabled(payload: Record<string, unknown>, preferences: Preferences) {
  switch (payload.resourceType) {
    case "budget":
      return !preferences.budgetAlertsEnabled;
    case "goal":
    case "liability":
      return !preferences.goalUpdatesEnabled;
    default:
      return false;
  }
}

function isSecurityNotification(delivery: { type: string }) {
  return delivery.type === "security_alert";
}

function isQuietHours(preferences: Preferences) {
  if (!preferences.quietHoursEnabled) return false;

  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    timeZone: preferences.timezone,
  }).formatToParts(new Date());
  const currentHour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const currentMinute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  const currentMinutes = currentHour * 60 + currentMinute;
  const [startHour, startMinute] = preferences.quietHoursStart.split(":").map(Number);
  const [endHour, endMinute] = preferences.quietHoursEnd.split(":").map(Number);
  const startMinutes = (startHour ?? 0) * 60 + (startMinute ?? 0);
  const endMinutes = (endHour ?? 0) * 60 + (endMinute ?? 0);

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

function stringifyPushData(data: Record<string, string | undefined>) {
  return Object.fromEntries(
    Object.entries(data).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}
