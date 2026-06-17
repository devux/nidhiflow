import { Router } from "express";

import type { Environment } from "../../app/config/environment.js";
import { requireAuth } from "../../app/middleware/authenticate.js";
import { validate } from "../../app/middleware/validate.js";
import type { Database } from "../../shared/database/database.js";
import { NotificationController } from "./notification.controller.js";
import { NotificationService } from "./notification.service.js";
import {
  createFlowLaunchSubscriptionBodySchema,
  notificationIdSchema,
  unsubscribeFlowLaunchParamsSchema,
  updateNotificationPreferencesBodySchema,
} from "./notification.schemas.js";

export function createNotificationsRouter({
  database,
  environment,
}: {
  database: Database;
  environment: Environment;
}) {
  const router = Router();
  const controller = new NotificationController(new NotificationService(database, environment));

  router.use(requireAuth({ database, environment }));
  router.get("/", controller.listNotifications);
  router.patch(
    "/:notificationId/read",
    validate({ params: notificationIdSchema }),
    controller.markRead,
  );
  router.post("/read-all", controller.markAllRead);

  return router;
}

export function createNotificationPreferencesRouter({
  database,
  environment,
}: {
  database: Database;
  environment: Environment;
}) {
  const router = Router();
  const controller = new NotificationController(new NotificationService(database, environment));

  router.use(requireAuth({ database, environment }));
  router.get("/", controller.getPreferences);
  router.patch(
    "/",
    validate({ body: updateNotificationPreferencesBodySchema }),
    controller.updatePreferences,
  );

  return router;
}

export function createFlowLaunchSubscriptionsRouter({
  database,
  environment,
}: {
  database: Database;
  environment: Environment;
}) {
  const router = Router();
  const controller = new NotificationController(new NotificationService(database, environment));

  router.post(
    "/",
    validate({ body: createFlowLaunchSubscriptionBodySchema }),
    controller.createFlowLaunchSubscription,
  );
  router.delete(
    "/:token",
    validate({ params: unsubscribeFlowLaunchParamsSchema }),
    controller.unsubscribeFlowLaunch,
  );

  return router;
}
