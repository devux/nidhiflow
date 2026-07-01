import { Capacitor, registerPlugin } from "@capacitor/core";

export interface UpiApp {
  known: boolean;
  name: string;
  packageName: string;
}

interface UpiPaymentsPlugin {
  getInstalledApps(): Promise<{ apps: UpiApp[] }>;
  launchPayment(input: { packageName?: string; upiUri: string }): Promise<{
    appReportedStatus: "SUCCESS" | "FAILURE" | "CANCELLED" | "UNKNOWN";
    approvalRefNo?: string;
    rawResponse?: string;
    responseCode?: string;
  }>;
  scanUpiQr(): Promise<{ value: string }>;
}

const plugin = registerPlugin<UpiPaymentsPlugin>("UpiPayments");

export function isNativeAndroid() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export const upiPayments = plugin;
