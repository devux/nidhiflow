import { z } from "zod";

const currencySchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .refine((value) => /^[A-Z]{3}$/.test(value), "Currency must be a valid ISO 4217 code.");

const moneySchema = z.object({
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Amount must be a decimal string with up to 4 places.")
    .refine((value) => Number(value) > 0, "Amount must be greater than zero."),
  currency: currencySchema,
});

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD.");

export const workspaceIdSchema = z.object({
  workspaceId: z.string().trim().min(1),
});

export const goalIdSchema = z.object({
  goalId: z.string().trim().min(1),
});

export const contributionIdSchema = z.object({
  contributionId: z.string().trim().min(1),
});

export const createGoalBodySchema = z.object({
  currency: currencySchema,
  name: z.string().trim().min(1).max(80),
  targetAmount: moneySchema,
  targetDate: dateSchema.optional(),
  type: z.enum(["savings", "debt"]),
});

export const updateGoalBodySchema = z
  .object({
    currency: currencySchema.optional(),
    name: z.string().trim().min(1).max(80).optional(),
    status: z.enum(["active", "completed", "archived"]).optional(),
    targetAmount: moneySchema.optional(),
    targetDate: dateSchema.optional(),
    type: z.enum(["savings", "debt"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided.");

export const createContributionBodySchema = z.object({
  amount: moneySchema,
  contributionDate: dateSchema,
  transactionId: z.string().trim().min(1).optional(),
});

export type CreateGoalBody = z.infer<typeof createGoalBodySchema>;
export type UpdateGoalBody = z.infer<typeof updateGoalBodySchema>;
export type CreateContributionBody = z.infer<typeof createContributionBodySchema>;
