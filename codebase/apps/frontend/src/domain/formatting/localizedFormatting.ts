import type { SupportedCurrency, SupportedLocale } from "../preferences/guestPreferences";

export function formatWholeCurrency(
  amount: bigint,
  currency: SupportedCurrency,
  locale: SupportedLocale,
): string {
  return new Intl.NumberFormat(locale, {
    currency,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(amount);
}

export function formatMonth(date: Date, locale: SupportedLocale, timezone: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    timeZone: timezone,
    year: "numeric",
  }).format(date);
}

export function formatShortDate(date: Date, locale: SupportedLocale, timezone: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: timezone,
    year: "numeric",
  }).format(date);
}
