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

export const billIdSchema = z.object({
  billId: z.string().trim().min(1),
});

export const createBillBodySchema = z.object({
  accountId: z.string().trim().min(1),
  amount: moneySchema,
  categoryId: z.string().trim().min(1).optional(),
  dueDate: dateSchema,
  name: z.string().trim().min(1).max(80),
  recurrenceRule: z.string().trim().min(1).optional(),
});

export const updateBillBodySchema = z
  .object({
    accountId: z.string().trim().min(1).optional(),
    amount: moneySchema.optional(),
    categoryId: z.string().trim().min(1).optional(),
    dueDate: dateSchema.optional(),
    name: z.string().trim().min(1).max(80).optional(),
    recurrenceRule: z.string().trim().min(1).optional(),
    status: z.enum(["pending", "paid", "overdue"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided.");

export type CreateBillBody = z.infer<typeof createBillBodySchema>;
export type UpdateBillBody = z.infer<typeof updateBillBodySchema>;
