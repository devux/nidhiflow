import { AppError } from "../../shared/errors/appError.js";
import type { CreatePaymentBody } from "./payment.schemas.js";

const upiIdPattern = /^[A-Za-z0-9._-]+@[A-Za-z][A-Za-z0-9.-]+$/;
const amountPattern = /^\d{1,13}(\.\d{1,2})?$/;
const singleValueFields = ["pa", "pn", "am", "tn", "cu"] as const;

function invalidQr(message: string): never {
  throw new AppError({
    code: "VALIDATION_ERROR",
    message,
    status: 422,
  });
}

function amountInPaise(value: string) {
  const [whole = "0", fraction = ""] = value.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}

function parseScannedUpiUri(input: CreatePaymentBody) {
  let url: URL;
  try {
    url = new URL(input.qrUpiUri ?? "");
  } catch {
    return invalidQr("The scanned QR code is not a valid UPI payment request.");
  }
  if (
    url.protocol !== "upi:" ||
    url.hostname !== "pay" ||
    url.username ||
    url.password ||
    url.port ||
    url.hash ||
    (url.pathname !== "" && url.pathname !== "/")
  ) {
    return invalidQr("The scanned QR code is not a valid UPI payment request.");
  }
  for (const field of singleValueFields) {
    if (url.searchParams.getAll(field).length > 1) {
      return invalidQr("The scanned QR code contains duplicate UPI payment details.");
    }
  }

  const payeeUpiId = (url.searchParams.get("pa") ?? "").trim().toLowerCase();
  const currency = (url.searchParams.get("cu") ?? "INR").trim().toUpperCase();
  const qrAmount = (url.searchParams.get("am") ?? "").trim();
  const payeeName = (url.searchParams.get("pn") ?? "").trim();
  const note = (url.searchParams.get("tn") ?? "").trim();

  if (!upiIdPattern.test(payeeUpiId) || payeeUpiId !== input.payeeUpiId) {
    return invalidQr("The scanned QR code does not match the submitted UPI ID.");
  }
  if (currency !== "INR") return invalidQr("Only INR UPI payments are supported.");
  if (payeeName.length > 100 || note.length > 80) {
    return invalidQr("The scanned QR code contains payment details that are too long.");
  }
  if (qrAmount) {
    if (!amountPattern.test(qrAmount) || amountInPaise(qrAmount) <= 0n) {
      return invalidQr("The scanned QR code contains an invalid amount.");
    }
    if (amountInPaise(qrAmount) !== amountInPaise(input.amount)) {
      return invalidQr("The amount cannot be changed for this UPI QR code.");
    }
  }

  let upiUri = input.qrUpiUri!;
  if (!qrAmount && !url.searchParams.has("sign")) {
    url.searchParams.set("am", input.amount);
    upiUri = url.toString();
  }

  return {
    note: note || null,
    payeeName: payeeName || null,
    payeeUpiId,
    upiUri,
  };
}

export function prepareUpiPayment(input: CreatePaymentBody, transactionRef: string) {
  if (input.source === "QR_SCAN") return parseScannedUpiUri(input);

  const query = new URLSearchParams({
    pa: input.payeeUpiId,
    am: input.amount,
    cu: "INR",
    tr: transactionRef,
  });
  if (input.payeeName) query.set("pn", input.payeeName);
  if (input.note) query.set("tn", input.note);
  return {
    note: input.note ?? null,
    payeeName: input.payeeName ?? null,
    payeeUpiId: input.payeeUpiId,
    upiUri: `upi://pay?${query.toString()}`,
  };
}
