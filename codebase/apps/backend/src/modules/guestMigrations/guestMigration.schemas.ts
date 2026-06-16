import { z } from "zod";

const incomeCategories = ["Salary", "Freelance", "Business", "Interest"] as const;
const expenseCategories = [
  "Food",
  "Shopping",
  "Transport",
  "Bills",
  "Entertainment",
  "Health",
  "Education",
  "Travel",
  "Home",
] as const;

const currencySchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .refine((value) => /^[A-Z]{3}$/.test(value), "Currency must be a valid ISO 4217 code.");

const timezoneSchema = z
  .string()
  .trim()
  .refine(
    (value) => {
      try {
        Intl.DateTimeFormat("en-US", { timeZone: value });
        return true;
      } catch {
        return false;
      }
    },
    { message: "Timezone must be valid." },
  );

const localeSchema = z
  .string()
  .trim()
  .refine(
    (value) => {
      try {
        new Intl.Locale(value);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Locale must be valid." },
  );

const guestTransactionSchema = z
  .object({
    amountMinor: z
      .string()
      .regex(/^-?\d+$/, "Amount must be a whole-number minor-unit string.")
      .refine((value) => BigInt(value) > 0n, "Amount must be greater than zero."),
    category: z.string().trim().min(1).max(80),
    createdAt: z.string().datetime({ offset: true }),
    currency: currencySchema,
    deletedAt: z.string().datetime({ offset: true }).optional(),
    id: z.string().trim().min(1).max(120),
    note: z.string().max(100),
    transactionDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Transaction date must use YYYY-MM-DD."),
    type: z.enum(["income", "expense"]),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .superRefine((transaction, context) => {
    const allowedCategories = transaction.type === "income" ? incomeCategories : expenseCategories;

    if (!allowedCategories.includes(transaction.category as never)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Category must be a valid ${transaction.type} category.`,
        path: ["category"],
      });
    }
  });

const guestMigrationPayloadSchema = z.object({
  clientMigrationId: z.string().trim().min(1).max(120),
  guestProfile: z.object({
    currency: currencySchema,
    displayName: z.string().trim().min(1).max(80),
    locale: localeSchema,
    timezone: timezoneSchema,
  }),
  transactions: z.array(guestTransactionSchema).max(2_000),
  workspace: z
    .object({
      currency: currencySchema,
      name: z.string().trim().min(1).max(80),
      timezone: timezoneSchema,
    })
    .optional(),
});

export const guestMigrationPreviewBodySchema = guestMigrationPayloadSchema;

export const guestMigrationCommitBodySchema = guestMigrationPayloadSchema.extend({
  confirm: z.literal(true, {
    errorMap: () => ({
      message: "Explicit confirmation is required before migrating guest data.",
    }),
  }),
});

export const idempotencyHeadersSchema = z
  .object({
    "idempotency-key": z.string().trim().min(1).max(200),
  })
  .passthrough();

export type GuestMigrationPreviewInput = z.infer<typeof guestMigrationPreviewBodySchema>;
export type GuestMigrationCommitInput = z.infer<typeof guestMigrationCommitBodySchema>;
