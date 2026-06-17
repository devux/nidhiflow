export const supportedLocales = ["en-US", "en-GB", "en-IN"] as const;
export const supportedCurrencies = ["USD", "GBP", "INR", "EUR"] as const;
export const themePreferences = ["system", "light", "dark"] as const;

export type SupportedLocale = (typeof supportedLocales)[number];
export type SupportedCurrency = (typeof supportedCurrencies)[number];
export type ThemePreference = (typeof themePreferences)[number];

export interface GuestPreferences {
  currency: SupportedCurrency;
  displayName: string;
  locale: SupportedLocale;
  reminderEnabled: boolean;
  reminderRepeatEnabled: boolean;
  theme: ThemePreference;
  timezone: string;
}

const localeCurrency: Record<SupportedLocale, SupportedCurrency> = {
  "en-GB": "GBP",
  "en-IN": "INR",
  "en-US": "USD",
};

export function resolveSupportedLocale(locale: string): SupportedLocale {
  const exactMatch = supportedLocales.find(
    (supportedLocale) => supportedLocale.toLowerCase() === locale.toLowerCase(),
  );

  if (exactMatch) {
    return exactMatch;
  }

  const languageRegion = new Intl.Locale(locale).region;

  if (languageRegion === "GB") {
    return "en-GB";
  }

  if (languageRegion === "IN") {
    return "en-IN";
  }

  return "en-US";
}

export function createDefaultGuestPreferences(): GuestPreferences {
  const locale = resolveSupportedLocale(globalThis.navigator?.language ?? "en-US");
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  return {
    currency: localeCurrency[locale],
    displayName: "Guest",
    locale,
    reminderEnabled: true,
    reminderRepeatEnabled: false,
    theme: "system",
    timezone,
  };
}
