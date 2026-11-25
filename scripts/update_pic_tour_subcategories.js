import pool from "../db.config/index.js";

async function updatePicTourSubcategories() {
  console.log("==================================================");
  console.log("📸 UPDATING PIC TOURS SUBCATEGORIES (5 PER CATEGORY)");
  console.log("==================================================");

  const client = await pool.connect();

  try {
    // 1. Gather all unique valid live image URLs from DB
    const { rows: imgRows } = await client.query(`
      SELECT DISTINCT image as url FROM pic_tours WHERE image IS NOT NULL AND image LIKE 'https://%'
      UNION
      SELECT DISTINCT thumbnail as url FROM xpi_videos WHERE thumbnail IS NOT NULL AND thumbnail LIKE 'https://%'
    `);
    const imagePool = imgRows.map((r) => r.url);
    console.log(`Loaded ${imagePool.length} live images for any new records.`);

    await client.query("BEGIN;");

    // 2. Fetch all main categories in pic_category
    const mainCats = (await client.query("SELECT id, name FROM pic_category ORDER BY id")).rows;
    console.log(`Found ${mainCats.length} main categories in Pic Tours.`);

    const targetSubCategories = [
      { name: "Photo", french_name: "Photo", index: 0 },
      { name: "Selfy", french_name: "Selfy", index: 1 },
      { name: "Portrait", french_name: "Portrait", index: 2 },
      { name: "Pano", french_name: "Pano", index: 3 },
      { name: "Uncategorized", french_name: "Toute Autre…", index: 4 },
    ];

    for (const cat of mainCats) {
      // Get existing subcategories for this category ordered by id
      const existingSubs = (
        await client.query(
          "SELECT id, name, index FROM pic_sub_category WHERE category_id = $1 ORDER BY id",
          [cat.id]
        )
      ).rows;

      // Update first 4 existing subcategories to Photo, Selfy, Portrait, Pano
      for (let i = 0; i < 4; i++) {
        if (existingSubs[i]) {
          await client.query(
            "UPDATE pic_sub_category SET name = $1, french_name = $2, index = $3, updated_at = NOW() WHERE id = $4",
            [
              targetSubCategories[i].name,
              targetSubCategories[i].french_name,
              targetSubCategories[i].index,
              existingSubs[i].id,
            ]
          );
        }
      }

      // Check if 5th subcategory (Uncategorized) already exists or needs to be inserted
      let uncategorizedSub = existingSubs[4];
      if (!uncategorizedSub) {
        // Check by name if one exists
        const checkUncat = await client.query(
          "SELECT id FROM pic_sub_category WHERE category_id = $1 AND name = $2",
          [cat.id, "Uncategorized"]
        );
        if (checkUncat.rows.length > 0) {
          uncategorizedSub = checkUncat.rows[0];
          await client.query(
            "UPDATE pic_sub_category SET french_name = $1, index = $2, updated_at = NOW() WHERE id = $3",
            ["Toute Autre…", 4, uncategorizedSub.id]
          );
        } else {
          const insertRes = await client.query(
            `INSERT INTO pic_sub_category (category_id, name, french_name, index, created_at, updated_at) 
             VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id`,
            [cat.id, "Uncategorized", "Toute Autre…", 4]
          );
          uncategorizedSub = insertRes.rows[0];
        }
      } else {
        await client.query(
          "UPDATE pic_sub_category SET name = $1, french_name = $2, index = $3, updated_at = NOW() WHERE id = $4",
          ["Uncategorized", "Toute Autre…", 4, uncategorizedSub.id]
        );
      }

      // Ensure 6 sample tours exist for the Uncategorized subcategory
      const tourCountRes = await client.query(
        "SELECT COUNT(*) as count FROM pic_tours WHERE pic_category = $1 AND sub_category = $2",
        [cat.id, uncategorizedSub.id]
      );
      const existingTourCount = Number(tourCountRes.rows[0]?.count) || 0;

      if (existingTourCount === 0) {
        for (let j = 1; j <= 6; j++) {
          const imgIdx = (cat.id * 37 + uncategorizedSub.id * 11 + j * 7) % imagePool.length;
          const tourName = `${cat.name} Uncategorized: High-Def Showcase #${j}`;
          const tourDesc = `Stunning photographic tour capture in ${cat.name} (Uncategorized) presenting vibrant moments and rich detail.`;
          await client.query(
            `INSERT INTO pic_tours (name, description, image, pic_category, sub_category, user_id, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, 2, 'active', NOW(), NOW())`,
            [tourName, tourDesc, imagePool[imgIdx], cat.id, uncategorizedSub.id]
          );
        }
      }

      console.log(`✔ [Category: ${cat.name}] -> 5 Subcategories configured: Photo, Selfy, Portrait, Pano, Uncategorized`);
    }

    await client.query("COMMIT;");
    console.log("\n==================================================");
    console.log("🎉 ALL PIC TOURS SUBCATEGORIES SUCCESSFULLY UPDATED!");
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

updatePicTourSubcategories();
