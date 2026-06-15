import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

import { createApp } from "./app/createApp.js";
import { parseEnvironment } from "./app/config/environment.js";
import { createDatabase } from "./shared/database/database.js";
import { createLogger } from "./shared/logging/logger.js";

dotenv.config({
  path: fileURLToPath(new URL("../../../.env", import.meta.url)),
});

const environment = parseEnvironment(process.env);
const logger = createLogger(environment);
const database = createDatabase(environment);
const app = createApp({ database, environment, logger });

const server = app.listen(environment.PORT, "0.0.0.0", () => {
  logger.info({ port: environment.PORT }, "Backend server started");
});

let shutdownStarted = false;

function shutdown(signal: string) {
  if (shutdownStarted) {
    return;
  }

  shutdownStarted = true;
  logger.info({ signal }, "Backend server shutting down");

  server.close(async (error) => {
    if (error) {
      logger.error({ error }, "HTTP server shutdown failed");
      process.exitCode = 1;
    }

    try {
      await database.close();
    } catch (error) {
      logger.error({ error }, "Database shutdown failed");
      process.exitCode = 1;
    }
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
