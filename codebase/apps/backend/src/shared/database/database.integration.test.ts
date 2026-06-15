import { afterAll, describe, expect, it } from "vitest";

import { parseEnvironment } from "../../app/config/environment.js";
import { createDatabase } from "./database.js";

const environment = parseEnvironment(process.env);
const database = createDatabase(environment);

describe("PostgreSQL integration", () => {
  afterAll(async () => {
    await database.close();
  });

  it("connects to the configured database", async () => {
    await expect(database.isReady()).resolves.toBe(true);
  });
});
