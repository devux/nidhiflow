import { z } from "zod";

const upiIdSchema = z
  .string()
  .trim()
  .min(3)
  .max(320)
  .regex(/^[A-Za-z0-9._-]+@[A-Za-z][A-Za-z0-9.-]+$/, "UPI ID must use the format name@provider.")
  .transform((value) => value.toLowerCase());

const amountSchema = z
  .string()
  .trim()
  .regex(/^\d{1,13}(\.\d{1,2})?$/, "Amount must be a positive decimal string with up to 2 places.")
  .refine(
    (value) =>
      BigInt(
        value.replace(".", "").padEnd(value.includes(".") ? value.length : value.length + 2, "0"),
      ) > 0n,
    "Amount must be greater than zero.",
  );

export const paymentIdParamsSchema = z.object({
  paymentId: z.string().trim().min(1),
});

export const paymentUserParamsSchema = z.object({
  userId: z.string().trim().min(1),
});

export const createPaymentBodySchema = z.object({
  amount: amountSchema,
  currency: z.literal("INR"),
  note: z.string().trim().max(80).optional(),
  payeeName: z.string().trim().max(100).optional(),
  payeeUpiId: upiIdSchema,
  selectedUpiApp: z.string().trim().min(1).max(100),
  source: z.enum(["QR_SCAN", "MANUAL_ENTRY"]),
});

export const updatePaymentStatusBodySchema = z.object({
  appReportedStatus: z.enum(["SUCCESS", "FAILURE", "CANCELLED", "UNKNOWN"]),
  approvalRefNo: z.string().trim().max(100).optional(),
  paymentId: z.string().trim().min(1),
  rawResponse: z.string().max(4000).optional(),
  responseCode: z.string().trim().max(50).optional(),
  selectedUpiApp: z.string().trim().min(1).max(100),
});

export type CreatePaymentBody = z.infer<typeof createPaymentBodySchema>;
export type UpdatePaymentStatusBody = z.infer<typeof updatePaymentStatusBodySchema>;
