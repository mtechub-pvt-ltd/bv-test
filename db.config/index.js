import pkg from "pg";
import { databaseConfig } from "./db.js";
import fs from "fs";
const { Pool } = pkg;
const pool = new Pool(databaseConfig);
console.log(`[DB] Attempting database connection to target: "${databaseConfig.connectionString ? "DATABASE_URL (Neon)" : databaseConfig.host + "/" + databaseConfig.database}"`);

pool.on("error", (err) => {
  console.error("❌ [DB] Database pool error:", err);
  process.exit(-1);
});

pool.connect((err, client, release) => {
  if (err) {
    console.error("❌ [DB] Error connecting to database:", err.message || err);
  } else {
    console.log("✅ [DB] Connected to database successfully!");
    release();

    try {
      const initSql = fs.readFileSync("model/init.sql").toString();
      pool.query(initSql, (err, result) => {
        if (!err) {
          console.log("✅ [DB] All Database tables initialized successfully.");
        } else {
          console.error("⚠️ [DB] Error occurred while initializing database tables:", err.message || err);
        }
      });
    } catch (fsErr) {
      console.warn("⚠️ [DB] Could not load model/init.sql:", fsErr.message);
    }
  }
});

export default pool;
