import { Capacitor, registerPlugin } from "@capacitor/core";

import type { DetectedNotificationTransaction } from "../../../data/api/financeClient";

export interface NotificationTransactionStatus {
  accountId: string;
  captureEnabled: boolean;
  pendingCount: number;
  permissionGranted: boolean;
  userId: string;
  workspaceId: string;
}

interface NotificationTransactionsPlugin {
  acknowledgeTransactions(input: { localIds: string[] }): Promise<void>;
  configure(input: {
    accountId?: string;
    captureEnabled: boolean;
    userId?: string;
    workspaceId?: string;
  }): Promise<void>;
  disableAndClear(): Promise<void>;
  getPendingTransactions(): Promise<{ transactions: DetectedNotificationTransaction[] }>;
  getStatus(): Promise<NotificationTransactionStatus>;
  openNotificationAccessSettings(): Promise<void>;
}

const plugin = registerPlugin<NotificationTransactionsPlugin>("NotificationTransactions");

export function supportsNotificationTransactions() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export const notificationTransactions = plugin;
