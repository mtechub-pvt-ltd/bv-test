import pool from "../db.config/index.js";
import { clearAllCache } from "../utils/cacheService.js";

const subcategoryMapping = [
  { index: 0, oldName: "Entertainment", newName: "Pi Vids", frenchName: "Pi Vids" },
  { index: 1, oldName: "Information", newName: "4 - 23", frenchName: "4 - 23" },
  { index: 2, oldName: "Education", newName: "24 – 65", frenchName: "24 – 65" },
  { index: 3, oldName: "Vlogging", newName: "66⁺", frenchName: "66⁺" },
  { index: 4, oldName: "Uncategorized", newName: "Uncategorized", frenchName: "Tout Autre…" },
];

async function updateVideoManiaSubcategories() {
  console.log("🚀 Updating Video Mania Subcategories...");

  try {
    for (const sub of subcategoryMapping) {
      const res = await pool.query(
        `UPDATE video_sub_category 
         SET name = $1, french_name = $2, updated_at = NOW() 
         WHERE "index" = $3`,
        [sub.newName, sub.frenchName, sub.index]
      );
      console.log(`✔ Updated ${res.rowCount} subcategories at index ${sub.index} -> "${sub.newName}"`);
    }

    clearAllCache();
    console.log("✨ Cache cleared successfully.");

    // Verify subcategories for first 3 categories and summary
    const sample = await pool.query(
      `SELECT vc.name as category_name, vsc.id, vsc.name as subcategory_name, vsc.french_name, vsc.index 
       FROM video_sub_category vsc 
       JOIN video_category vc ON vsc.category_id = vc.id 
       WHERE vsc.category_id IN (1, 2, 3) 
       ORDER BY vsc.category_id, vsc.index ASC`
    );

    console.log("\n📋 Sample of Updated Subcategories:");
    console.table(sample.rows);

    const counts = await pool.query(
      `SELECT name, COUNT(*) as count 
       FROM video_sub_category 
       GROUP BY name, "index" 
       ORDER BY "index" ASC`
    );

    console.log("\n📊 Subcategory Counts Across All Categories:");
    console.table(counts.rows);

    process.exit(0);
  } catch (err) {
    console.error("❌ Error updating subcategories:", err);
    process.exit(1);
  }
}

updateVideoManiaSubcategories();
