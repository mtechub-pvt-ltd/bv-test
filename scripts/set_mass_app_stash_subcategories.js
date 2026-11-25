import pool from "../db.config/index.js";
import { clearAllCache } from "../utils/cacheService.js";

async function run() {
  console.log("🚀 Updating Mass App subcategories (including 'App Stash')...");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Update existing indices 0, 1, 2, 3
    await client.query(`
      UPDATE app_sub_category SET name = 'Recent Apps', french_name = 'Applis Récentes', updated_at = NOW() WHERE "index" = 0;
      UPDATE app_sub_category SET name = 'Favorite', french_name = 'Favoris', updated_at = NOW() WHERE "index" = 1;
      UPDATE app_sub_category SET name = 'Popular', french_name = 'Populaires', updated_at = NOW() WHERE "index" = 2;
      UPDATE app_sub_category SET name = 'Local', french_name = 'Locales', updated_at = NOW() WHERE "index" = 3;
    `);

    // 2. Rename any App Storage, Storage, or Uncategorized to App Stash
    await client.query(`
      UPDATE app_sub_category 
      SET name = 'App Stash', french_name = 'Réserve d''applications', slug = 'app_stash', "index" = 4, updated_at = NOW() 
      WHERE name ILIKE '%app storage%' OR name ILIKE '%storage%' OR slug ILIKE '%storage%' OR name ILIKE '%uncategorized%';
    `);

    // 3. Ensure index 4 (App Stash) exists for all active categories
    await client.query(`
      INSERT INTO app_sub_category (category_id, name, french_name, slug, "index", enabled, created_at, updated_at)
      SELECT ac.id, 'App Stash', 'Réserve d''applications', 'app_stash', 4, TRUE, NOW(), NOW()
      FROM app_category ac
      WHERE NOT EXISTS (
        SELECT 1 FROM app_sub_category asc_t 
        WHERE asc_t.category_id = ac.id AND (asc_t.index = 4 OR asc_t.name = 'App Stash' OR asc_t.slug = 'app_stash')
      );
    `);

    await client.query("COMMIT");
    console.log("✅ Database transaction committed successfully.");

    clearAllCache();
    console.log("✨ Cache cleared successfully.");

    // Sample output
    const sample = await client.query(
      `SELECT ac.name as category_name, s.id, s.name as subcategory_name, s.french_name, s.index 
       FROM app_sub_category s 
       JOIN app_category ac ON s.category_id = ac.id 
       WHERE s.category_id IN (1, 2) 
       ORDER BY s.category_id, s.index ASC`
    );
    console.log("\n📋 Sample of Updated Mass App Subcategories (Categories 1 & 2):");
    console.table(sample.rows);

    const counts = await client.query(
      `SELECT name, french_name, "index", COUNT(*) as count 
       FROM app_sub_category 
       GROUP BY name, french_name, "index" 
       ORDER BY "index" ASC`
    );
    console.log("\n📊 Subcategory Counts Across All Categories in Mass Apps:");
    console.table(counts.rows);

  } catch (e) {
    await client.query("ROLLBACK");
    console.error("❌ Transaction failed:", e);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

run();
