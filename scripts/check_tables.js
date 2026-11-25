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
  try {
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log("Total tables found:", tablesResult.rows.length);
    console.log("-----------------------------------------");

    const emptyTables = [];
    const populatedTables = [];

    for (const row of tablesResult.rows) {
      const tableName = row.table_name;
      try {
        const countRes = await pool.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
        const count = parseInt(countRes.rows[0].count, 10);
        if (count === 0) {
          emptyTables.push(tableName);
          console.log(`[EMPTY] ${tableName}: 0 rows`);
        } else {
          populatedTables.push({ tableName, count });
          console.log(`[OK] ${tableName}: ${count} rows`);
        }
      } catch (err) {
        console.error(`Error counting table ${tableName}:`, err.message);
      }
    }

    console.log("\n================ SUMMARY ================");
    console.log(`Populated Tables (${populatedTables.length}):`, populatedTables.map(t => `${t.tableName} (${t.count})`).join(", "));
    console.log(`Empty Tables (${emptyTables.length}):`, emptyTables.join(", "));

  } catch (err) {
    console.error("Error connecting or executing:", err);
  } finally {
    await pool.end();
  }
}

main();
