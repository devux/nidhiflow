import { createGuestMigrationPayload } from "./createGuestMigrationPayload";
import type { GuestPreferences } from "../../domain/preferences/guestPreferences";
import type { GuestTransaction } from "../../domain/transactions/transaction";

describe("createGuestMigrationPayload", () => {
  it("maps guest preferences and transactions into the migration contract", () => {
    const preferences: GuestPreferences = {
      currency: "INR",
      displayName: "Asha",
      locale: "en-IN",
      reminderEnabled: true,
      theme: "dark",
      timezone: "Asia/Kolkata",
    };
    const transactions: GuestTransaction[] = [
      {
        amountMinor: "250000",
        category: "Salary",
        createdAt: "2026-06-16T07:00:00.000Z",
        currency: "INR",
        id: "guest_income_1",
        note: "Monthly salary",
        transactionDate: "2026-06-15",
        type: "income",
        updatedAt: "2026-06-16T07:00:00.000Z",
      },
      {
        amountMinor: "15000",
        category: "Food",
        createdAt: "2026-06-16T09:00:00.000Z",
        currency: "INR",
        id: "guest_expense_1",
        note: "Groceries",
        transactionDate: "2026-06-16",
        type: "expense",
        updatedAt: "2026-06-16T09:00:00.000Z",
      },
    ];

    expect(
      createGuestMigrationPayload({
        clientMigrationId: "migration_123",
        preferences,
        transactions,
      }),
    ).toEqual({
      clientMigrationId: "migration_123",
      guestProfile: {
        currency: "INR",
        displayName: "Asha",
        locale: "en-IN",
        timezone: "Asia/Kolkata",
      },
      transactions,
      workspace: {
        currency: "INR",
        name: "Asha's Finances",
        timezone: "Asia/Kolkata",
      },
    });
  });
});
