import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import pkg from "pg";
const { Pool } = pkg;

dotenv.config();

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3801";

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "user6",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "watchagocha-db",
  port: Number(process.env.DB_PORT) || 5432,
});

// Load all valid local images from uploads/fileUpload
const uploadFiles = fs
  .readdirSync("uploads/fileUpload")
  .filter((f) => (f.endsWith(".jpg") || f.endsWith(".png")) && !f.includes("banner") && !f.includes("sig"))
  .map((f) => `${BASE_URL}/fileUpload/${f}`);

console.log(`Loaded ${uploadFiles.length} distinct uploaded media assets.`);

// Curate diverse sub-pools for each major category theme
function getCategoryPool(categoryName, moduleName) {
  const seed = (String(categoryName).length * 17 + String(moduleName).length * 31);
  const poolSize = 12;
  const startIdx = (seed * 13) % (uploadFiles.length - poolSize);
  return uploadFiles.slice(startIdx, startIdx + poolSize);
}

async function main() {
  console.log("==================================================");
  console.log("🔀 DIVERSIFYING & MIXING GRID MEDIA ACROSS ALL MODULES");
  console.log("==================================================");

  const client = await pool.connect();

  try {
    // 1. ON-NEWS
    console.log("1. Mixing media in On-News...");
    const newsCats = (await client.query("SELECT id, name FROM news_category ORDER BY id")).rows;
    for (const cat of newsCats) {
      const catPool = getCategoryPool(cat.name, "news");
      const newsRows = (await client.query("SELECT id, sub_category FROM news WHERE category = $1 ORDER BY id", [cat.id])).rows;
      for (let i = 0; i < newsRows.length; i++) {
        const img = catPool[i % catPool.length];
        await client.query("UPDATE news SET image = $1 WHERE id = $2", [img, newsRows[i].id]);
      }
      // Top news for this category
      await client.query("UPDATE top_news SET image = $1 WHERE disc_category = $2", [catPool[0], cat.id]);
    }
    console.log(`✔ On-News: Mixed across ${newsCats.length} categories.`);

    // 2. SPORT & SPORT
    console.log("\n2. Mixing media in Sport & Sport...");
    const sportCats = (await client.query("SELECT id, name FROM sports_category ORDER BY id")).rows;
    for (const cat of sportCats) {
      const catPool = getCategoryPool(cat.name, "sports");
      const sportRows = (await client.query("SELECT id, sub_category_id FROM sports WHERE category_id = $1 ORDER BY id", [cat.id])).rows;
      for (let i = 0; i < sportRows.length; i++) {
        const img = catPool[i % catPool.length];
        await client.query("UPDATE sports SET image = $1 WHERE id = $2", [img, sportRows[i].id]);
      }
    }
    console.log(`✔ Sport & Sport: Mixed across ${sportCats.length} categories.`);

    // 3. PIC TOURS
    console.log("\n3. Mixing media in Pic Tours...");
    const picCats = (await client.query("SELECT id, name FROM pic_category ORDER BY id")).rows;
    for (const cat of picCats) {
      const catPool = getCategoryPool(cat.name, "pic");
      const picRows = (await client.query("SELECT id, sub_category FROM pic_tours WHERE pic_category = $1 ORDER BY id", [cat.id])).rows;
      for (let i = 0; i < picRows.length; i++) {
        const img = catPool[i % catPool.length];
        await client.query("UPDATE pic_tours SET image = $1 WHERE id = $2", [img, picRows[i].id]);
      }
      await client.query("UPDATE top_tours SET image = $1 WHERE pic_category = $2", [catPool[0], cat.id]);
    }
    console.log(`✔ Pic Tours: Mixed across ${picCats.length} categories.`);

    // 4. OPEN LETTERS
    console.log("\n4. Mixing media in Open Letters...");
    const discCats = (await client.query("SELECT id, name FROM disc_category ORDER BY id")).rows;
    for (const cat of discCats) {
      const catPool = getCategoryPool(cat.name, "disc");
      const letterRows = (await client.query("SELECT id FROM post_letters WHERE disc_category = $1 ORDER BY id", [cat.id])).rows;
      for (let i = 0; i < letterRows.length; i++) {
        const img = catPool[i % catPool.length];
        await client.query("UPDATE post_letters_images SET image = $1 WHERE letter_id = $2", [img, letterRows[i].id]);
      }
    }
    console.log(`✔ Open Letters: Mixed across ${discCats.length} categories.`);

    // 5. Q & A
    console.log("\n5. Mixing media in Q & A...");
    const qafiCats = (await client.query("SELECT id, name FROM qafi_category ORDER BY id")).rows;
    for (const cat of qafiCats) {
      const catPool = getCategoryPool(cat.name, "qafi");
      const qafiRows = (await client.query("SELECT id FROM qafi WHERE category = $1 ORDER BY id", [cat.id])).rows;
      for (let i = 0; i < qafiRows.length; i++) {
        const img = catPool[i % catPool.length];
        await client.query("UPDATE qafi SET image = $1 WHERE id = $2", [img, qafiRows[i].id]);
      }
    }
    console.log(`✔ Q & A: Mixed across ${qafiCats.length} categories.`);

    // 6. MONDO MARKET
    console.log("\n6. Mixing media in Mondo Market...");
    const itemCats = (await client.query("SELECT id, name FROM item_category ORDER BY id")).rows;
    for (const cat of itemCats) {
      const catPool = getCategoryPool(cat.name, "item");
      const itemRows = (await client.query("SELECT id FROM item WHERE item_category = $1 ORDER BY id", [cat.id])).rows;
      for (let i = 0; i < itemRows.length; i++) {
        const img = catPool[i % catPool.length];
        await client.query("UPDATE item_images SET image = $1 WHERE item_id = $2", [img, itemRows[i].id]);
      }
    }
    console.log(`✔ Mondo Market: Mixed across ${itemCats.length} categories.`);

    // 7. CINEMATIC
    console.log("\n7. Mixing media in Cinematic...");
    const cineCats = (await client.query("SELECT id, name FROM cinematics_category ORDER BY id")).rows;
    for (const cat of cineCats) {
      const catPool = getCategoryPool(cat.name, "cine");
      const cineRows = (await client.query("SELECT id FROM cinematics_videos WHERE category_id = $1 ORDER BY id", [cat.id])).rows;
      for (let i = 0; i < cineRows.length; i++) {
        const img = catPool[i % catPool.length];
        await client.query("UPDATE cinematics_videos SET thumbnail = $1 WHERE id = $2", [img, cineRows[i].id]);
      }
    }
    console.log(`✔ Cinematic: Mixed across ${cineCats.length} categories.`);

    // 8. LEARNING & HOBBIES
    console.log("\n8. Mixing media in Learning & Hobbies...");
    const learnCats = (await client.query("SELECT id, name FROM learning_hobbies_category ORDER BY id")).rows;
    for (const cat of learnCats) {
      const catPool = getCategoryPool(cat.name, "learn");
      const learnRows = (await client.query("SELECT id FROM learning_hobbies_videos WHERE category_id = $1 ORDER BY id", [cat.id])).rows;
      for (let i = 0; i < learnRows.length; i++) {
        const img = catPool[i % catPool.length];
        await client.query("UPDATE learning_hobbies_videos SET thumbnail = $1 WHERE id = $2", [img, learnRows[i].id]);
      }
    }
    console.log(`✔ Learning & Hobbies: Mixed across ${learnCats.length} categories.`);

    // 9. KID-VID
    console.log("\n9. Mixing media in Kid-Vid...");
    const kidCats = (await client.query("SELECT id, name FROM kid_vids_category ORDER BY id")).rows;
    for (const cat of kidCats) {
      const catPool = getCategoryPool(cat.name, "kid");
      const kidRows = (await client.query("SELECT id FROM kid_vids_videos WHERE category_id = $1 ORDER BY id", [cat.id])).rows;
      for (let i = 0; i < kidRows.length; i++) {
        const img = catPool[i % catPool.length];
        await client.query("UPDATE kid_vids_videos SET thumbnail = $1 WHERE id = $2", [img, kidRows[i].id]);
      }
    }
    console.log(`✔ Kid-Vid: Mixed across ${kidCats.length} categories.`);

    // 10. FAN-STAR ZONE
    console.log("\n10. Mixing media in Fan-Star Zone...");
    const fanCats = (await client.query("SELECT id, name FROM fan_star_category ORDER BY id")).rows;
    for (const cat of fanCats) {
      const catPool = getCategoryPool(cat.name, "fan");
      const fanRows = (await client.query("SELECT id FROM fan_star_videos WHERE category_id = $1 ORDER BY id", [cat.id])).rows;
      for (let i = 0; i < fanRows.length; i++) {
        const img = catPool[i % catPool.length];
        await client.query("UPDATE fan_star_videos SET thumbnail = $1 WHERE id = $2", [img, fanRows[i].id]);
      }
    }
    console.log(`✔ Fan-Star Zone: Mixed across ${fanCats.length} categories.`);

    // 11. TV PROGMAX
    console.log("\n11. Mixing media in tvProgMax...");
    const tvCats = (await client.query("SELECT id, name FROM tv_progmax_category ORDER BY id")).rows;
    for (const cat of tvCats) {
      const catPool = getCategoryPool(cat.name, "tv");
      const tvRows = (await client.query("SELECT id FROM tv_progmax_videos WHERE category_id = $1 ORDER BY id", [cat.id])).rows;
      for (let i = 0; i < tvRows.length; i++) {
        const img = catPool[i % catPool.length];
        await client.query("UPDATE tv_progmax_videos SET thumbnail = $1 WHERE id = $2", [img, tvRows[i].id]);
      }
    }
    console.log(`✔ tvProgMax: Mixed across ${tvCats.length} categories.`);

    // 12. VIDEO MANIA
    console.log("\n12. Mixing media in Video Mania...");
    const xpiCats = (await client.query("SELECT id, name FROM video_category ORDER BY id")).rows;
    for (const cat of xpiCats) {
      const catPool = getCategoryPool(cat.name, "xpi");
      const xpiRows = (await client.query("SELECT id FROM xpi_videos WHERE video_category = $1 ORDER BY id", [cat.id])).rows;
      for (let i = 0; i < xpiRows.length; i++) {
        const img = catPool[i % catPool.length];
        await client.query("UPDATE xpi_videos SET thumbnail = $1 WHERE id = $2", [img, xpiRows[i].id]);
      }
    }
    console.log(`✔ Video Mania: Mixed across ${xpiCats.length} categories.`);

    // 13. EBIC
    console.log("\n13. Mixing media in EBIC...");
    const gebcCats = (await client.query("SELECT id, name FROM gebc_category ORDER BY id")).rows;
    for (const cat of gebcCats) {
      const catPool = getCategoryPool(cat.name, "gebc");
      const gebcRows = (await client.query("SELECT id FROM gebc WHERE category = $1 ORDER BY id", [cat.id])).rows;
      for (let i = 0; i < gebcRows.length; i++) {
        const img = catPool[i % catPool.length];
        await client.query("UPDATE gebc SET image = $1 WHERE id = $2", [img, gebcRows[i].id]);
      }
      await client.query("UPDATE top_gebc SET image = $1 WHERE disc_category = $2", [catPool[0], cat.id]);
    }
    console.log(`✔ EBIC: Mixed across ${gebcCats.length} categories.`);

    console.log("\n==================================================");
    console.log("🎉 ALL GRID ITEMS MIXED AND DIVERSIFIED SUCCESSFULLY!");
    console.log("==================================================");
  } finally {
    client.release();
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
