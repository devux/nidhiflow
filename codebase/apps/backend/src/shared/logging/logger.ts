import pino from "pino";

import type { Environment } from "../../app/config/environment.js";

export function createLogger(environment: Environment) {
  return pino({
    level: environment.LOG_LEVEL,
    timestamp: pino.stdTimeFunctions.isoTime,
    base: {
      environment: environment.APP_ENV,
      service: "nidhiflow-backend",
    },
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "password",
        "token",
        "DATABASE_URL",
      ],
      censor: "[REDACTED]",
    },
  });
}

export type Logger = ReturnType<typeof createLogger>;
