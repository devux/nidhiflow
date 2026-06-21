import { describe, expect, it } from "@jest/globals";

import { parseFrontendEnvironment } from "./environment";

describe("parseFrontendEnvironment", () => {
  it("accepts a valid API URL", () => {
    expect(
      parseFrontendEnvironment({
        FLOW_AI_ENABLED: "true",
        NIDHIFLOW_API_BASE_URL: "http://localhost:3000",
      }),
    ).toEqual({
      FLOW_AI_ENABLED: true,
      NIDHIFLOW_API_BASE_URL: "http://localhost:3000",
    });
  });

  it("defaults Flow AI to disabled", () => {
    expect(
      parseFrontendEnvironment({
        NIDHIFLOW_API_BASE_URL: "http://localhost:3000",
      }),
    ).toEqual({
      FLOW_AI_ENABLED: false,
      NIDHIFLOW_API_BASE_URL: "http://localhost:3000",
    });
  });

  it("rejects a malformed API URL without exposing its value", () => {
    expect(() => parseFrontendEnvironment({ NIDHIFLOW_API_BASE_URL: "not-a-url" })).toThrow(
      "Invalid frontend environment configuration.",
    );
  });
});
