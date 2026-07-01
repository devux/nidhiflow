import { parseUpiQr, validatePaymentAmount } from "./upi";

describe("UPI payment domain", () => {
  it("parses standard UPI QR fields", () => {
    expect(
      parseUpiQr("upi://pay?pa=Store%40bank&pn=Corner%20Store&am=120.50&tn=Lunch&cu=INR"),
    ).toEqual({
      amount: "120.50",
      currency: "INR",
      note: "Lunch",
      payeeName: "Corner Store",
      payeeUpiId: "store@bank",
    });
  });

  it("rejects non-UPI and non-INR QR values", () => {
    expect(() => parseUpiQr("https://example.com")).toThrow("not a UPI");
    expect(() => parseUpiQr("upi://pay?pa=a@bank&cu=USD")).toThrow("Only INR");
  });

  it("requires positive values with no more than two decimal places", () => {
    expect(validatePaymentAmount("0")).toBe(false);
    expect(validatePaymentAmount("12.25")).toBe(true);
    expect(validatePaymentAmount("12.255")).toBe(false);
  });
});
