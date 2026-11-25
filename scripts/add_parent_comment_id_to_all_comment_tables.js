import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new pg.Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "user6",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "watchagocha-db",
  port: Number(process.env.DB_PORT) || 5432,
});

async function main() {
  console.log("==================================================");
  console.log("🛠 ADDING parent_comment_id COLUMN TO ALL COMMENT TABLES");
  console.log("==================================================");

  const commentTables = [
    "news_comment",
    "sport_comment",
    "cinematics_video_comment",
    "fan_star_video_comment",
    "gebc_comment",
    "kid_vids_video_comment",
    "learning_hobbies_video_comment",
    "mondon_market_comment",
    "pic_comment",
    "qafi_comment",
    "tv_progmax_video_comment",
    "comment_post_letter",
    "video_comment",
  ];

  for (const table of commentTables) {
    try {
      await pool.query(`
        ALTER TABLE ${table} 
        ADD COLUMN IF NOT EXISTS parent_comment_id INTEGER NULL;
      `);
      console.log(`✔ [${table}] -> parent_comment_id column ensured.`);
    } catch (err) {
      console.error(`❌ Error on table ${table}:`, err.message);
    }
  }

  console.log("==================================================");
  console.log("🎉 ALL COMMENT TABLES SUCCESSFULLY UPDATED!");
  console.log("==================================================");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
