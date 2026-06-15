import { z } from "zod";

const frontendEnvironmentSchema = z.object({
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
  NIDHIFLOW_API_BASE_URL: process.env.NIDHIFLOW_API_BASE_URL,
});
