import pool from "../db.config/index.js";

async function updateCinematicsSubcategories() {
  console.log("==================================================");
  console.log("🎬 UPDATING CINEMATICS SUBCATEGORIES (HOLLYWOOD, EUROWOOD, BOLLYWOOD, NOLLYWOOD, UNCATEGORIZED)");
  console.log("==================================================");

  const client = await pool.connect();

  try {
    const { rows: imgRows } = await client.query(`
      SELECT DISTINCT thumbnail as url FROM cinematics_videos WHERE thumbnail IS NOT NULL AND thumbnail LIKE 'https://%'
      UNION
      SELECT DISTINCT thumbnail as url FROM xpi_videos WHERE thumbnail IS NOT NULL AND thumbnail LIKE 'https://%'
    `);
    const imagePool = imgRows.map((r) => r.url);

    const { rows: vidRows } = await client.query(`
      SELECT DISTINCT video as url FROM cinematics_videos WHERE video IS NOT NULL AND video LIKE 'https://%'
      UNION
      SELECT DISTINCT video as url FROM xpi_videos WHERE video IS NOT NULL AND video LIKE 'https://%'
    `);
    const videoPool = vidRows.map((r) => r.url);
    console.log(`Loaded ${imagePool.length} live images and ${videoPool.length} live videos.`);

    await client.query("BEGIN;");

    const mainCats = (await client.query("SELECT id, name FROM cinematics_category ORDER BY id")).rows;
    console.log(`Found ${mainCats.length} main categories in Cinematics.`);

    const targetSubCategories = [
      { name: "Hollywood", french_name: "Hollywood", index: 0 },
      { name: "Eurowood", french_name: "Eurowood", index: 1 },
      { name: "Bollywood", french_name: "Bollywood", index: 2 },
      { name: "Nollywood", french_name: "Nollywood", index: 3 },
      { name: "Uncategorized", french_name: "Toute Autre…", index: 4 },
    ];

    for (const cat of mainCats) {
      const existingSubs = (
        await client.query(
          "SELECT id, name, french_name, index FROM cinematics_sub_category WHERE category_id = $1 ORDER BY id",
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
            "UPDATE cinematics_sub_category SET name = $1, french_name = $2, index = $3, updated_at = NOW() WHERE id = $4",
            [target.name, target.french_name, target.index, match.id]
          );
          subId = match.id;
        } else {
          const insertRes = await client.query(
            `INSERT INTO cinematics_sub_category (category_id, name, french_name, index, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id`,
            [cat.id, target.name, target.french_name, target.index]
          );
          subId = insertRes.rows[0].id;
        }
        keptSubIds.push(subId);
      }

      // Ensure each of the 5 subcategories has at least 6 videos
      for (let sIdx = 0; sIdx < keptSubIds.length; sIdx++) {
        const subId = keptSubIds[sIdx];
        const subName = targetSubCategories[sIdx]?.name || "Cinematics Video";
        const countRes = await client.query(
          "SELECT COUNT(*) as count FROM cinematics_videos WHERE category_id = $1 AND sub_category_id = $2",
          [cat.id, subId]
        );
        const count = Number(countRes.rows[0]?.count) || 0;

        if (count < 6) {
          const needed = 6 - count;
          for (let j = 1; j <= needed; j++) {
            const imgIdx = (cat.id * 31 + subId * 17 + j * 7) % imagePool.length;
            const vidIdx = (cat.id * 11 + subId * 5 + j * 3) % videoPool.length;
            const name = `${cat.name} ${subName}: Feature Movie Premiere #${j}`;
            const desc = `Award-winning film presentation showcasing thrilling scenes in ${cat.name} (${subName}).`;

            await client.query(
              `INSERT INTO cinematics_videos (name, description, thumbnail, video, category_id, sub_category_id, user_id, status, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, 2, 'active', NOW(), NOW())`,
              [name, desc, imagePool[imgIdx], videoPool[vidIdx], cat.id, subId]
            );
          }
        }
      }

      console.log(`✔ [Category: ${cat.name}] -> Configured 5 subcategories: Hollywood (0), Eurowood (1), Bollywood (2), Nollywood (3), Uncategorized (4)`);
    }

    await client.query("COMMIT;");
    console.log("\n==================================================");
    console.log("🎉 ALL CINEMATICS SUBCATEGORIES SUCCESSFULLY UPDATED!");
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

updateCinematicsSubcategories();
