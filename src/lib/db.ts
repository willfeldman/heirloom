import { Pool, type QueryResultRow } from "pg";
const globalDB = globalThis as unknown as { heirloomPool?: Pool };
export function pool() {
  if (!process.env.DATABASE_URL)
    throw new Error("Database is not configured. Follow the deployment guide.");
  if (!globalDB.heirloomPool)
    globalDB.heirloomPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 10_000,
    });
  return globalDB.heirloomPool;
}
export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  values: unknown[] = [],
) {
  return (await pool().query<T>(sql, values)).rows;
}
