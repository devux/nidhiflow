import type { AccountResource } from "../../../data/api/financeClient";
import type { SupportedCurrency } from "../../../domain/preferences/guestPreferences";

export interface LiabilityAccount extends AccountResource {
  balanceMinor: string;
  currentBalance: string;
}

export interface LiabilityCurrencyTotal {
  amountMinor: string;
  currency: SupportedCurrency;
}

export interface LiabilitySummary {
  activeAccounts: LiabilityAccount[];
  archivedAccounts: LiabilityAccount[];
  totals: LiabilityCurrencyTotal[];
}

const liabilityTypes = new Set(["credit_card", "loan", "other_liability"]);

function decimalToMinor(amount: string): string {
  const match = /^(-?)(\d+)(?:\.(\d{0,4}))?$/.exec(amount.trim());

  if (!match) {
    throw new Error("Account balance is not a valid decimal amount.");
  }

  const sign = match[1] === "-" ? -1n : 1n;
  const whole = BigInt(match[2] ?? "0");
  const fraction = BigInt(`${match[3] ?? ""}00`.slice(0, 2));
  return (sign * (whole * 100n + fraction)).toString();
}

function toLiabilityAccount(account: AccountResource): LiabilityAccount | null {
  if (!liabilityTypes.has(account.type) || account.currentBalance === undefined) {
    return null;
  }

  const signedBalance = BigInt(decimalToMinor(account.currentBalance));

  return {
    ...account,
    balanceMinor: (signedBalance < 0n ? -signedBalance : signedBalance).toString(),
    currentBalance: account.currentBalance,
  };
}

export function summarizeLiabilities(accounts: AccountResource[]): LiabilitySummary {
  const liabilities = accounts
    .map(toLiabilityAccount)
    .filter((account): account is LiabilityAccount => account !== null);
  const activeAccounts = liabilities.filter((account) => !account.isArchived);
  const archivedAccounts = liabilities.filter((account) => account.isArchived);
  const totalByCurrency = new Map<SupportedCurrency, bigint>();

  for (const account of activeAccounts) {
    totalByCurrency.set(
      account.currency,
      (totalByCurrency.get(account.currency) ?? 0n) + BigInt(account.balanceMinor),
    );
  }

  return {
    activeAccounts,
    archivedAccounts,
    totals: [...totalByCurrency.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([currency, amountMinor]) => ({ amountMinor: amountMinor.toString(), currency })),
  };
}
