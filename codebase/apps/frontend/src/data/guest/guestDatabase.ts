import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import type { GuestPreferences } from "../../domain/preferences/guestPreferences";
import type { GuestTransaction } from "../../domain/transactions/transaction";

const databaseName = "nidhiflow-guest";
const databaseVersion = 2;

export interface GuestDatabase extends DBSchema {
  preferences: {
    key: string;
    value: GuestPreferences;
  };
  transactions: {
    indexes: {
      "by-date": string;
      "by-type": string;
    };
    key: string;
    value: GuestTransaction;
  };
}

let databasePromise: Promise<IDBPDatabase<GuestDatabase>> | undefined;

export function openGuestDatabase(): Promise<IDBPDatabase<GuestDatabase>> {
  databasePromise ??= openDB<GuestDatabase>(databaseName, databaseVersion, {
    upgrade(database) {
      if (!database.objectStoreNames.contains("preferences")) {
        database.createObjectStore("preferences");
      }

      if (!database.objectStoreNames.contains("transactions")) {
        const transactionStore = database.createObjectStore("transactions", {
          keyPath: "id",
        });
        transactionStore.createIndex("by-date", "transactionDate");
        transactionStore.createIndex("by-type", "type");
      }
    },
  });

  return databasePromise;
}

export function resetGuestDatabaseConnectionForTests(): void {
  databasePromise = undefined;
}
