import { describe, expect, it } from "vitest";

import { parseEnvironment } from "./environment.js";

const validEnvironment: NodeJS.ProcessEnv = {
  APP_ENV: "test",
  PORT: "3000",
  LOG_LEVEL: "info",
  DATABASE_URL: "postgresql://user:password@localhost:5432/nidhiflow_test",
  DATABASE_SSL: "false",
  CORS_ORIGINS: "http://localhost:5173",
};

describe("parseEnvironment", () => {
  it("parses valid environment variables into typed configuration", () => {
    expect(parseEnvironment(validEnvironment)).toEqual({
      APP_ENV: "test",
      PORT: 3000,
      LOG_LEVEL: "info",
      DATABASE_URL: validEnvironment.DATABASE_URL,
      DATABASE_SSL: false,
      CORS_ORIGINS: ["http://localhost:5173"],
    });
  });

  it("rejects missing configuration without echoing sensitive values", () => {
    expect(() => parseEnvironment({})).toThrow("Invalid backend environment configuration.");
  });
});
