import pool from "../db.config/index.js";
import { clearAllCache } from "../utils/cacheService.js";

async function run() {
  console.log("🚀 Reordering Mass App categories and adding 'Messaging'...");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Check or insert 'Messaging'
    let messagingRes = await client.query(
      "SELECT id FROM app_category WHERE name ILIKE 'messaging' OR name ILIKE 'messages' LIMIT 1"
    );

    let messagingId;
    if (messagingRes.rows.length === 0) {
      const insertRes = await client.query(`
        INSERT INTO app_category (user_id, name, french_name, "index", created_at, updated_at)
        VALUES (1, 'Messaging', 'Messagerie', 2, NOW(), NOW())
        RETURNING id;
      `);
      messagingId = insertRes.rows[0].id;
      console.log(`✅ Created 'Messaging' category with ID ${messagingId}`);
    } else {
      messagingId = messagingRes.rows[0].id;
      console.log(`ℹ️ 'Messaging' category already exists with ID ${messagingId}`);
    }

    // 2. Ensure standard 5 subcategories exist for 'Messaging'
    const standardSubcategories = [
      { name: "Recent Apps", french_name: "Applis Récentes", index: 0, slug: "recent" },
      { name: "Favorite", french_name: "Favoris", index: 1, slug: "favourite" },
      { name: "Popular", french_name: "Populaires", index: 2, slug: "popular" },
      { name: "Local", french_name: "Locales", index: 3, slug: "top_apps" },
      { name: "App Stash", french_name: "Réserve d'applications", index: 4, slug: "app_stash" },
    ];

    for (const sub of standardSubcategories) {
      await client.query(
        `INSERT INTO app_sub_category (category_id, name, french_name, "index", slug, enabled, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [messagingId, sub.name, sub.french_name, sub.index, sub.slug]
      );
    }
    console.log(`✅ Standard subcategories ensured for category ID ${messagingId}`);

    // 3. Rename 'Social Medias & Networks' to 'Social Medias' if needed
    await client.query(`
      UPDATE app_category 
      SET name = 'Social Medias' 
      WHERE name = 'Social Medias & Networks'
    `);

    // 4. Fetch all categories
    const allCatsRes = await client.query(`SELECT id, name, "index" FROM app_category`);
    const allCats = allCatsRes.rows;

    // Find the 5 prioritized categories
    const socialCat = allCats.find((c) => c.name.toLowerCase().startsWith("social media"));
    const videosCat = allCats.find((c) => c.name.toLowerCase() === "videos");
    const messagingCat = allCats.find((c) => c.id === messagingId);
    const vehiclesCat = allCats.find((c) => c.name.toLowerCase() === "vehicles");
    const toolsCat = allCats.find((c) => c.name.toLowerCase().includes("tools"));

    const top5Ids = [
      socialCat?.id,
      videosCat?.id,
      messagingCat?.id,
      vehiclesCat?.id,
      toolsCat?.id,
    ].filter(Boolean);

    console.log("Top 5 category IDs in order:", top5Ids);

    // Order of the top 5
    for (let i = 0; i < top5Ids.length; i++) {
      await client.query(`UPDATE app_category SET "index" = $1, updated_at = NOW() WHERE id = $2`, [
        i,
        top5Ids[i],
      ]);
    }

    // Remaining categories sorted by their existing index
    const remainingCats = allCats
      .filter((c) => !top5Ids.includes(c.id))
      .sort((a, b) => (a.index ?? 1000) - (b.index ?? 1000) || a.id - b.id);

    let currentIndex = top5Ids.length;
    for (const rem of remainingCats) {
      await client.query(`UPDATE app_category SET "index" = $1, updated_at = NOW() WHERE id = $2`, [
        currentIndex,
        rem.id,
      ]);
      currentIndex++;
    }

    await client.query("COMMIT");
    console.log("✅ Database transaction committed successfully.");

    // Clear server cache
    clearAllCache();
    console.log("✨ Cache cleared successfully.");

    // Display final ordered list
    const finalResult = await client.query(
      `SELECT id, name, french_name, "index" FROM app_category ORDER BY "index" ASC`
    );
    console.log("\n📋 All Mass App Categories (Ordered by index ASC):");
    console.table(finalResult.rows);

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Transaction failed:", err);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

run();
