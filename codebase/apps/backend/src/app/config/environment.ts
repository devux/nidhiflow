import { z } from "zod";

const booleanString = z.enum(["true", "false"]).transform((value) => value === "true");

const environmentSchema = z.object({
  APP_ENV: z.enum(["development", "test", "staging", "production"]),
  PORT: z.coerce.number().int().min(1).max(65_535),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]),
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  DATABASE_SSL: booleanString,
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

export type Environment = z.infer<typeof environmentSchema>;

export function parseEnvironment(environment: NodeJS.ProcessEnv): Environment {
  const result = environmentSchema.safeParse(environment);

  if (!result.success) {
    throw new Error("Invalid backend environment configuration.");
  }

  return result.data;
}
