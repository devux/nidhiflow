import { z } from "zod";

import { isWeakPassword } from "../../shared/security/passwords.js";

const supportedCurrencies = new Set(["USD", "EUR", "GBP", "INR", "CAD", "AUD", "SGD"]);

function isValidLocale(value: string) {
  try {
    new Intl.Locale(value);
    return true;
  } catch {
    return false;
  }
}

function isValidTimeZone(value: string) {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const emailSchema = z
  .string()
  .trim()
  .email("Email address must be valid.")
  .transform((value) => value.toLowerCase());

const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters.")
  .refine((value) => !isWeakPassword(value), {
    message: "Password is too common. Choose a stronger password.",
  });

const localeSchema = z
  .string()
  .trim()
  .min(2)
  .max(20)
  .refine(isValidLocale, "Locale must be valid.");

const timezoneSchema = z.string().trim().refine(isValidTimeZone, "Timezone must be valid.");

const currencySchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .refine((value) => supportedCurrencies.has(value), "Preferred currency must be supported.");

const themeSchema = z.enum(["system", "light", "dark"]);

export const registerBodySchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required.").max(80),
  email: emailSchema,
  locale: localeSchema,
  password: passwordSchema,
  preferredCurrency: currencySchema,
  theme: themeSchema.default("system"),
  timezone: timezoneSchema,
});

export const loginBodySchema = z.object({
  deviceName: z.string().trim().min(1).max(80).optional(),
  email: emailSchema,
  password: z.string().min(1, "Password is required."),
});

export const verifyEmailBodySchema = z.object({
  token: z.string().trim().min(20).max(255),
});

export const resendVerificationBodySchema = z.object({
  email: emailSchema,
});

export const forgotPasswordBodySchema = z.object({
  email: emailSchema,
});

export const resetPasswordBodySchema = z.object({
  password: passwordSchema,
  token: z.string().trim().min(20).max(255),
});
