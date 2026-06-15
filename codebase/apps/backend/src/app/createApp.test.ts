import pino from "pino";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import type { Environment } from "./config/environment.js";
import { createApp } from "./createApp.js";
import type { Database } from "../shared/database/database.js";

const environment: Environment = {
  APP_ENV: "test",
  PORT: 3000,
  LOG_LEVEL: "fatal",
  DATABASE_URL: "postgresql://user:password@localhost:5432/nidhiflow_test",
  DATABASE_SSL: false,
  CORS_ORIGINS: ["http://localhost:5173"],
};

function createTestDatabase(isReady: Database["isReady"]): Database {
  return {
    close: vi.fn(),
    isReady,
  };
}

describe("health endpoints", () => {
  it("returns liveness without requiring database access", async () => {
    const isReady = vi.fn();
    const database = createTestDatabase(isReady);
    const app = createApp({ database, environment, logger: pino({ enabled: false }) });

    const response = await request(app).get("/health/live");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
    expect(isReady).not.toHaveBeenCalled();
  });

  it("returns ready when PostgreSQL is available", async () => {
    const database = createTestDatabase(vi.fn().mockResolvedValue(true));
    const app = createApp({ database, environment, logger: pino({ enabled: false }) });

    const response = await request(app).get("/health/ready");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ready" });
  });

  it("hides database failures behind a safe readiness response", async () => {
    const database = createTestDatabase(
      vi.fn().mockRejectedValue(new Error("sensitive database detail")),
    );
    const app = createApp({ database, environment, logger: pino({ enabled: false }) });

    const response = await request(app).get("/health/ready");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: "unavailable" });
    expect(response.text).not.toContain("sensitive database detail");
  });
});
