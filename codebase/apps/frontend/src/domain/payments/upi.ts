export interface ParsedUpiQr {
  amount: string;
  currency: string;
  note: string;
  payeeName: string;
  payeeUpiId: string;
}

export const upiIdPattern = /^[A-Za-z0-9._-]+@[A-Za-z][A-Za-z0-9.-]+$/;

export function parseUpiQr(value: string): ParsedUpiQr {
  const url = new URL(value);
  if (url.protocol !== "upi:" || url.hostname !== "pay") {
    throw new Error("This QR code is not a UPI payment request.");
  }
  const payeeUpiId = (url.searchParams.get("pa") ?? "").trim().toLowerCase();
  const currency = (url.searchParams.get("cu") ?? "INR").trim().toUpperCase();
  const amount = (url.searchParams.get("am") ?? "").trim();
  if (!upiIdPattern.test(payeeUpiId))
    throw new Error("The QR code does not contain a valid UPI ID.");
  if (currency !== "INR") throw new Error("Only INR UPI payments are supported.");
  if (amount && !/^\d{1,13}(\.\d{1,2})?$/.test(amount)) {
    throw new Error("The QR code contains an invalid amount.");
  }
  return {
    amount,
    currency,
    note: (url.searchParams.get("tn") ?? "").slice(0, 80),
    payeeName: (url.searchParams.get("pn") ?? "").slice(0, 100),
    payeeUpiId,
  };
}

export function validatePaymentAmount(value: string) {
  return /^\d{1,13}(\.\d{1,2})?$/.test(value) && Number(value) > 0;
}
