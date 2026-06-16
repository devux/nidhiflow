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

export const budgetIdSchema = z.object({
  budgetId: z.string().trim().min(1),
});

export const createBudgetBodySchema = z.object({
  categoryId: z.string().trim().min(1).nullable().optional(),
  currency: currencySchema,
  limitAmount: moneySchema,
  periodEnd: dateSchema,
  periodStart: dateSchema,
});

export const updateBudgetBodySchema = z
  .object({
    categoryId: z.string().trim().min(1).nullable().optional(),
    currency: currencySchema.optional(),
    limitAmount: moneySchema.optional(),
    periodEnd: dateSchema.optional(),
    periodStart: dateSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided.");

export type CreateBudgetBody = z.infer<typeof createBudgetBodySchema>;
export type UpdateBudgetBody = z.infer<typeof updateBudgetBodySchema>;
