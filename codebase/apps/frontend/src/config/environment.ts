import { z } from "zod";

const frontendEnvironmentSchema = z.object({
  FLOW_AI_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  NIDHIFLOW_API_BASE_URL: z.string().url(),
});

export type FrontendEnvironment = z.infer<typeof frontendEnvironmentSchema>;

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
  FLOW_AI_ENABLED: process.env.FLOW_AI_ENABLED,
  NIDHIFLOW_API_BASE_URL: process.env.NIDHIFLOW_API_BASE_URL,
});
