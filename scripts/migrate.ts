import nextEnv from "@next/env";
import { Pool } from "pg";
import { readFile } from "node:fs/promises";
nextEnv.loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL) {
  if (process.env.VERCEL)
    throw new Error("DATABASE_URL is required. See README.md#deploy-to-vercel.");
  console.log("No DATABASE_URL: skipped database setup. The public demo is available.");
} else {
  if (!process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET.length < 32)
    throw new Error("BETTER_AUTH_SECRET must be at least 32 characters.");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(741928301)");
    await client.query(await readFile(new URL("../db/001_initial.sql", import.meta.url), "utf8"));
    await client.query("COMMIT");
    console.log("Heirloom database schema is ready.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
