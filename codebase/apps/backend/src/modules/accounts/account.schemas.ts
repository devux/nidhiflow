import { z } from "zod";

const currencySchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .refine((value) => /^[A-Z]{3}$/.test(value), "Currency must be a valid ISO 4217 code.");

const accountTypeSchema = z.enum(["cash", "bank", "credit_card", "loan", "wallet", "other"]);

const moneySchema = z.object({
  amount: z
    .string()
    .regex(/^-?\d+(\.\d{1,4})?$/, "Amount must be a decimal string with up to 4 places.")
    .refine((value) => Number(value) >= 0, "Amount must not be negative."),
  currency: currencySchema,
});

export const workspaceIdSchema = z.object({
  workspaceId: z.string().trim().min(1),
});

export const accountIdSchema = z.object({
  accountId: z.string().trim().min(1),
});

export const categoryIdSchema = z.object({
  categoryId: z.string().trim().min(1),
});

export const createAccountBodySchema = z.object({
  currency: currencySchema,
  name: z.string().trim().min(1).max(80),
  openingBalance: moneySchema,
  type: accountTypeSchema,
});

export const updateAccountBodySchema = z
  .object({
    currency: currencySchema.optional(),
    name: z.string().trim().min(1).max(80).optional(),
    openingBalance: moneySchema.optional(),
    type: accountTypeSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided.");

export const createTransferBodySchema = z.object({
  accountId: z.string().trim().min(1),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Amount must be a decimal string with up to 4 places.")
    .refine((value) => Number(value) > 0, "Amount must be greater than zero."),
  currency: currencySchema,
  destinationAccountId: z.string().trim().min(1),
  note: z.string().trim().max(100).optional(),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Transaction date must be YYYY-MM-DD."),
});

export const createCategoryBodySchema = z.object({
  colorToken: z.string().trim().max(40).optional(),
  iconKey: z.string().trim().max(40).optional(),
  name: z.string().trim().min(1).max(80),
  parentCategoryId: z.string().trim().min(1).optional(),
  transactionType: z.enum(["income", "expense"]),
});

export const updateCategoryBodySchema = z
  .object({
    colorToken: z.string().trim().max(40).nullable().optional(),
    iconKey: z.string().trim().max(40).nullable().optional(),
    name: z.string().trim().min(1).max(80).optional(),
    parentCategoryId: z.string().trim().min(1).nullable().optional(),
    transactionType: z.enum(["income", "expense"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided.");

export type CreateAccountBody = z.infer<typeof createAccountBodySchema>;
export type UpdateAccountBody = z.infer<typeof updateAccountBodySchema>;
export type CreateTransferBody = z.infer<typeof createTransferBodySchema>;
export type CreateCategoryBody = z.infer<typeof createCategoryBodySchema>;
export type UpdateCategoryBody = z.infer<typeof updateCategoryBodySchema>;
