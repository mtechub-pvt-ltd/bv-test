import pool from "../db.config/index.js";
import { clearAllCache } from "../utils/cacheService.js";

const categories = [
  { id: 1, name: "Pranks", french_name: "Blagues", index: 0 },
  { id: 2, name: "Comedy", french_name: "Comédie", index: 1 },
  { id: 3, name: "Sketches", french_name: "Sketches", index: 2 },
  { id: 4, name: "Tutorial", french_name: "Tutoriels", index: 3 },
  { id: 5, name: "Challenges", french_name: "Défis", index: 4 },
  { id: 6, name: "Vlogs", french_name: "Vlogs", index: 5 },
  { id: 7, name: "Technology & AI", french_name: "Technologie et IA", index: 6 },
  { id: 8, name: "Unboxing", french_name: "Déballage", index: 7 },
  { id: 9, name: "Explainer", french_name: "Vidéos explicatives", index: 8 },
  { id: 10, name: "Concerts", french_name: "Concerts", index: 9 },
  { id: 11, name: "Cooking", french_name: "Cuisine", index: 10 },
  { id: 12, name: "Travel", french_name: "Voyages", index: 11 },
  { id: 13, name: "Fitness", french_name: "Fitness", index: 12 },
  { id: 14, name: "Beauty & Fashion", french_name: "Beauté et Mode", index: 13 },
  { id: 15, name: "DIY & Crafts", french_name: "Bricolage et Artisanat", index: 14 },
  { id: 16, name: "Gaming", french_name: "Jeux vidéo", index: 15 },
  { id: 17, name: "Animation", french_name: "Animation", index: 16 },
  { id: 18, name: "Motivational", french_name: "Motivation", index: 17 },
  { id: 19, name: "Storytelling", french_name: "Récits", index: 18 },
  { id: 20, name: "Business", french_name: "Affaires", index: 19 },
  { id: 21, name: "Social & Cultural", french_name: "Social et Culturel", index: 20 },
];

const defaultSubcategories = [
  { name: "Entertainment", french_name: "Divertissement", index: 0 },
  { name: "Information", french_name: "Information", index: 1 },
  { name: "Education", french_name: "Éducation", index: 2 },
  { name: "Vlogging", french_name: "Vlogging", index: 3 },
  { name: "Uncategorized", french_name: "Tout Autre…", index: 4 },
];

async function updateVideoManiaCategories() {
  console.log("🚀 Updating Video Mania Categories...");

  try {
    for (const cat of categories) {
      // Check if category exists
      const existing = await pool.query("SELECT * FROM video_category WHERE id = $1", [cat.id]);

      if (existing.rows.length > 0) {
        // Update category name without removing/recreating record
        await pool.query(
          `UPDATE video_category 
           SET name = $1, french_name = $2, "index" = $3, updated_at = NOW() 
           WHERE id = $4`,
          [cat.name, cat.french_name, cat.index, cat.id]
        );
        console.log(`✔ Updated category ID ${cat.id}: "${cat.name}"`);
      } else {
        // Insert new category
        await pool.query(
          `INSERT INTO video_category (id, name, french_name, "index", created_at, updated_at) 
           VALUES ($1, $2, $3, $4, NOW(), NOW())`,
          [cat.id, cat.name, cat.french_name, cat.index]
        );
        console.log(`✔ Inserted category ID ${cat.id}: "${cat.name}"`);

        // Ensure sequence is updated if needed
        await pool.query(
          `SELECT setval('video_category_id_seq', (SELECT MAX(id) FROM video_category))`
        );
      }

      // Check subcategories for this category
      const subRes = await pool.query(
        "SELECT * FROM video_sub_category WHERE category_id = $1",
        [cat.id]
      );

      if (subRes.rows.length === 0) {
        for (const sub of defaultSubcategories) {
          await pool.query(
            `INSERT INTO video_sub_category (category_id, name, french_name, "index", created_at, updated_at) 
             VALUES ($1, $2, $3, $4, NOW(), NOW())`,
            [cat.id, sub.name, sub.french_name, sub.index]
          );
        }
        console.log(`  ➕ Added standard subcategories for category ID ${cat.id}`);
      }
    }

    clearAllCache();
    console.log("✨ Cache cleared successfully.");

    // Fetch and display all updated categories
    const all = await pool.query(
      `SELECT c.id, c.name, c.french_name, c.index, COUNT(sc.id) AS sub_count 
       FROM video_category c 
       LEFT JOIN video_sub_category sc ON c.id = sc.category_id 
       GROUP BY c.id 
       ORDER BY c."index" ASC, c.id ASC`
    );

    console.log("\n📋 Final Video Mania Categories in DB:");
    console.table(all.rows);

    process.exit(0);
  } catch (err) {
    console.error("❌ Error updating categories:", err);
    process.exit(1);
  }
}

updateVideoManiaCategories();
