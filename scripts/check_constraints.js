import dotenv from "dotenv";
dotenv.config();
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "user6",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "watchagocha-db",
  port: Number(process.env.DB_PORT) || 5432,
});

async function main() {
  const tables = ["post_letters", "letter_reciever_info", "mass_app", "send_offer"];

  for (const t of tables) {
    const cols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = $1;
    `, [t]);
    console.log(`=== ${t} ===`, cols.rows.map(r => r.column_name));
  }

  const checks = await pool.query(`
    SELECT conname, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname = 'public' AND c.contype = 'c';
  `);
  console.log("\n=== CHECK CONSTRAINTS ===");
  checks.rows.forEach(r => console.log(`${r.conname}: ${r.pg_get_constraintdef}`));
}

main().finally(() => pool.end());
