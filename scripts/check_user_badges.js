import "dotenv/config";
import pool from "../db.config/index.js";

async function run() {
  const { rows } = await pool.query("SELECT id, username, badge, is_premium, is_subscribed FROM users WHERE username ILIKE '%Liam%' OR username ILIKE '%Mtechub%'");
  console.log("Users in DB:", rows);
  process.exit(0);
}

run().catch(console.error);
