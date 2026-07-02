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
const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Transaction date must be YYYY-MM-DD.")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "Transaction date must be a real calendar date.");
const notificationCategoryHintSchema = z.enum([
  "salary",
  "freelance",
  "business",
  "interest",
  "food",
  "shopping",
  "transport",
  "bills",
  "entertainment",
  "health",
  "education",
  "travel",
  "home",
  "uncategorized",
]);

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
    transactionDate: dateOnlySchema,
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

export const createNotificationTransactionBodySchema = z
  .object({
    accountId: z.string().trim().min(1),
    amount: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "Amount must be a decimal string with up to 2 places.")
      .refine((value) => Number(value) > 0, "Amount must be greater than zero."),
    categoryHint: notificationCategoryHintSchema,
    currency: z.literal("INR"),
    detectedAt: z.string().datetime({ offset: true }),
    merchantHint: z.string().trim().min(1).max(100).optional(),
    parserVersion: z.number().int().min(1).max(100),
    sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    sourcePackage: z.enum([
      "com.google.android.apps.nbu.paisa.user",
      "com.phonepe.app",
      "net.one97.paytm",
      "in.org.npci.upiapp",
      "com.idfcfirstbank.optimus",
      "android.default_sms",
    ]),
    transactionDate: dateOnlySchema,
    type: z.enum(["income", "expense"]),
  })
  .strict();

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
export type CreateNotificationTransactionBody = z.infer<
  typeof createNotificationTransactionBodySchema
>;
export type UpdateTransactionBody = z.infer<typeof updateTransactionBodySchema>;
export type TransactionListQuery = z.infer<typeof transactionListQuerySchema>;
