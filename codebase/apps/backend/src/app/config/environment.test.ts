import { describe, expect, it } from "vitest";

import { parseEnvironment } from "./environment.js";

const validEnvironment: NodeJS.ProcessEnv = {
  APP_ENV: "test",
  PORT: "3000",
  LOG_LEVEL: "info",
  DATABASE_URL: "postgresql://user:password@localhost:5432/nidhiflow_test",
  DATABASE_SSL: "false",
  API_RATE_LIMIT_WINDOW_MS: "60000",
  API_RATE_LIMIT_MAX: "100",
  AUTH_RATE_LIMIT_MAX: "10",
  FEEDBACK_RATE_LIMIT_MAX: "5",
  JWT_ACCESS_ISSUER: "nidhiflow.test",
  JWT_ACCESS_AUDIENCE: "nidhiflow-web",
  JWT_ACCESS_TTL_SECONDS: "900",
  REFRESH_SESSION_TTL_DAYS: "30",
  EMAIL_VERIFICATION_TTL_HOURS: "24",
  PASSWORD_RESET_TTL_HOURS: "2",
  CORS_ORIGINS: "http://localhost:5173",
};

describe("parseEnvironment", () => {
  it("parses valid environment variables into typed configuration", () => {
    const parsed = parseEnvironment(validEnvironment);

    expect(parsed).toMatchObject({
      APP_ENV: "test",
      PORT: 3000,
      LOG_LEVEL: "info",
      DATABASE_URL: validEnvironment.DATABASE_URL,
      DATABASE_SSL: false,
      API_RATE_LIMIT_WINDOW_MS: 60_000,
      API_RATE_LIMIT_MAX: 100,
      AUTH_RATE_LIMIT_MAX: 10,
      FEEDBACK_RATE_LIMIT_MAX: 5,
      APP_PUBLIC_URL: "http://localhost:5173",
      EMAIL_DELIVERY_PROVIDER: "none",
      JWT_ACCESS_ISSUER: "nidhiflow.test",
      JWT_ACCESS_AUDIENCE: "nidhiflow-web",
      JWT_ACCESS_TTL_SECONDS: 900,
      REFRESH_SESSION_TTL_DAYS: 30,
      EMAIL_VERIFICATION_TTL_HOURS: 24,
      PASSWORD_RESET_TTL_HOURS: 2,
      CORS_ORIGINS: ["http://localhost:5173"],
    });
    expect(typeof parsed.JWT_ACCESS_SECRET).toBe("string");
  });

  it("rejects missing configuration without echoing sensitive values", () => {
    expect(() => parseEnvironment({})).toThrow("Invalid backend environment configuration.");
  });

  it("requires Resend credentials when email delivery is enabled", () => {
    expect(() =>
      parseEnvironment({
        ...validEnvironment,
        EMAIL_DELIVERY_PROVIDER: "resend",
      }),
    ).toThrow("Invalid backend environment configuration.");
  });
});
