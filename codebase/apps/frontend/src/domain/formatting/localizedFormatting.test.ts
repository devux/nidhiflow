import { describe, expect, it } from "@jest/globals";

import { formatMonth, formatWholeCurrency } from "./localizedFormatting";

describe("localized formatting", () => {
  it("formats currency using the selected locale and currency", () => {
    expect(formatWholeCurrency(1250n, "USD", "en-US")).toBe("$1,250");
    expect(formatWholeCurrency(1250n, "INR", "en-IN")).toContain("1,250");
  });

  it("formats month labels in the selected timezone", () => {
    expect(formatMonth(new Date("2026-06-15T12:00:00Z"), "en-GB", "UTC")).toBe("June 2026");
  });
});
