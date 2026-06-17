import type { Environment } from "../../app/config/environment.js";
import type { Database } from "../../shared/database/database.js";
import { AppError } from "../../shared/errors/appError.js";
import { createId } from "../../shared/security/ids.js";
import { createOpaqueToken, hashToken } from "../../shared/security/tokens.js";
import { AuthRepository } from "../auth/auth.repository.js";
import { NotificationRepository } from "./notification.repository.js";
import type {
  CreateFlowLaunchSubscriptionBody,
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

  constructor(
    private readonly database: Database,
    private readonly environment: Environment,
  ) {
    this.repository = new NotificationRepository(database);
    this.authRepository = new AuthRepository(database);
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
}
