import dotenv from "dotenv";
dotenv.config();
import pkg from "pg";
import fs from "fs";
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "user6",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "watchagocha-db",
  port: Number(process.env.DB_PORT) || 5432,
});

async function main() {
  const schemaData = JSON.parse(fs.readFileSync("schema_dump.json", "utf8"));
  const { schemaMap } = schemaData;

  // Get sample IDs for FK relations
  const userRes = await pool.query(`SELECT id FROM users LIMIT 5`);
  const userId = userRes.rows[0]?.id || 1;

  const getId = async (tableName) => {
    try {
      const res = await pool.query(`SELECT id FROM "${tableName}" LIMIT 1`);
      return res.rows[0]?.id || null;
    } catch {
      return null;
    }
  };

  // Seed parent tables first if missing
  // 1. post_letters
  const postLetterId = await getId("post_letters");
  if (!postLetterId) {
    try {
      const plRes = await pool.query(`
        INSERT INTO "post_letters" ("user_id", "title", "description", "category_id", "status")
        VALUES ($1, 'Sample Post Letter', 'This is a sample post letter description.', 1, true)
        RETURNING id;
      `, [userId]);
      console.log("[SEEDED MANUALLY] post_letters ID:", plRes.rows[0].id);
    } catch (e) {
      console.log("Error inserting post_letters:", e.message);
    }
  }

  // 2. banner
  const bannerId = await getId("banner");
  if (!bannerId) {
    try {
      const bRes = await pool.query(`
        INSERT INTO "banner" ("user_id", "user_username", "image", "status", "startdate", "enddate")
        VALUES ($1, 'user6', 'https://res.cloudinary.com/dcshfycci/image/upload/v1779478259/gfmoxqcxhpe3enjy0bp5.jpg', 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days')
        RETURNING id;
      `, [userId]);
      console.log("[SEEDED MANUALLY] banner ID:", bRes.rows[0].id);
    } catch (e) {
      console.log("Error inserting banner:", e.message);
    }
  }

  // 3. item
  const itemId = await getId("item");
  if (!itemId) {
    try {
      const itemRes = await pool.query(`
        INSERT INTO "item" ("user_id", "title", "price", "description", "category_id", "status")
        VALUES ($1, 'Sample Item Product', 1999, 'Sample item product description.', 1, 'active')
        RETURNING id;
      `, [userId]);
      console.log("[SEEDED MANUALLY] item ID:", itemRes.rows[0].id);
    } catch (e) {
      console.log("Error inserting item:", e.message);
    }
  }

  // Refresh parent IDs after manual seeding
  const validLetterId = (await getId("post_letters")) || 1;
  const validBannerId = (await getId("banner")) || 1;
  const validItemId = (await getId("item")) || 1;
  const validCinematicVidId = (await getId("cinematics_videos")) || 1;
  const validKidVidId = (await getId("kid_vids_videos")) || 1;
  const validFanStarVidId = (await getId("fan_star_videos")) || 1;
  const validTvProgmaxVidId = (await getId("tv_progmax_videos")) || 1;
  const validLhVidId = (await getId("learning_hobbies_videos")) || 1;
  const validNewsId = (await getId("news")) || 1;
  const validGebcId = (await getId("gebc")) || 1;
  const validQafiId = (await getId("qafi")) || 1;
  const validSportsId = (await getId("sports")) || 1;

  // Re-fetch remaining empty tables
  const allTables = Object.keys(schemaMap);
  const emptyTables = [];
  for (const table of allTables) {
    try {
      const cRes = await pool.query(`SELECT COUNT(*) as count FROM "${table}"`);
      if (parseInt(cRes.rows[0].count, 10) === 0) {
        emptyTables.push(table);
      }
    } catch (e) {}
  }

  console.log(`\nRemaining Empty Tables: ${emptyTables.length}`);
  console.log("--------------------------------------------------");

  let success = 0;
  let failed = 0;

  for (const table of emptyTables) {
    const cols = schemaMap[table];
    if (!cols) continue;

    const insertCols = cols.filter(c => {
      if (c.column_name === "id" && c.column_default && c.column_default.includes("nextval")) {
        return false;
      }
      return true;
    });

    const colNames = insertCols.map(c => `"${c.column_name}"`);
    const values = insertCols.map(c => {
      const col = c.column_name.toLowerCase();
      const type = c.data_type.toLowerCase();

      // Check specific column names for foreign keys / logical defaults
      if (col === "user_id" || col === "userid" || col === "user_username_id" || col === "author_id" || col === "sender_id" || col === "receiver_id" || col === "liked_user_id" || col === "reported_user_id") {
        return userId;
      }
      if (col === "letter_id" || col === "post_letter_id") return validLetterId;
      if (col === "banner_id") return validBannerId;
      if (col === "item_id" || col === "product_id") return validItemId;

      if (col === "video_id" || col === "videoid") {
        if (table.includes("cinematic")) return validCinematicVidId;
        if (table.includes("kid")) return validKidVidId;
        if (table.includes("fan")) return validFanStarVidId;
        if (table.includes("tv")) return validTvProgmaxVidId;
        if (table.includes("learning")) return validLhVidId;
        return 1;
      }
      if (col === "news_id") return validNewsId;
      if (col === "gebc_id") return validGebcId;
      if (col === "qafi_id") return validQafiId;
      if (col === "sport_id" || col === "sports_id") return validSportsId;
      if (col === "transaction_id") return 1;

      // Type-based rules
      if (col.includes("link") || col.includes("url")) {
        return "https://example.com";
      }
      if (col.includes("email")) return "testuser@example.com";
      if (col.includes("name") || col.includes("title") || col.includes("subject")) return `Sample ${table.replace(/_/g, ' ')}`;
      if (col.includes("description") || col.includes("content") || col.includes("comment") || col.includes("details") || col.includes("text") || col.includes("message") || col.includes("reason")) {
        return `This is a sample description for ${table}.`;
      }
      if (col.includes("image") || col.includes("pic") || col.includes("avatar") || col.includes("media") || col.includes("file") || col.includes("thumbnail")) {
        return "https://res.cloudinary.com/dcshfycci/image/upload/v1779478259/gfmoxqcxhpe3enjy0bp5.jpg";
      }
      if (col.includes("video")) {
        return "https://www.w3schools.com/html/mov_bbb.mp4";
      }
      if (col.includes("status")) {
        if (table === "contact_us" || table === "mass_app" || table === "item_report") return "pending";
        return "active";
      }
      if (col.includes("type")) {
        return 1; // Integer type ID default if numeric
      }

      if (type.includes("bool")) {
        return true;
      }
      if (type.includes("int") || type.includes("numeric") || type.includes("decimal") || type.includes("double") || type.includes("real")) {
        if (col.includes("price") || col.includes("amount") || col.includes("cost") || col.includes("charge")) return 1999;
        if (col.includes("view") || col.includes("like") || col.includes("count") || col.includes("sort") || col.includes("index")) return 10;
        return 1;
      }
      if (type.includes("date") || type.includes("time")) {
        return new Date().toISOString();
      }
      if (type.includes("json")) {
        return JSON.stringify({ sample: "data" });
      }

      return `Sample ${c.column_name}`;
    });

    const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
    const sql = `INSERT INTO "${table}" (${colNames.join(", ")}) VALUES (${placeholders})`;

    try {
      await pool.query(sql, values);
      console.log(`[SEEDED] ${table} successfully.`);
      success++;
    } catch (err) {
      console.error(`[FAILED] ${table}:`, err.message);
      failed++;
    }
  }

  console.log(`\nRound 2 complete! Success: ${success}, Failed: ${failed}`);
}

main().finally(() => pool.end());
