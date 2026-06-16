import type { GuestPreferences } from "../../domain/preferences/guestPreferences";
import type { GuestTransaction } from "../../domain/transactions/transaction";

export interface GuestMigrationPayload {
  clientMigrationId: string;
  guestProfile: {
    currency: GuestPreferences["currency"];
    displayName: string;
    locale: GuestPreferences["locale"];
    timezone: string;
  };
  transactions: GuestTransaction[];
  workspace: {
    currency: GuestPreferences["currency"];
    name: string;
    timezone: string;
  };
}

export function createGuestMigrationPayload(options: {
  clientMigrationId: string;
  preferences: GuestPreferences;
  transactions: GuestTransaction[];
}): GuestMigrationPayload {
  const workspaceName =
    options.preferences.displayName === "Guest"
      ? "My Finances"
      : `${options.preferences.displayName}'s Finances`;

  return {
    clientMigrationId: options.clientMigrationId,
    guestProfile: {
      currency: options.preferences.currency,
      displayName: options.preferences.displayName,
      locale: options.preferences.locale,
      timezone: options.preferences.timezone,
    },
    transactions: [...options.transactions].sort(
      (left, right) =>
        left.transactionDate.localeCompare(right.transactionDate) ||
        left.createdAt.localeCompare(right.createdAt),
    ),
    workspace: {
      currency: options.preferences.currency,
      name: workspaceName,
      timezone: options.preferences.timezone,
    },
  };
}
