import { z } from "zod";

const currencySchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .refine((value) => /^[A-Z]{3}$/.test(value), "Currency must be a valid ISO 4217 code.");

const timezoneSchema = z
  .string()
  .trim()
  .refine((value) => {
    try {
      Intl.DateTimeFormat("en-US", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "Timezone must be valid.");

export const workspaceParamsSchema = z.object({
  workspaceId: z.string().trim().min(1),
});

export const workspaceMemberParamsSchema = workspaceParamsSchema.extend({
  userId: z.string().trim().min(1),
});

export const workspaceInvitationParamsSchema = z.object({
  token: z.string().trim().min(20).max(255),
});

export const createWorkspaceBodySchema = z.object({
  name: z.string().trim().min(1).max(80),
  reportingCurrency: currencySchema,
  timezone: timezoneSchema,
  type: z.enum(["personal", "family"]),
});

export const updateWorkspaceBodySchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    reportingCurrency: currencySchema.optional(),
    timezone: timezoneSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided.");

export const createWorkspaceInvitationBodySchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
});

export type CreateWorkspaceBody = z.infer<typeof createWorkspaceBodySchema>;
export type UpdateWorkspaceBody = z.infer<typeof updateWorkspaceBodySchema>;
export type CreateWorkspaceInvitationBody = z.infer<typeof createWorkspaceInvitationBodySchema>;
