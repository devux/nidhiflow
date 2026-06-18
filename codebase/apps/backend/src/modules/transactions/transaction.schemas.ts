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

const transactionTypeSchema = z.enum(["income", "expense", "transfer"]);

export const workspaceIdSchema = z.object({
  workspaceId: z.string().trim().min(1),
});

export const transactionIdSchema = z.object({
  transactionId: z.string().trim().min(1),
});

export const createTransactionBodySchema = z
  .object({
    accountId: z.string().trim().min(1),
    categoryId: z.string().trim().min(1).optional(),
    destinationAccountId: z.string().trim().min(1).optional(),
    money: moneySchema,
    note: z.string().trim().max(100).optional(),
    transactionDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Transaction date must be YYYY-MM-DD."),
    type: transactionTypeSchema,
  })
  .superRefine((value, context) => {
    if ((value.type === "income" || value.type === "expense") && !value.categoryId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Category is required for income and expense transactions.",
        path: ["categoryId"],
      });
    }

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

export const updateTransactionBodySchema = createTransactionBodySchema;

export const transactionListQuerySchema = z.object({
  accountId: z.string().trim().min(1).optional(),
  categoryId: z.string().trim().min(1).optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  type: transactionTypeSchema.optional(),
});

export type CreateTransactionBody = z.infer<typeof createTransactionBodySchema>;
export type UpdateTransactionBody = z.infer<typeof updateTransactionBodySchema>;
export type TransactionListQuery = z.infer<typeof transactionListQuerySchema>;
