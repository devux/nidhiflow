import { z } from "zod";

import { parseMoneyInput } from "../../../domain/money/money";
import {
  isCategoryForType,
  type GuestTransactionInput,
  type TransactionType,
} from "../../../domain/transactions/transaction";
import type { SupportedCurrency } from "../../../domain/preferences/guestPreferences";

export interface TransactionFormValues {
  amount: string;
  category: string;
  note: string;
  transactionDate: string;
  type: TransactionType;
}

export interface TransactionFormErrors {
  amount?: string;
  category?: string;
  note?: string;
  transactionDate?: string;
}

const baseSchema = z.object({
  amount: z.string(),
  category: z.string().min(1, "Choose a category."),
  note: z.string().trim().max(100, "Keep the note to 100 characters or fewer."),
  transactionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid transaction date.")
    .refine((date) => {
      const parsed = new Date(`${date}T00:00:00Z`);
      return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(date);
    }, "Choose a valid transaction date."),
  type: z.enum(["income", "expense"]),
});

export function validateTransactionForm(
  values: TransactionFormValues,
  currency: SupportedCurrency,
):
  | { errors: TransactionFormErrors; input?: never }
  | { errors?: never; input: GuestTransactionInput } {
  const result = baseSchema.safeParse(values);
  const errors: TransactionFormErrors = {};

  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof TransactionFormErrors;
      errors[field] ??= issue.message;
    }
  }

  const money = parseMoneyInput(values.amount, currency);
  if (!money) {
    errors.amount = "Enter an amount greater than zero with up to 2 decimal places.";
  }

  if (values.category && !isCategoryForType(values.category, values.type)) {
    errors.category = `Choose an ${values.type} category.`;
  }

  if (Object.keys(errors).length > 0 || !money) {
    return { errors };
  }

  return {
    input: {
      amountMinor: money.amountMinor,
      category: values.category as GuestTransactionInput["category"],
      currency,
      note: values.note.trim(),
      transactionDate: values.transactionDate,
      type: values.type,
    },
  };
}
