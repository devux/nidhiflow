import { z } from "zod";

export const notificationIdSchema = z.object({
  notificationId: z.string().trim().min(1),
});

export const updateNotificationPreferencesBodySchema = z
  .object({
    billRemindersEnabled: z.boolean().optional(),
    budgetAlertsEnabled: z.boolean().optional(),
    emailEnabled: z.boolean().optional(),
    flowLaunchEnabled: z.boolean().optional(),
    goalUpdatesEnabled: z.boolean().optional(),
    inAppEnabled: z.boolean().optional(),
    timezone: z.string().trim().min(1).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided.");

export const createFlowLaunchSubscriptionBodySchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
});

export const unsubscribeFlowLaunchParamsSchema = z.object({
  token: z.string().trim().min(20).max(255),
});

export type UpdateNotificationPreferencesBody = z.infer<
  typeof updateNotificationPreferencesBodySchema
>;
export type CreateFlowLaunchSubscriptionBody = z.infer<
  typeof createFlowLaunchSubscriptionBodySchema
>;
