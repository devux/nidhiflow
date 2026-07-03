import { describe, expect, it } from "@jest/globals";

import type { AccountResource } from "../../../data/api/financeClient";
import { summarizeLiabilities } from "./liabilitySummary";

function account(overrides: Partial<AccountResource>): AccountResource {
  return {
    currency: "USD",
    currentBalance: "0.0000",
    id: "account",
    isArchived: false,
    name: "Account",
    type: "cash",
    ...overrides,
  };
}

describe("summarizeLiabilities", () => {
  it("uses absolute ledger balances for active credit cards and loans", () => {
    const result = summarizeLiabilities([
      account({
        currentBalance: "-1200.2550",
        id: "card",
        name: "Card",
        type: "credit_card",
      }),
      account({ currentBalance: "300.10", id: "loan", name: "Loan", type: "loan" }),
      account({ currentBalance: "9000.00", id: "bank", type: "bank" }),
    ]);

    expect(result.activeAccounts.map(({ balanceMinor, id }) => ({ balanceMinor, id }))).toEqual([
      { balanceMinor: "120025", id: "card" },
      { balanceMinor: "30010", id: "loan" },
    ]);
    expect(result.totals).toEqual([{ amountMinor: "150035", currency: "USD" }]);
  });

  it("keeps currencies separate and archived accounts outside active totals", () => {
    const result = summarizeLiabilities([
      account({
        currency: "INR",
        currentBalance: "-10.00",
        id: "inr",
        type: "other_liability",
      }),
      account({ currentBalance: "-20.00", id: "usd", type: "credit_card" }),
      account({
        currentBalance: "-999.00",
        id: "archived",
        isArchived: true,
        type: "loan",
      }),
    ]);

    expect(result.totals).toEqual([
      { amountMinor: "1000", currency: "INR" },
      { amountMinor: "2000", currency: "USD" },
    ]);
    expect(result.archivedAccounts).toHaveLength(1);
    expect(result.archivedAccounts[0]?.id).toBe("archived");
  });
});
