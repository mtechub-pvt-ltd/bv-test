/**
 * Creates ONLY the generic `top_entries` table (the same statement that lives at the
 * end of model/init.sql). Idempotent. Run from /backend:
 *
 *   node migrations/create_top_entries.js
 *
 * Importing db.config/index.js would also replay the whole init.sql, so this script
 * talks to Postgres directly with the shared connection settings instead.
 */
import fs from "fs";
import pkg from "pg";
import { databaseConfig } from "../db.config/db.js";

const sql = fs.readFileSync("model/init.sql", "utf8");
const start = sql.indexOf("CREATE TABLE IF NOT EXISTS public.top_entries");
if (start === -1) {
  console.error("top_entries statement not found in model/init.sql");
  process.exit(1);
}

const client = new pkg.Client(databaseConfig);
try {
  await client.connect();
  await client.query(sql.slice(start));
  const cols = await client.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'top_entries' ORDER BY ordinal_position"
  );
  const cons = await client.query(
    "SELECT conname FROM pg_constraint WHERE conrelid = 'public.top_entries'::regclass ORDER BY 1"
  );
  console.log("columns:    ", cols.rows.map((r) => `${r.column_name}:${r.data_type}`).join(", "));
  console.log("constraints:", cons.rows.map((r) => r.conname).join(", "));
} catch (err) {
  console.error("Failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
