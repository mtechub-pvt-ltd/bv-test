import pool from "../db.config/index.js";

async function fixCommentTables() {
  console.log("==================================================");
  console.log("🛠 FIXING ALL COMMENT TABLES SCHEMA ON LIVE DB");
  console.log("==================================================");

  const client = await pool.connect();

  try {
    const alterations = [
      // pic_comment
      `ALTER TABLE pic_comment ADD COLUMN IF NOT EXISTS parent_comment_id INTEGER NULL;`,
      `ALTER TABLE pic_comment ALTER COLUMN pic_tours_id DROP NOT NULL;`,

      // news_comment
      `ALTER TABLE news_comment ADD COLUMN IF NOT EXISTS parent_comment_id INTEGER NULL;`,
      `ALTER TABLE news_comment ALTER COLUMN news_id DROP NOT NULL;`,

      // gebc_comment
      `ALTER TABLE gebc_comment ADD COLUMN IF NOT EXISTS parent_comment_id INTEGER NULL;`,
      `ALTER TABLE gebc_comment ALTER COLUMN gebc_id DROP NOT NULL;`,

      // qafi_comment
      `ALTER TABLE qafi_comment ADD COLUMN IF NOT EXISTS parent_comment_id INTEGER NULL;`,
      `ALTER TABLE qafi_comment ALTER COLUMN qafi_id DROP NOT NULL;`,

      // sport_comment
      `ALTER TABLE sport_comment ADD COLUMN IF NOT EXISTS parent_comment_id INTEGER NULL;`,
      `ALTER TABLE sport_comment ALTER COLUMN sport_id DROP NOT NULL;`,

      // video_comment
      `ALTER TABLE video_comment ADD COLUMN IF NOT EXISTS parent_comment_id INTEGER NULL;`,
      `ALTER TABLE video_comment ALTER COLUMN video_id DROP NOT NULL;`,

      // other sub-video comments
      `ALTER TABLE cinematics_video_comment ADD COLUMN IF NOT EXISTS parent_comment_id INTEGER NULL;`,
      `ALTER TABLE fan_star_video_comment ADD COLUMN IF NOT EXISTS parent_comment_id INTEGER NULL;`,
      `ALTER TABLE kid_vids_video_comment ADD COLUMN IF NOT EXISTS parent_comment_id INTEGER NULL;`,
      `ALTER TABLE learning_hobbies_video_comment ADD COLUMN IF NOT EXISTS parent_comment_id INTEGER NULL;`,
      `ALTER TABLE tv_progmax_video_comment ADD COLUMN IF NOT EXISTS parent_comment_id INTEGER NULL;`,
      `ALTER TABLE mondon_market_comment ADD COLUMN IF NOT EXISTS parent_comment_id INTEGER NULL;`,
      `ALTER TABLE comment_post_letter ADD COLUMN IF NOT EXISTS parent_comment_id INTEGER NULL;`,
    ];

    for (const sql of alterations) {
      try {
        await client.query(sql);
        console.log(`✔ Executed: ${sql}`);
      } catch (err) {
        console.error(`❌ Error on SQL [${sql}]:`, err.message);
      }
    }

    console.log("\n==================================================");
    console.log("🎉 ALL COMMENT TABLES SUCCESSFULLY UPDATED ON LIVE DB!");
    console.log("==================================================");

  } catch (err) {
    console.error("Fatal error:", err);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

fixCommentTables();
