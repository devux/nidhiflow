import type { SupportedCurrency } from "../preferences/guestPreferences";

export const incomeCategories = [
  "Salary",
  "Freelance",
  "Business",
  "Interest",
  "Uncategorized",
] as const;
export const expenseCategories = [
  "Food",
  "Shopping",
  "Transport",
  "Bills",
  "Entertainment",
  "Health",
  "Education",
  "Travel",
  "Home",
  "Misc",
  "Uncategorized",
] as const;

export type IncomeCategory = (typeof incomeCategories)[number];
export type ExpenseCategory = (typeof expenseCategories)[number];
export type TransactionCategory = IncomeCategory | ExpenseCategory;
export type TransactionType = "income" | "expense";

export interface GuestTransaction {
  amountMinor: string;
  category: TransactionCategory;
  createdAt: string;
  currency: SupportedCurrency;
  deletedAt?: string;
  id: string;
  note: string;
  source?: "MANUAL" | "ANDROID_NOTIFICATION";
  sourceDetectedAt?: string | null;
  sourcePackage?: string | null;
  sourceParserVersion?: number | null;
  transactionDate: string;
  type: TransactionType;
  updatedAt: string;
}

export interface GuestTransactionInput {
  amountMinor: string;
  category: TransactionCategory;
  currency: SupportedCurrency;
  note: string;
  transactionDate: string;
  type: TransactionType;
}

export interface TransactionTotals {
  balanceMinor: string;
  expenseMinor: string;
  incomeMinor: string;
}

export function isCategoryForType(
  category: string,
  type: TransactionType,
): category is TransactionCategory {
  const categories: readonly string[] = type === "income" ? incomeCategories : expenseCategories;
  return categories.includes(category);
}

export function calculateTransactionTotals(transactions: GuestTransaction[]): TransactionTotals {
  let income = 0n;
  let expense = 0n;

  for (const transaction of transactions) {
    if (transaction.deletedAt) {
      continue;
    }

    if (transaction.type === "income") {
      income += BigInt(transaction.amountMinor);
    } else {
      expense += BigInt(transaction.amountMinor);
    }
  }

  return {
    balanceMinor: (income - expense).toString(),
    expenseMinor: expense.toString(),
    incomeMinor: income.toString(),
  };
}

export function createTransactionId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `guest-${Date.now()}-${Math.random()}`;
}
