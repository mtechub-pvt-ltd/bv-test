import pool from "../db.config/index.js";
import { clearAllCache } from "../utils/cacheService.js";

const subcategoryMapping = [
  { index: 0, oldName: "Phone Based Apps", newName: "Recent Apps", frenchName: "Applis Récentes" },
  { index: 1, oldName: "Favorite Apps", newName: "Favorite", frenchName: "Favoris" },
  { index: 2, oldName: "Recent Apps", newName: "Popular", frenchName: "Populaires" },
  { index: 3, oldName: "Uncategorized", newName: "Local", frenchName: "Locales" },
];

async function updateMassAppSubcategories() {
  console.log("🚀 Updating Mass App Subcategories...");

  try {
    for (const sub of subcategoryMapping) {
      const res = await pool.query(
        `UPDATE app_sub_category 
         SET name = $1, french_name = $2, updated_at = NOW() 
         WHERE "index" = $3`,
        [sub.newName, sub.frenchName, sub.index]
      );
      console.log(`✔ Updated ${res.rowCount} subcategories at index ${sub.index} -> "${sub.newName}" ("${sub.frenchName}")`);
    }

    clearAllCache();
    console.log("✨ Cache cleared successfully.");

    // Verify subcategories for first 3 categories
    const sample = await pool.query(
      `SELECT ac.name as category_name, asc_table.id, asc_table.name as subcategory_name, asc_table.french_name, asc_table.index 
       FROM app_sub_category asc_table 
       JOIN app_category ac ON asc_table.category_id = ac.id 
       WHERE asc_table.category_id IN (1, 2, 3) 
       ORDER BY asc_table.category_id, asc_table.index ASC`
    );

    console.log("\n📋 Sample of Updated Mass App Subcategories:");
    console.table(sample.rows);

    const counts = await pool.query(
      `SELECT name, french_name, "index", COUNT(*) as count 
       FROM app_sub_category 
       GROUP BY name, french_name, "index" 
       ORDER BY "index" ASC`
    );

    console.log("\n📊 Subcategory Counts Across All 30 Mass App Categories:");
    console.table(counts.rows);

    process.exit(0);
  } catch (err) {
    console.error("❌ Error updating mass app subcategories:", err);
    process.exit(1);
  }
}

updateMassAppSubcategories();
