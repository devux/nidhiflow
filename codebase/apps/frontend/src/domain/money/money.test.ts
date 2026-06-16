import { describe, expect, it } from "@jest/globals";

import { formatMoney, parseMoneyInput } from "./money";

describe("money", () => {
  it("parses decimal input into exact integer minor units", () => {
    expect(parseMoneyInput("123456789012345.67", "USD")).toEqual({
      amountMinor: "12345678901234567",
      currency: "USD",
    });
    expect(parseMoneyInput("10.999", "USD")).toBeUndefined();
    expect(parseMoneyInput("0", "USD")).toBeUndefined();
  });

  it("formats exact minor units without converting financial values to Number", () => {
    expect(formatMoney({ amountMinor: "12345678901234567", currency: "USD" }, "en-US")).toBe(
      "$123,456,789,012,345.67",
    );
    expect(
      formatMoney({ amountMinor: "50", currency: "GBP" }, "en-GB", {
        sign: "negative",
      }),
    ).toBe("-£0.50");
  });
});
