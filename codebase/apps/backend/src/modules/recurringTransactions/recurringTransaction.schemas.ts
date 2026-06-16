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

export const recurringTransactionIdSchema = z.object({
  recurringTransactionId: z.string().trim().min(1),
});

export const createRecurringTransactionBodySchema = z
  .object({
    accountId: z.string().trim().min(1),
    amount: moneySchema,
    categoryId: z.string().trim().min(1).optional(),
    destinationAccountId: z.string().trim().min(1).optional(),
    name: z.string().trim().min(1).max(80),
    nextOccurrence: dateSchema.optional(),
    note: z.string().trim().max(100).optional(),
    scheduleRule: z.string().trim().min(1),
    timezone: z.string().trim().min(1),
    type: z.enum(["income", "expense", "transfer"]),
  })
  .superRefine((value, context) => {
    if (value.type === "transfer") {
      if (!value.destinationAccountId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Destination account is required for transfers.",
          path: ["destinationAccountId"],
        });
      }

      if (value.categoryId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Transfer transactions must not have a category.",
          path: ["categoryId"],
        });
      }
    }
  });

export const updateRecurringTransactionBodySchema = z
  .object({
    accountId: z.string().trim().min(1).optional(),
    amount: moneySchema.optional(),
    categoryId: z.string().trim().min(1).optional(),
    destinationAccountId: z.string().trim().min(1).optional(),
    isActive: z.boolean().optional(),
    name: z.string().trim().min(1).max(80).optional(),
    nextOccurrence: dateSchema.optional(),
    note: z.string().trim().max(100).optional(),
    scheduleRule: z.string().trim().min(1).optional(),
    timezone: z.string().trim().min(1).optional(),
    type: z.enum(["income", "expense", "transfer"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided.");

export type CreateRecurringTransactionBody = z.infer<typeof createRecurringTransactionBodySchema>;
export type UpdateRecurringTransactionBody = z.infer<typeof updateRecurringTransactionBodySchema>;
