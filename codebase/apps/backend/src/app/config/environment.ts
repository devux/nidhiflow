import crypto from "node:crypto";

import { z } from "zod";

const booleanString = z.enum(["true", "false"]).transform((value) => value === "true");

const environmentSchema = z
  .object({
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
    APP_PUBLIC_URL: z.string().url().default("http://localhost:5173"),
    EMAIL_DELIVERY_PROVIDER: z.enum(["none", "resend", "gmail"]).default("none"),
    EMAIL_FROM: z.string().trim().min(3).optional(),
    EMAIL_HOST: z.string().trim().min(1).optional(),
    EMAIL_PASSWORD: z.string().trim().min(1).optional(),
    EMAIL_PORT: z.coerce.number().int().min(1).max(65_535).optional(),
    EMAIL_USER: z.string().trim().min(1).optional(),
    RESEND_API_KEY: z.string().trim().min(1).optional(),
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
  })
  .superRefine((value, context) => {
    if (value.EMAIL_DELIVERY_PROVIDER === "resend" && !value.RESEND_API_KEY) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "RESEND_API_KEY is required when EMAIL_DELIVERY_PROVIDER=resend.",
        path: ["RESEND_API_KEY"],
      });
    }

    if (value.EMAIL_DELIVERY_PROVIDER !== "none" && !value.EMAIL_FROM) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "EMAIL_FROM is required when email delivery is enabled.",
        path: ["EMAIL_FROM"],
      });
    }

    if (value.EMAIL_DELIVERY_PROVIDER === "gmail") {
      for (const key of ["EMAIL_HOST", "EMAIL_PASSWORD", "EMAIL_PORT", "EMAIL_USER"] as const) {
        if (!value[key]) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${key} is required when EMAIL_DELIVERY_PROVIDER=gmail.`,
            path: [key],
          });
        }
      }
    }
  });

export type Environment = z.infer<typeof environmentSchema> & {
  JWT_ACCESS_SECRET: string;
};

function formatEnvironmentIssuePaths(error: z.ZodError) {
  const paths = error.issues.map((issue) => issue.path.join(".") || "environment");
  const uniquePaths = [...new Set(paths)];

  return uniquePaths.sort().join(", ");
}

export function parseEnvironment(environment: NodeJS.ProcessEnv): Environment {
  const result = environmentSchema.safeParse(environment);

  if (!result.success) {
    throw new Error(
      `Invalid backend environment configuration: ${formatEnvironmentIssuePaths(result.error)}.`,
    );
  }

  if (result.data.JWT_ACCESS_SECRET) {
    return result.data as Environment;
  }

  if (result.data.APP_ENV === "staging" || result.data.APP_ENV === "production") {
    throw new Error("Invalid backend environment configuration: JWT_ACCESS_SECRET.");
  }

  return {
    ...result.data,
    JWT_ACCESS_SECRET: crypto
      .createHash("sha256")
      .update(`${result.data.APP_ENV}:${result.data.DATABASE_URL}`)
      .digest("hex"),
  };
}
