import "fake-indexeddb/auto";

import { describe, expect, it } from "@jest/globals";

import type { GuestPreferences } from "../../domain/preferences/guestPreferences";
import { IndexedDbGuestPreferencesRepository } from "./guestPreferencesRepository";

describe("IndexedDbGuestPreferencesRepository", () => {
  it("persists guest preferences across repository instances", async () => {
    const firstRepository = new IndexedDbGuestPreferencesRepository();
    const preferences: GuestPreferences = {
      currency: "GBP",
      displayName: "Sam",
      locale: "en-GB",
      reminderEnabled: false,
      theme: "dark",
      timezone: "Europe/London",
    };

    await firstRepository.save(preferences);

    const reopenedRepository = new IndexedDbGuestPreferencesRepository();

    await expect(reopenedRepository.load()).resolves.toEqual(preferences);
  });
});
