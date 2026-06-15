import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";

import type { Environment } from "./config/environment.js";
import type { Database } from "../shared/database/database.js";
import type { Logger } from "../shared/logging/logger.js";

interface AppDependencies {
  database: Database;
  environment: Environment;
  logger: Logger;
}

export function createApp({ database, environment, logger }: AppDependencies) {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: environment.CORS_ORIGINS,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (request) => request.url === "/health/live",
      },
      redact: ["req.headers.authorization", "req.headers.cookie"],
    }),
  );

  app.get("/health/live", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  app.get("/health/ready", async (_request, response) => {
    try {
      const ready = await database.isReady();

      if (!ready) {
        response.status(503).json({ status: "unavailable" });
        return;
      }

      response.status(200).json({ status: "ready" });
    } catch {
      response.status(503).json({ status: "unavailable" });
    }
  });

  app.use((_request, response) => {
    response.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "The requested resource was not found.",
      },
    });
  });

  return app;
}
