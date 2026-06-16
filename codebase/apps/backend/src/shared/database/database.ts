import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

import type { Environment } from "../../app/config/environment.js";

export interface Queryable {
  query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ): Promise<QueryResult<Row>>;
}

export interface Database extends Queryable {
  close(): Promise<void>;
  isReady(): Promise<boolean>;
  transaction<Result>(callback: (database: Queryable) => Promise<Result>): Promise<Result>;
}

function createQueryable(client: Pool | PoolClient): Queryable {
  return {
    async query<Row extends QueryResultRow = QueryResultRow>(
      text: string,
      values: readonly unknown[] = [],
    ) {
      return client.query<Row>(text, values as unknown[]);
    },
  };
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
    ...createQueryable(pool),
    async close() {
      await pool.end();
    },
    async isReady() {
      const result = await pool.query<{ ready: number }>("SELECT 1 AS ready");
      return result.rows[0]?.ready === 1;
    },
    async transaction<Result>(callback: (database: Queryable) => Promise<Result>) {
      const client = await pool.connect();

      try {
        await client.query("BEGIN");
        const result = await callback(createQueryable(client));
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
