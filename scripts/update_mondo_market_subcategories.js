import pool from "../db.config/index.js";

async function fixMondoMarketSubcategories() {
  console.log("==================================================");
  console.log("🛍 FIXING ALL 5 MONDO MARKET CATEGORIES & SUBCATEGORIES (EUROPE, AMERICAS, ASIA, AFRICA, UNCATEGORIZED)");
  console.log("==================================================");

  const client = await pool.connect();

  try {
    const { rows: imgRows } = await client.query(`
      SELECT DISTINCT image as url FROM item_images WHERE image IS NOT NULL AND image LIKE 'https://%'
      UNION
      SELECT DISTINCT image as url FROM pic_tours WHERE image IS NOT NULL AND image LIKE 'https://%'
      UNION
      SELECT DISTINCT thumbnail as url FROM xpi_videos WHERE thumbnail IS NOT NULL AND thumbnail LIKE 'https://%'
    `);
    const imagePool = imgRows.map((r) => r.url);

    await client.query("BEGIN;");

    const targetCategories = [
      { name: "Europe", french_name: "Europe", index: 0 },
      { name: "Americas", french_name: "Les Amériques", index: 1 },
      { name: "Asia", french_name: "Asie", index: 2 },
      { name: "Africa", french_name: "Afrique", index: 3 },
      { name: "Uncategorized", french_name: "Tout Autre…", index: 4 },
    ];

    // 1. Update item_category
    const existingMainCats = (await client.query("SELECT id, name, french_name, index FROM item_category ORDER BY id")).rows;
    for (const target of targetCategories) {
      let match = existingMainCats.find(
        (c) => c.name.trim().toLowerCase() === target.name.trim().toLowerCase()
      );

      if (match) {
        await client.query(
          "UPDATE item_category SET name = $1, french_name = $2, index = $3, updated_at = NOW() WHERE id = $4",
          [target.name, target.french_name, target.index, match.id]
        );
      } else {
        await client.query(
          `INSERT INTO item_category (name, french_name, index, created_at, updated_at)
           VALUES ($1, $2, $3, NOW(), NOW())`,
          [target.name, target.french_name, target.index]
        );
      }
    }

    // 2. Update item_sub_category for each category
    const mainCats = (await client.query("SELECT id, name FROM item_category ORDER BY index")).rows;

    for (const cat of mainCats) {
      const existingSubs = (
        await client.query(
          "SELECT id, name, french_name, index FROM item_sub_category WHERE category_id = $1 ORDER BY id",
          [cat.id]
        )
      ).rows;

      const keptSubIds = [];

      for (const target of targetCategories) {
        let match = existingSubs.find(
          (s) => s.name.trim().toLowerCase() === target.name.trim().toLowerCase()
        );

        let subId;
        if (match) {
          await client.query(
            "UPDATE item_sub_category SET name = $1, french_name = $2, index = $3, updated_at = NOW() WHERE id = $4",
            [target.name, target.french_name, target.index, match.id]
          );
          subId = match.id;
        } else {
          const insertRes = await client.query(
            `INSERT INTO item_sub_category (category_id, name, french_name, index, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id`,
            [cat.id, target.name, target.french_name, target.index]
          );
          subId = insertRes.rows[0].id;
        }
        keptSubIds.push(subId);
      }

      // Ensure each of the 5 subcategories has at least 6 items
      for (let sIdx = 0; sIdx < keptSubIds.length; sIdx++) {
        const subId = keptSubIds[sIdx];
        const subName = targetCategories[sIdx]?.name || "Product";
        const countRes = await client.query(
          "SELECT COUNT(*) as count FROM item WHERE item_category = $1 AND sub_category = $2",
          [cat.id, subId]
        );
        const count = Number(countRes.rows[0]?.count) || 0;

        if (count < 6) {
          const needed = 6 - count;
          for (let j = 1; j <= needed; j++) {
            const imgIdx = (cat.id * 31 + subId * 17 + j * 7) % imagePool.length;
            const title = `${cat.name} ${subName}: Premium Marketplace Item #${j}`;
            const desc = `Authentic, high-quality product listed in ${cat.name} region (${subName}) with verified seller assurance.`;

            const itemInsertRes = await client.query(
              `INSERT INTO item (user_id, item_category, sub_category, title, description, price, condition, location, city, state, region, paid_status, country_code, country, status, created_at, updated_at)
               VALUES (2, $1, $2, $3, $4, $5, 'new', 'International Hub', 'Paris', 'Ile-de-France', $6, true, 'FR', 'France', 'active', NOW(), NOW())
               RETURNING id`,
              [cat.id, subId, title, desc, 49 + j * 10, cat.name]
            );
            const newItemId = itemInsertRes.rows[0].id;

            await client.query(
              `INSERT INTO item_images (item_id, image, created_at, updated_at)
               VALUES ($1, $2, NOW(), NOW())`,
              [newItemId, imagePool[imgIdx]]
            );
          }
        }
      }

      console.log(`✔ [Category: ${cat.name}] -> Configured all 5 subcategories: Europe (0), Americas (1), Asia (2), Africa (3), Uncategorized (4)`);
    }

    await client.query("COMMIT;");
    console.log("\n==================================================");
    console.log("🎉 ALL 5 MONDO MARKET CATEGORIES & SUBCATEGORIES FULLY CONFIGURED!");
    console.log("==================================================");
  } catch (err) {
    await client.query("ROLLBACK;").catch(() => {});
    console.error("Fatal Error:", err);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

fixMondoMarketSubcategories();
