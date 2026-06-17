import type { Request, Response } from "express";

import { sendSuccess } from "../../app/http.js";
import type { AuthContext } from "../../app/middleware/authenticate.js";
import type { NotificationService } from "./notification.service.js";
import type {
  CreateFlowLaunchSubscriptionBody,
  UpdateNotificationPreferencesBody,
} from "./notification.schemas.js";

function getAuthContext(response: Response) {
  return response.locals.auth as AuthContext;
}

export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  listNotifications = async (_request: Request, response: Response) => {
    const auth = getAuthContext(response);
    const notifications = await this.service.listNotifications(auth.userId);

    sendSuccess(response, {
      data: notifications,
      message: "Notifications retrieved successfully.",
    });
  };

  markRead = async (request: Request<{ notificationId: string }>, response: Response) => {
    const auth = getAuthContext(response);
    const notification = await this.service.markRead(auth.userId, request.params.notificationId);

    sendSuccess(response, {
      data: notification,
      message: "Notification marked read successfully.",
    });
  };

  markAllRead = async (_request: Request, response: Response) => {
    const auth = getAuthContext(response);
    const result = await this.service.markAllRead(auth.userId);

    sendSuccess(response, {
      data: result,
      message: "Notifications marked read successfully.",
    });
  };

  getPreferences = async (_request: Request, response: Response) => {
    const auth = getAuthContext(response);
    const preferences = await this.service.getPreferences(auth.userId);

    sendSuccess(response, {
      data: preferences,
      message: "Notification preferences retrieved successfully.",
    });
  };

  updatePreferences = async (
    request: Request<never, never, UpdateNotificationPreferencesBody>,
    response: Response,
  ) => {
    const auth = getAuthContext(response);
    const preferences = await this.service.updatePreferences(auth.userId, request.body);

    sendSuccess(response, {
      data: preferences,
      message: "Notification preferences updated successfully.",
    });
  };

  createFlowLaunchSubscription = async (
    request: Request<never, never, CreateFlowLaunchSubscriptionBody>,
    response: Response,
  ) => {
    const subscription = await this.service.createFlowLaunchSubscription(request.body);

    sendSuccess(response, {
      data: subscription,
      message: "Flow launch subscription created successfully.",
      status: 201,
    });
  };

  unsubscribeFlowLaunch = async (request: Request<{ token: string }>, response: Response) => {
    const subscription = await this.service.unsubscribeFlowLaunch(request.params.token);

    sendSuccess(response, {
      data: subscription,
      message: "Flow launch subscription removed successfully.",
    });
  };
}
