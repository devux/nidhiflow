export interface ParsedUpiQr {
  amount: string;
  currency: string;
  hasFixedAmount: boolean;
  note: string;
  payeeName: string;
  payeeUpiId: string;
  upiUri: string;
}

export const upiIdPattern = /^[A-Za-z0-9._-]+@[A-Za-z][A-Za-z0-9.-]+$/;

export function parseUpiQr(value: string): ParsedUpiQr {
  const upiUri = value.trim();
  if (!upiUri || upiUri.length > 2048) {
    throw new Error("This QR code is not a valid UPI payment request.");
  }
  const url = new URL(upiUri);
  if (
    url.protocol !== "upi:" ||
    url.hostname !== "pay" ||
    url.username ||
    url.password ||
    url.port ||
    url.hash ||
    (url.pathname !== "" && url.pathname !== "/")
  ) {
    throw new Error("This QR code is not a UPI payment request.");
  }
  for (const key of ["pa", "pn", "am", "tn", "cu"]) {
    if (url.searchParams.getAll(key).length > 1) {
      throw new Error("The QR code contains duplicate UPI payment details.");
    }
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
    hasFixedAmount: Boolean(amount),
    note: (url.searchParams.get("tn") ?? "").slice(0, 80),
    payeeName: (url.searchParams.get("pn") ?? "").slice(0, 100),
    payeeUpiId,
    upiUri,
  };
}

export function validatePaymentAmount(value: string) {
  return /^\d{1,13}(\.\d{1,2})?$/.test(value) && Number(value) > 0;
}
