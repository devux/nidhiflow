import type { Environment } from "../../app/config/environment.js";
import type { Database } from "../../shared/database/database.js";
import type { Logger } from "../../shared/logging/logger.js";
import { NotificationService } from "./notification.service.js";

export function startPushNotificationWorker({
  database,
  environment,
  logger,
}: {
  database: Database;
  environment: Environment;
  logger: Logger;
}) {
  const service = new NotificationService(database, environment);
  let running = false;

  async function runOnce() {
    if (running) return;
    running = true;

    try {
      const result = await service.dispatchPendingPushDeliveries();
      if (result.deliveries > 0) {
        logger.info(result, "Push notification deliveries processed");
      }
    } catch (error) {
      logger.warn({ error }, "Push notification delivery worker failed");
    } finally {
      running = false;
    }
  }

  const interval = setInterval(() => {
    void runOnce();
  }, 30_000);
  void runOnce();

  return {
    stop() {
      clearInterval(interval);
    },
  };
}
