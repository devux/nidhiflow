import { z } from "zod";

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

const optionalDisplayName = z.string().trim().min(1).max(80);
const optionalLocale = z
  .string()
  .trim()
  .min(2)
  .max(20)
  .refine(isValidLocale, "Locale must be valid.");
const optionalTimezone = z.string().trim().refine(isValidTimeZone, "Timezone must be valid.");
const optionalCurrency = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .refine((value) => supportedCurrencies.has(value), "Preferred currency must be supported.");

export const updateProfileBodySchema = z
  .object({
    displayName: optionalDisplayName.optional(),
    locale: optionalLocale.optional(),
    preferredCurrency: optionalCurrency.optional(),
    theme: z.enum(["system", "light", "dark"]).optional(),
    timezone: optionalTimezone.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided.");

export const sessionParamsSchema = z.object({
  sessionId: z.string().trim().min(1),
});
