import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import {
  createDefaultGuestPreferences,
  type GuestPreferences,
} from "../../domain/preferences/guestPreferences";

const databaseName = "nidhiflow-guest";
const databaseVersion = 1;
const preferencesKey = "current";

interface GuestDatabase extends DBSchema {
  preferences: {
    key: string;
    value: GuestPreferences;
  };
}

export interface GuestPreferencesRepository {
  load: () => Promise<GuestPreferences>;
  save: (preferences: GuestPreferences) => Promise<void>;
}

export class IndexedDbGuestPreferencesRepository implements GuestPreferencesRepository {
  private databasePromise?: Promise<IDBPDatabase<GuestDatabase>>;

  async load(): Promise<GuestPreferences> {
    const database = await this.openDatabase();
    const storedPreferences = await database.get("preferences", preferencesKey);

    if (storedPreferences) {
      return storedPreferences;
    }

    const defaultPreferences = createDefaultGuestPreferences();
    await database.put("preferences", defaultPreferences, preferencesKey);
    return defaultPreferences;
  }

  async save(preferences: GuestPreferences): Promise<void> {
    const database = await this.openDatabase();
    await database.put("preferences", preferences, preferencesKey);
  }

  private openDatabase(): Promise<IDBPDatabase<GuestDatabase>> {
    this.databasePromise ??= openDB<GuestDatabase>(databaseName, databaseVersion, {
      upgrade(database) {
        if (!database.objectStoreNames.contains("preferences")) {
          database.createObjectStore("preferences");
        }
      },
    });

    return this.databasePromise;
  }
}
