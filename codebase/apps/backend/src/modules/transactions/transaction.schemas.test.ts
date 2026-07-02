import { describe, expect, it } from "vitest";

import { createNotificationTransactionBodySchema } from "./transaction.schemas.js";

const validInput = {
  accountId: "acc_test",
  amount: "125.50",
  categoryHint: "food",
  currency: "INR",
  detectedAt: "2026-07-02T12:30:00.000Z",
  merchantHint: "Corner Cafe",
  parserVersion: 1,
  sourceFingerprint: "a".repeat(64),
  sourcePackage: "com.google.android.apps.nbu.paisa.user",
  transactionDate: "2026-07-02",
  type: "expense",
} as const;

describe("createNotificationTransactionBodySchema", () => {
  it("accepts only the minimum versioned derived transaction fields", () => {
    expect(createNotificationTransactionBodySchema.safeParse(validInput).success).toBe(true);
  });

  it("rejects impossible dates and unversioned parser output", () => {
    expect(
      createNotificationTransactionBodySchema.safeParse({
        ...validInput,
        transactionDate: "2026-02-30",
      }).success,
    ).toBe(false);
    const unversioned = { ...validInput } as Record<string, unknown>;
    delete unversioned.parserVersion;
    expect(createNotificationTransactionBodySchema.safeParse(unversioned).success).toBe(false);
  });

  it("rejects raw notification content and unsupported sources", () => {
    expect(
      createNotificationTransactionBodySchema.safeParse({
        ...validInput,
        rawNotificationBody: "sensitive",
      }).success,
    ).toBe(false);
    expect(
      createNotificationTransactionBodySchema.safeParse({
        ...validInput,
        sourcePackage: "com.example.unsupported",
      }).success,
    ).toBe(false);
  });
});
