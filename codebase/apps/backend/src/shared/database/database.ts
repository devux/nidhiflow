import { Pool } from "pg";

import type { Environment } from "../../app/config/environment.js";

export interface Database {
  close(): Promise<void>;
  isReady(): Promise<boolean>;
}

export function createDatabase(environment: Environment): Database {
  const pool = new Pool({
    connectionString: environment.DATABASE_URL,
    ssl: environment.DATABASE_SSL ? { rejectUnauthorized: true } : false,
    max: 10,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  });

  return {
    async close() {
      await pool.end();
    },
    async isReady() {
      const result = await pool.query<{ ready: number }>("SELECT 1 AS ready");
      return result.rows[0]?.ready === 1;
    },
  };
}
