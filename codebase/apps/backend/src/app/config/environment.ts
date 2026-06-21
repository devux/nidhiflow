import crypto from "node:crypto";

import { z } from "zod";

const booleanString = z.enum(["true", "false"]).transform((value) => value === "true");

const environmentSchema = z.object({
  APP_ENV: z.enum(["development", "test", "staging", "production"]),
  PORT: z.coerce.number().int().min(1).max(65_535),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]),
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  DATABASE_SSL: booleanString,
  API_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1).default(60_000),
  API_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(100),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(10),
  FEEDBACK_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(5),
  FLOW_AI_ENABLED: booleanString.default("false"),
  FLOW_AI_TIMEOUT_MS: z.coerce.number().int().min(5_000).max(120_000).default(60_000),
  FLOW_MODEL: z.string().trim().min(1).default("llama3.2:3b"),
  OLLAMA_BASE_URL: z.string().url().default("http://127.0.0.1:11434"),
  JWT_ACCESS_SECRET: z.string().min(32).optional(),
  JWT_ACCESS_ISSUER: z.string().min(1).default("nidhiflow.local"),
  JWT_ACCESS_AUDIENCE: z.string().min(1).default("nidhiflow-app"),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().min(60).default(900),
  REFRESH_SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  EMAIL_VERIFICATION_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(24),
  PASSWORD_RESET_TTL_HOURS: z.coerce.number().int().min(1).max(48).default(2),
  CORS_ORIGINS: z
    .string()
    .min(1)
    .transform((value, context) => {
      const origins = value.split(",").map((origin) => origin.trim());

      for (const origin of origins) {
        if (!z.string().url().safeParse(origin).success) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "CORS_ORIGINS contains an invalid URL.",
          });
          return z.NEVER;
        }
      }

      return origins;
    }),
});

export type Environment = z.infer<typeof environmentSchema> & {
  JWT_ACCESS_SECRET: string;
};

export function parseEnvironment(environment: NodeJS.ProcessEnv): Environment {
  const result = environmentSchema.safeParse(environment);

  if (!result.success) {
    throw new Error("Invalid backend environment configuration.");
  }

  if (result.data.JWT_ACCESS_SECRET) {
    return result.data as Environment;
  }

  if (result.data.APP_ENV === "staging" || result.data.APP_ENV === "production") {
    throw new Error("Invalid backend environment configuration.");
  }

  return {
    ...result.data,
    JWT_ACCESS_SECRET: crypto
      .createHash("sha256")
      .update(`${result.data.APP_ENV}:${result.data.DATABASE_URL}`)
      .digest("hex"),
  };
}
