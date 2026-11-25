import "dotenv/config";
import pool from "../db.config/index.js";

async function run() {
  const { rows } = await pool.query("SELECT DISTINCT badge, is_premium FROM users");
  console.log("Distinct user badges in DB:", rows);
  process.exit(0);
}

run().catch(console.error);
