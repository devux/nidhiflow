import {
  createDefaultGuestPreferences,
  type GuestPreferences,
} from "../../domain/preferences/guestPreferences";
import { openGuestDatabase } from "./guestDatabase";
const preferencesKey = "current";

export interface GuestPreferencesRepository {
  load: () => Promise<GuestPreferences>;
  save: (preferences: GuestPreferences) => Promise<void>;
}

export class IndexedDbGuestPreferencesRepository implements GuestPreferencesRepository {
  async load(): Promise<GuestPreferences> {
    const database = await openGuestDatabase();
    const storedPreferences = await database.get("preferences", preferencesKey);

    if (storedPreferences) {
      return storedPreferences;
    }

    const defaultPreferences = createDefaultGuestPreferences();
    await database.put("preferences", defaultPreferences, preferencesKey);
    return defaultPreferences;
  }

  async save(preferences: GuestPreferences): Promise<void> {
    const database = await openGuestDatabase();
    await database.put("preferences", preferences, preferencesKey);
  }
}
