import { z } from "zod";

const frontendEnvironmentSchema = z.object({
  ANDROID_NOTIFICATION_TRANSACTIONS_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  DIRECT_UPI_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  FLOW_AI_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  NIDHIFLOW_API_BASE_URL: z.string().url(),
});

export type FrontendEnvironment = z.infer<typeof frontendEnvironmentSchema>;

function readDirectUpiFlag() {
  return typeof __DIRECT_UPI_ENABLED__ === "undefined" ? "false" : __DIRECT_UPI_ENABLED__;
}

function readAndroidNotificationTransactionsFlag() {
  return typeof __ANDROID_NOTIFICATION_TRANSACTIONS_ENABLED__ === "undefined"
    ? "false"
    : __ANDROID_NOTIFICATION_TRANSACTIONS_ENABLED__;
}

export function parseFrontendEnvironment(
  environment: Record<string, unknown>,
): FrontendEnvironment {
  const result = frontendEnvironmentSchema.safeParse(environment);

  if (!result.success) {
    throw new Error("Invalid frontend environment configuration.");
  }

  return result.data;
}

export const environment = parseFrontendEnvironment({
  ANDROID_NOTIFICATION_TRANSACTIONS_ENABLED: readAndroidNotificationTransactionsFlag(),
  DIRECT_UPI_ENABLED: readDirectUpiFlag(),
  FLOW_AI_ENABLED: process.env.FLOW_AI_ENABLED,
  NIDHIFLOW_API_BASE_URL: process.env.NIDHIFLOW_API_BASE_URL,
});
