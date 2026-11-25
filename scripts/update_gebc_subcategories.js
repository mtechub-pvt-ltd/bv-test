import pool from "../db.config/index.js";

async function updateGebcSubcategories() {
  console.log("==================================================");
  console.log("🎭 UPDATING GEBC / EBIC SUBCATEGORIES (EMOTIONS & REACTIONS, PEOPLE & COMMUNICATION, SYMBOLS & IDEAS, OBJECTS & ACTIVITIES, UNCATEGORIZED)");
  console.log("==================================================");

  const client = await pool.connect();

  try {
    const { rows: imgRows } = await client.query(`
      SELECT DISTINCT image as url FROM gebc WHERE image IS NOT NULL AND image LIKE 'https://%'
      UNION
      SELECT DISTINCT thumbnail as url FROM xpi_videos WHERE thumbnail IS NOT NULL AND thumbnail LIKE 'https://%'
    `);
    const imagePool = imgRows.map((r) => r.url);
    console.log(`Loaded ${imagePool.length} live images.`);

    await client.query("BEGIN;");

    const mainCats = (await client.query("SELECT id, name FROM gebc_category ORDER BY id")).rows;
    console.log(`Found ${mainCats.length} main categories in GEBC.`);

    const targetSubCategories = [
      { name: "Emotions & Reactions", french_name: "Émotions & Réactions", index: 0 },
      { name: "People & Communication", french_name: "Personnes & Communication", index: 1 },
      { name: "Symbols & Ideas", french_name: "Symboles & Idées", index: 2 },
      { name: "Objects & Activities", french_name: "Objets & Activités", index: 3 },
      { name: "Uncategorized", french_name: "Toute Autre…", index: 4 },
    ];

    for (const cat of mainCats) {
      const existingSubs = (
        await client.query(
          "SELECT id, name, french_name, index FROM gebc_sub_category WHERE category_id = $1 ORDER BY id",
          [cat.id]
        )
      ).rows;

      const keptSubIds = [];

      for (let i = 0; i < targetSubCategories.length; i++) {
        const target = targetSubCategories[i];
        let subId;

        // Match existing subcategory by name or position
        let match = existingSubs.find(
          (s) => s.name.trim().toLowerCase() === target.name.trim().toLowerCase()
        );

        if (!match && existingSubs[i]) {
          match = existingSubs[i];
        }

        if (match) {
          await client.query(
            "UPDATE gebc_sub_category SET name = $1, french_name = $2, index = $3, updated_at = NOW() WHERE id = $4",
            [target.name, target.french_name, target.index, match.id]
          );
          subId = match.id;
        } else {
          const insertRes = await client.query(
            `INSERT INTO gebc_sub_category (category_id, name, french_name, index, created_at, updated_at)
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
        const subName = targetSubCategories[sIdx]?.name || "GEBC Post";
        const countRes = await client.query(
          "SELECT COUNT(*) as count FROM gebc WHERE category = $1 AND sub_category = $2",
          [cat.id, subId]
        );
        const count = Number(countRes.rows[0]?.count) || 0;

        if (count < 6) {
          const needed = 6 - count;
          for (let j = 1; j <= needed; j++) {
            const imgIdx = (cat.id * 31 + subId * 17 + j * 7) % imagePool.length;
            const name = `${cat.name} ${subName}: Emoji & Visual Expression #${j}`;
            const desc = `Expressive GEBC graphic illustration for ${cat.name} in ${subName}.`;

            await client.query(
              `INSERT INTO gebc (name, description, image, category, sub_category, user_id, status, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, 2, 'active', NOW(), NOW())`,
              [name, desc, imagePool[imgIdx], cat.id, subId]
            );
          }
        }
      }

      console.log(`✔ [Category: ${cat.name}] -> Configured 5 subcategories: Emotions & Reactions (0), People & Communication (1), Symbols & Ideas (2), Objects & Activities (3), Uncategorized (4)`);
    }

    await client.query("COMMIT;");
    console.log("\n==================================================");
    console.log("🎉 ALL GEBC SUBCATEGORIES SUCCESSFULLY UPDATED!");
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

updateGebcSubcategories();
