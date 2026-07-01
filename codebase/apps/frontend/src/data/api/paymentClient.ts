import { environment } from "../../config/environment";
import { trackApiRequest } from "../../app/providers/apiLoadingState";

export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILURE" | "CANCELLED" | "UNKNOWN";

export interface PaymentResource {
  amount: string;
  appReportedStatus: PaymentStatus;
  approvalRefNo: string | null;
  createdAt: string;
  currency: "INR";
  id: string;
  note: string | null;
  payeeName: string | null;
  payeeUpiId: string;
  responseCode: string | null;
  selectedUpiApp: string;
  source: "QR_SCAN" | "MANUAL_ENTRY";
  transactionRef: string;
  upiUri: string;
  verificationStatus: "UNVERIFIED" | "VERIFIED" | "REJECTED";
}

async function request<Data>(path: string, accessToken: string, init: RequestInit) {
  return trackApiRequest(async () => {
    const response = await fetch(`${environment.NIDHIFLOW_API_BASE_URL}/api/v1${path}`, {
      ...init,
      credentials: "include",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    });
    const body = (await response.json()) as { data: Data; message: string };
    if (!response.ok) throw new Error(body.message || "Payment request failed.");
    return body.data;
  });
}

export function createPayment(
  accessToken: string,
  input: {
    amount: string;
    currency: "INR";
    note?: string;
    payeeName?: string;
    payeeUpiId: string;
    selectedUpiApp: string;
    source: "QR_SCAN" | "MANUAL_ENTRY";
  },
) {
  return request<PaymentResource>("/payments/create", accessToken, {
    body: JSON.stringify(input),
    method: "POST",
  });
}

export function updatePaymentStatus(
  accessToken: string,
  input: {
    appReportedStatus: Exclude<PaymentStatus, "PENDING">;
    approvalRefNo?: string;
    paymentId: string;
    rawResponse?: string;
    responseCode?: string;
    selectedUpiApp: string;
  },
) {
  return request<PaymentResource>("/payments/update-status", accessToken, {
    body: JSON.stringify(input),
    method: "POST",
  });
}
