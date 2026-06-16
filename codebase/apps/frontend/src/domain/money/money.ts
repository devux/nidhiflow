import type { SupportedCurrency, SupportedLocale } from "../preferences/guestPreferences";

const minorUnitDigits: Record<SupportedCurrency, number> = {
  EUR: 2,
  GBP: 2,
  INR: 2,
  USD: 2,
};

export interface Money {
  amountMinor: string;
  currency: SupportedCurrency;
}

export function parseMoneyInput(input: string, currency: SupportedCurrency): Money | undefined {
  const normalized = input.trim().replaceAll(",", "");
  const digits = minorUnitDigits[currency];
  const match = new RegExp(`^(\\d+)(?:\\.(\\d{0,${digits}}))?$`).exec(normalized);

  if (!match) {
    return undefined;
  }

  const whole = match[1] ?? "";
  const fraction = (match[2] ?? "").padEnd(digits, "0");
  const amountMinor = BigInt(`${whole}${fraction}`).toString();

  if (BigInt(amountMinor) <= 0n) {
    return undefined;
  }

  return { amountMinor, currency };
}

export function formatMoney(
  money: Money,
  locale: SupportedLocale,
  options: { sign?: "negative" | "positive" } = {},
): string {
  const digits = minorUnitDigits[money.currency];
  const divisor = 10n ** BigInt(digits);
  const minor = BigInt(money.amountMinor);
  const absoluteMinor = minor < 0n ? -minor : minor;
  const whole = absoluteMinor / divisor;
  const fraction = absoluteMinor % divisor;
  const formatter = new Intl.NumberFormat(locale, {
    currency: money.currency,
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
    style: "currency",
  });
  const formatted = formatter
    .formatToParts(whole)
    .map((part) =>
      part.type === "fraction" ? fraction.toString().padStart(digits, "0") : part.value,
    )
    .join("");

  if (options.sign === "negative" || (minor < 0n && options.sign !== "positive")) {
    const minusSign =
      formatter.formatToParts(-1n).find((part) => part.type === "minusSign")?.value ?? "-";
    return `${minusSign}${formatted}`;
  }

  return options.sign === "positive" ? `+${formatted}` : formatted;
}

export function sumMinorAmounts(amounts: Iterable<string>): string {
  let total = 0n;

  for (const amount of amounts) {
    total += BigInt(amount);
  }

  return total.toString();
}

export function subtractMinorAmounts(minuend: string, subtrahend: string): string {
  return (BigInt(minuend) - BigInt(subtrahend)).toString();
}
