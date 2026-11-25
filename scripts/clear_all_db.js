import pg from "pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

const pool = new pg.Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "user6",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "watchagocha-db",
  port: Number(process.env.DB_PORT) || 5432,
});

async function clearAll() {
  const client = await pool.connect();
  try {
    console.log("Fetching all tables in public schema...");
    const tablesRes = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);

    const tables = tablesRes.rows.map((r) => `"${r.tablename}"`);
    console.log(`Truncating ${tables.length} tables...`);

    await client.query(`TRUNCATE TABLE ${tables.join(", ")} RESTART IDENTITY CASCADE;`);
    console.log("✔ All tables, categories, and data completely cleared!");

    // Create default admin user
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await client.query(
      `INSERT INTO users (username, email, password, role, verified, is_deleted, block, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
      ["Admin", "admin@gmail.com", hashedPassword, "admin", true, false, false]
    );
    console.log("✔ Created default admin: admin@gmail.com / admin123");

    process.exit(0);
  } catch (err) {
    console.error("❌ Error clearing database:", err);
    process.exit(1);
  } finally {
    client.release();
  }
}

clearAll();
