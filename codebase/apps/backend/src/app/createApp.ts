import crypto from "node:crypto";

import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";

import type { Environment } from "./config/environment.js";
import type { Database } from "../shared/database/database.js";
import type { Logger } from "../shared/logging/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestContext } from "./middleware/requestContext.js";
import { sendError } from "./http.js";
import { createApiRoutes } from "./routes.js";
import {
  createSwaggerInitializer,
  createSwaggerUiHtml,
  swaggerUiAssetsPath,
} from "../modules/openapi/swaggerUi.js";

interface AppDependencies {
  database: Database;
  environment: Environment;
  logger: Logger;
}

function getAllowedOrigins(environment: Environment) {
  const origins = new Set(environment.CORS_ORIGINS);

  if (environment.APP_ENV === "production") {
    origins.add("https://localhost");
  }

  return [...origins];
}

export function createApp({ database, environment, logger }: AppDependencies) {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(requestContext);
  app.use(
    cors({
      origin: getAllowedOrigins(environment),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(
    pinoHttp({
      logger,
      genReqId: (request, response) => {
        const requestId = response.locals.requestId as string | undefined;

        if (requestId) {
          return requestId;
        }

        const generated =
          typeof request.id === "string" && request.id.length > 0
            ? request.id
            : crypto.randomUUID();
        response.locals.requestId = generated;
        response.setHeader("X-Request-Id", generated);
        return generated;
      },
      autoLogging: {
        ignore: (request) => request.url === "/health/live",
      },
      customProps: (_request, response) => ({
        requestId: response.locals.requestId as string | undefined,
      }),
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

  app.get("/api-docs", (_request, response) => {
    response.type("html").status(200).send(createSwaggerUiHtml());
  });

  app.get("/api-docs/", (_request, response) => {
    response.type("html").status(200).send(createSwaggerUiHtml());
  });

  app.get("/api-docs/swagger-initializer.js", (_request, response) => {
    response.type("application/javascript").status(200).send(createSwaggerInitializer());
  });

  app.use("/api-docs", express.static(swaggerUiAssetsPath));

  app.use(
    "/api/v1",
    createApiRoutes({
      database,
      environment,
      feedbackRateLimitMax: environment.FEEDBACK_RATE_LIMIT_MAX,
      feedbackRateLimitWindowMs: environment.API_RATE_LIMIT_WINDOW_MS,
    }),
  );

  app.use((_request, response) => {
    sendError(response, {
      code: "NOT_FOUND",
      message: "The requested resource was not found.",
      status: 404,
    });
  });

  app.use(errorHandler);

  return app;
}
