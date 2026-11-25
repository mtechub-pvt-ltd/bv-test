import fs from "fs";
import pool from "../db.config/index.js";
import { clearAllCache } from "../utils/cacheService.js";

const vmCache = JSON.parse(fs.readFileSync("./scripts/data/real_videomania_cache.json"));
const allVmItems = [];
for (const [cat, list] of Object.entries(vmCache)) {
  for (const item of list) {
    if (item.videoUrl && item.thumbUrl && item.title) {
      allVmItems.push(item);
    }
  }
}
console.log(`Loaded ${allVmItems.length} verified items from real_videomania_cache.json`);

// Helper to clean up titles and descriptions
function cleanText(text) {
  if (!text) return "";
  if (Array.isArray(text)) text = text.join(" ");
  return String(text)
    .replace(/<[^>]*>/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/youtube|download|mp4|ia\.mp4|official video|full video|archive\.org/gi, "")
    .replace(/[_\-\|\/\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function updateTable(tableName, items) {
  console.log(`\n🎬 Updating ${tableName} (target: ${items.length} records, 5 per subcat)...`);
  
  // Fetch all rows ordered by category and subcategory
  const rows = (await pool.query(
    `SELECT id, category_id, sub_category_id 
     FROM ${tableName} 
     ORDER BY category_id, sub_category_id, id`
  )).rows;

  console.log(`Found ${rows.length} rows in ${tableName}.`);

  const CONCURRENCY = 15;
  let cursor = 0;

  async function worker() {
    while (cursor < rows.length) {
      const idx = cursor++;
      const row = rows[idx];
      const media = items[idx % items.length];

      const cleanTitle = cleanText(media.title) || `Featured Presentation`;
      const cleanDesc = cleanText(media.description) || cleanTitle;
      const video = media.videoUrl;
      const thumb = media.thumbUrl || `https://archive.org/services/img/${media.identifier}`;

      if (tableName === "fan_star_videos") {
        await pool.query(
          `UPDATE ${tableName} 
           SET name = $1, description = $2, video = $3, thumbnail = $4, image = $4, type = 'video', status = 'approved', updated_at = NOW() 
           WHERE id = $5`,
          [cleanTitle, cleanDesc, video, thumb, row.id]
        );
      } else {
        await pool.query(
          `UPDATE ${tableName} 
           SET name = $1, description = $2, video = $3, thumbnail = $4, status = 'approved', updated_at = NOW() 
           WHERE id = $5`,
          [cleanTitle, cleanDesc, video, thumb, row.id]
        );
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  const finalCheck = await pool.query(`SELECT count(*) as count, count(DISTINCT thumbnail) as unique_thumbs, count(DISTINCT video) as unique_videos FROM ${tableName}`);
  console.log(`✔ ${tableName} updated: ${finalCheck.rows[0].count} rows (${finalCheck.rows[0].unique_videos} unique videos, ${finalCheck.rows[0].unique_thumbs} unique thumbnails).`);
}

async function main() {
  console.log("==========================================================");
  console.log("🚀 COMPREHENSIVE SEEDING OF ALL 5 VIDEO MODULES");
  console.log("   Kid Vids (175) | Fan Star (200) | Learning Hobbies (225) | Cinematics (250) | TV ProgMax (625)");
  console.log("==========================================================");

  // 1. KID VIDS (175 records)
  // Gather items from Animation (17), Gaming (16), DIY Crafts (15), Unboxing (8), Tutorials (4), Concerts (10), Pranks (1)
  const kidVidPool = [
    ...(vmCache["17"] || []),
    ...(vmCache["16"] || []),
    ...(vmCache["15"] || []),
    ...(vmCache["8"] || []),
    ...(vmCache["4"] || []),
    ...(vmCache["10"] || []),
    ...(vmCache["1"] || [])
  ];
  await updateTable("kid_vids_videos", kidVidPool);

  // 2. FAN STAR (200 records)
  // Gather items from Concerts (10), Comedy (2), Sketches (3), Vlogs (6), Challenges (5), Unboxing (8), Motivational (18), Fitness (13)
  const fanStarPool = [
    ...(vmCache["10"] || []),
    ...(vmCache["2"] || []),
    ...(vmCache["3"] || []),
    ...(vmCache["6"] || []),
    ...(vmCache["5"] || []),
    ...(vmCache["8"] || []),
    ...(vmCache["18"] || []),
    ...(vmCache["13"] || [])
  ];
  await updateTable("fan_star_videos", fanStarPool);

  // 3. LEARNING HOBBIES (225 records)
  // Gather items from Tutorials (4), Technology (7), Explainer (9), Cooking (11), Fitness (13), Crafts (15), Business (20), Culture (21), Travel (12)
  const learningPool = [
    ...(vmCache["4"] || []),
    ...(vmCache["7"] || []),
    ...(vmCache["9"] || []),
    ...(vmCache["11"] || []),
    ...(vmCache["13"] || []),
    ...(vmCache["15"] || []),
    ...(vmCache["20"] || []),
    ...(vmCache["21"] || []),
    ...(vmCache["12"] || [])
  ];
  await updateTable("learning_hobbies_videos", learningPool);

  // 4. CINEMATICS (250 records)
  // Gather items from Storytelling (19), Sketches (3), Travel (12), Culture (21), Vlogs (6), Comedy (2), Motivational (18) + feature film pool
  const cinematicsPool = [
    ...(vmCache["19"] || []),
    ...(vmCache["3"] || []),
    ...(vmCache["12"] || []),
    ...(vmCache["21"] || []),
    ...(vmCache["6"] || []),
    ...(vmCache["2"] || []),
    ...(vmCache["18"] || []),
    ...(vmCache["14"] || []),
    ...(vmCache["5"] || []),
    ...(vmCache["7"] || [])
  ];
  await updateTable("cinematics_videos", cinematicsPool);

  // 5. TV PROGMAX (625 records)
  // Broadcast across all high-definition categories
  const tvProgmaxPool = [...allVmItems];
  await updateTable("tv_progmax_videos", tvProgmaxPool);

  // Clear Redis / backend cache
  try {
    await clearAllCache();
    console.log("\n✔ Application and Redis cache cleared!");
  } catch (e) {
    console.warn("Cache notice:", e.message);
  }

  console.log("\n🎉 ALL 5 VIDEO MODULES SUCCESSFULLY UPDATED WITH REAL VIDEOS & MATCHED THUMBNAILS!");
  process.exit(0);
}

main();
