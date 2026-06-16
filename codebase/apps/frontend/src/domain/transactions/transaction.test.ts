import { describe, expect, it } from "@jest/globals";

import { calculateTransactionTotals, type GuestTransaction } from "./transaction";

const base: GuestTransaction = {
  amountMinor: "0",
  category: "Salary",
  createdAt: "2026-06-15T10:00:00.000Z",
  currency: "USD",
  id: "base",
  note: "",
  transactionDate: "2026-06-15",
  type: "income",
  updatedAt: "2026-06-15T10:00:00.000Z",
};

describe("calculateTransactionTotals", () => {
  it("uses integer arithmetic and excludes removed records", () => {
    expect(
      calculateTransactionTotals([
        { ...base, amountMinor: "10005", id: "income" },
        {
          ...base,
          amountMinor: "3010",
          category: "Food",
          id: "expense",
          type: "expense",
        },
        {
          ...base,
          amountMinor: "999999",
          deletedAt: "2026-06-15T11:00:00.000Z",
          id: "removed",
        },
      ]),
    ).toEqual({
      balanceMinor: "6995",
      expenseMinor: "3010",
      incomeMinor: "10005",
    });
  });
});
