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
    monthlyReportsEnabled: z.boolean().optional(),
    pushEnabled: z.boolean().optional(),
    quietHoursEnabled: z.boolean().optional(),
    quietHoursEnd: z
      .string()
      .trim()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    quietHoursStart: z
      .string()
      .trim()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    recurringRemindersEnabled: z.boolean().optional(),
    securityAlertsEnabled: z.boolean().optional(),
    timezone: z.string().trim().min(1).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided.");

export const pushTokenBodySchema = z.object({
  browser: z.string().trim().min(1).max(80).optional(),
  deviceName: z.string().trim().min(1).max(120).optional(),
  os: z.string().trim().min(1).max(80).optional(),
  platform: z.enum(["android", "web"]),
  token: z.string().trim().min(20).max(4096),
});

export const pushTokenParamsSchema = z.object({
  tokenId: z.string().trim().min(1),
});

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
export type PushTokenBody = z.infer<typeof pushTokenBodySchema>;
export type CreateFlowLaunchSubscriptionBody = z.infer<
  typeof createFlowLaunchSubscriptionBodySchema
>;
