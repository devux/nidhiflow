import { describe, expect, it } from "vitest";

import type { CreatePaymentBody } from "./payment.schemas.js";
import { prepareUpiPayment } from "./paymentUpiUri.js";

function qrInput(qrUpiUri: string, amount = "125.50"): CreatePaymentBody {
  return {
    amount,
    currency: "INR",
    payeeUpiId: "merchant@bank",
    qrUpiUri,
    selectedUpiApp: "Google Pay",
    source: "QR_SCAN",
  };
}

describe("prepareUpiPayment", () => {
  it("preserves signed merchant QR parameters and references exactly", () => {
    const uri =
      "upi://pay?pa=merchant%40bank&pn=Shop&am=125.50&cu=INR&mc=5411&mode=02&orgid=000000&tr=MERCHANT-1&sign=abc%2B123";

    expect(prepareUpiPayment(qrInput(uri), "NDF-INTERNAL").upiUri).toBe(uri);
  });

  it("adds an amount to an unsigned dynamic QR without removing merchant fields", () => {
    const result = prepareUpiPayment(
      qrInput("upi://pay?pa=merchant%40bank&pn=Shop&mc=5411&tr=MERCHANT-1"),
      "NDF-INTERNAL",
    );
    const uri = new URL(result.upiUri);

    expect(uri.searchParams.get("am")).toBe("125.50");
    expect(uri.searchParams.get("mc")).toBe("5411");
    expect(uri.searchParams.get("tr")).toBe("MERCHANT-1");
  });

  it("does not mutate a signed dynamic QR", () => {
    const uri = "upi://pay?pa=merchant%40bank&mc=5411&sign=signed-value";

    expect(prepareUpiPayment(qrInput(uri), "NDF-INTERNAL").upiUri).toBe(uri);
  });

  it("rejects changed amounts and payees from fixed QR codes", () => {
    expect(() =>
      prepareUpiPayment(qrInput("upi://pay?pa=merchant%40bank&am=99.00&cu=INR"), "NDF-INTERNAL"),
    ).toThrow("amount cannot be changed");
    expect(() =>
      prepareUpiPayment(qrInput("upi://pay?pa=other%40bank&am=125.50&cu=INR"), "NDF-INTERNAL"),
    ).toThrow("does not match");
  });

  it("generates a server reference only for manual entry", () => {
    const result = prepareUpiPayment(
      {
        amount: "20.00",
        currency: "INR",
        payeeUpiId: "friend@bank",
        selectedUpiApp: "BHIM",
        source: "MANUAL_ENTRY",
      },
      "NDF-SERVER",
    );

    expect(new URL(result.upiUri).searchParams.get("tr")).toBe("NDF-SERVER");
  });
});
