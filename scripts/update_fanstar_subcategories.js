import pool from "../db.config/index.js";

async function fixFanStarSubcategories() {
  console.log("==================================================");
  console.log("⭐ FIXING ALL 5 FAN-STAR SUBCATEGORIES (PRANK, HYPE, VIBE, ENTERTAINMENT, UNCATEGORIZED)");
  console.log("==================================================");

  const client = await pool.connect();

  try {
    const { rows: imgRows } = await client.query(`
      SELECT DISTINCT thumbnail as url FROM fan_star_videos WHERE thumbnail IS NOT NULL AND thumbnail LIKE 'https://%'
      UNION
      SELECT DISTINCT thumbnail as url FROM xpi_videos WHERE thumbnail IS NOT NULL AND thumbnail LIKE 'https://%'
    `);
    const imagePool = imgRows.map((r) => r.url);

    const { rows: vidRows } = await client.query(`
      SELECT DISTINCT video as url FROM fan_star_videos WHERE video IS NOT NULL AND video LIKE 'https://%'
      UNION
      SELECT DISTINCT video as url FROM xpi_videos WHERE video IS NOT NULL AND video LIKE 'https://%'
    `);
    const videoPool = vidRows.map((r) => r.url);

    await client.query("BEGIN;");

    const mainCats = (await client.query("SELECT id, name FROM fan_star_category ORDER BY id")).rows;

    const targetSubCategories = [
      { name: "Prank", french_name: "Blague", index: 0 },
      { name: "Hype", french_name: "Hype", index: 1 },
      { name: "Vibe", french_name: "Vibe", index: 2 },
      { name: "Entertainment", french_name: "Divertissement", index: 3 },
      { name: "Uncategorized", french_name: "Autre / Non catégorisé", index: 4 },
    ];

    for (const cat of mainCats) {
      const existingSubs = (
        await client.query(
          "SELECT id, name, french_name, index FROM fan_star_sub_category WHERE category_id = $1 ORDER BY id",
          [cat.id]
        )
      ).rows;

      const keptSubIds = [];

      for (const target of targetSubCategories) {
        let match = existingSubs.find(
          (s) => s.name.trim().toLowerCase() === target.name.trim().toLowerCase()
        );

        let subId;
        if (match) {
          await client.query(
            "UPDATE fan_star_sub_category SET name = $1, french_name = $2, index = $3, updated_at = NOW() WHERE id = $4",
            [target.name, target.french_name, target.index, match.id]
          );
          subId = match.id;
        } else {
          const insertRes = await client.query(
            `INSERT INTO fan_star_sub_category (category_id, name, french_name, index, created_at, updated_at)
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
        const subName = targetSubCategories[sIdx]?.name || "Fan Video";
        const countRes = await client.query(
          "SELECT COUNT(*) as count FROM fan_star_videos WHERE category_id = $1 AND sub_category_id = $2",
          [cat.id, subId]
        );
        const count = Number(countRes.rows[0]?.count) || 0;

        if (count < 6) {
          const needed = 6 - count;
          for (let j = 1; j <= needed; j++) {
            const imgIdx = (cat.id * 31 + subId * 17 + j * 7) % imagePool.length;
            const vidIdx = (cat.id * 11 + subId * 5 + j * 3) % videoPool.length;
            const name = `${cat.name} ${subName}: Star Highlight Video #${j}`;
            const desc = `Popular fan video clip covering ${cat.name} in ${subName}.`;

            await client.query(
              `INSERT INTO fan_star_videos (name, description, thumbnail, video, category_id, sub_category_id, user_id, status, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, 2, 'active', NOW(), NOW())`,
              [name, desc, imagePool[imgIdx], videoPool[vidIdx], cat.id, subId]
            );
          }
        }
      }

      console.log(`✔ [Category: ${cat.name}] -> Configured all 5 subcategories: Prank (0), Hype (1), Vibe (2), Entertainment (3), Uncategorized (4)`);
    }

    await client.query("COMMIT;");
    console.log("\n==================================================");
    console.log("🎉 ALL 5 FAN-STAR SUBCATEGORIES FULLY CONFIGURED!");
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

fixFanStarSubcategories();
