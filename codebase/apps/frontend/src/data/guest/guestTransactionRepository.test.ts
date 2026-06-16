import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "@jest/globals";

import { resetGuestDatabaseConnectionForTests } from "./guestDatabase";
import { IndexedDbGuestTransactionRepository } from "./guestTransactionRepository";

describe("IndexedDbGuestTransactionRepository", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "indexedDB", {
      configurable: true,
      value: new IDBFactory(),
    });
    resetGuestDatabaseConnectionForTests();
  });

  it("persists updates across repository instances and soft-removes records", async () => {
    const firstRepository = new IndexedDbGuestTransactionRepository();
    const created = await firstRepository.create({
      amountMinor: "1250",
      category: "Food",
      currency: "USD",
      note: "Lunch",
      transactionDate: "2026-06-15",
      type: "expense",
    });

    const reopenedRepository = new IndexedDbGuestTransactionRepository();
    await expect(reopenedRepository.list()).resolves.toEqual([created]);

    const updated = await reopenedRepository.update(created.id, {
      ...created,
      amountMinor: "1500",
      note: "Lunch with team",
    });
    expect(updated.amountMinor).toBe("1500");
    expect(updated.note).toBe("Lunch with team");

    await reopenedRepository.remove(created.id);
    await expect(reopenedRepository.list()).resolves.toEqual([]);
    await expect(reopenedRepository.findById(created.id)).resolves.toBeUndefined();
  });

  it("filters transaction history by type, category, query, and date", async () => {
    const repository = new IndexedDbGuestTransactionRepository();
    await repository.create({
      amountMinor: "500000",
      category: "Salary",
      currency: "USD",
      note: "June payroll",
      transactionDate: "2026-06-01",
      type: "income",
    });
    await repository.create({
      amountMinor: "2500",
      category: "Food",
      currency: "USD",
      note: "Team lunch",
      transactionDate: "2026-06-15",
      type: "expense",
    });

    const records = await repository.list({
      category: "Food",
      dateFrom: "2026-06-10",
      dateTo: "2026-06-20",
      query: "lunch",
      type: "expense",
    });

    expect(records).toHaveLength(1);
    expect(records[0]?.category).toBe("Food");
  });
});
