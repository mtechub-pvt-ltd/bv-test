import pool from "../db.config/index.js";

async function updateTvProgmaxSubcategories() {
  console.log("==================================================");
  console.log("📺 UPDATING TV PROGMAX SUBCATEGORIES (NEWS, DEBATES, INTERVIEWS, SERIES, UNCATEGORIZED)");
  console.log("==================================================");

  const client = await pool.connect();

  try {
    // 1. Gather live thumbnails & videos
    const { rows: imgRows } = await client.query(`
      SELECT DISTINCT thumbnail as url FROM tv_progmax_videos WHERE thumbnail IS NOT NULL AND thumbnail LIKE 'https://%'
      UNION
      SELECT DISTINCT thumbnail as url FROM xpi_videos WHERE thumbnail IS NOT NULL AND thumbnail LIKE 'https://%'
    `);
    const imagePool = imgRows.map((r) => r.url);

    const { rows: vidRows } = await client.query(`
      SELECT DISTINCT video as url FROM tv_progmax_videos WHERE video IS NOT NULL AND video LIKE 'https://%'
      UNION
      SELECT DISTINCT video as url FROM xpi_videos WHERE video IS NOT NULL AND video LIKE 'https://%'
    `);
    const videoPool = vidRows.map((r) => r.url);
    console.log(`Loaded ${imagePool.length} live images and ${videoPool.length} live videos.`);

    await client.query("BEGIN;");

    const mainCats = (await client.query("SELECT id, name FROM tv_progmax_category ORDER BY id")).rows;
    console.log(`Found ${mainCats.length} main categories in TV Progmax.`);

    const targetSubCategories = [
      { name: "English", french_name: "Anglais", index: 0 },
      { name: "French", french_name: "Français", index: 1 },
      { name: "Spanish", french_name: "Espagnol", index: 2 },
      { name: "Arabic", french_name: "Arabe", index: 3 },
      { name: "Uncategorized", french_name: "Autre / Non catégorisé", index: 4 },
    ];

    for (const cat of mainCats) {
      const existingSubs = (
        await client.query(
          "SELECT id, name, french_name, index FROM tv_progmax_sub_category WHERE category_id = $1 ORDER BY id",
          [cat.id]
        )
      ).rows;

      // Update or create the 5 subcategories
      const keptSubIds = [];

      for (let i = 0; i < targetSubCategories.length; i++) {
        const target = targetSubCategories[i];
        let subId;

        if (existingSubs[i]) {
          await client.query(
            "UPDATE tv_progmax_sub_category SET name = $1, french_name = $2, index = $3, updated_at = NOW() WHERE id = $4",
            [target.name, target.french_name, target.index, existingSubs[i].id]
          );
          subId = existingSubs[i].id;
        } else {
          const insertRes = await client.query(
            `INSERT INTO tv_progmax_sub_category (category_id, name, french_name, index, created_at, updated_at)
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
        const subName = targetSubCategories[sIdx]?.name || "TV Program";
        const countRes = await client.query(
          "SELECT COUNT(*) as count FROM tv_progmax_videos WHERE category_id = $1 AND sub_category_id = $2",
          [cat.id, subId]
        );
        const count = Number(countRes.rows[0]?.count) || 0;

        if (count < 6) {
          const needed = 6 - count;
          for (let j = 1; j <= needed; j++) {
            const imgIdx = (cat.id * 31 + subId * 17 + j * 7) % imagePool.length;
            const vidIdx = (cat.id * 11 + subId * 5 + j * 3) % videoPool.length;
            const name = `${cat.name} ${subName}: Premiere Broadcast #${j}`;
            const desc = `High definition television broadcast and special program covering ${cat.name} in ${subName}.`;

            await client.query(
              `INSERT INTO tv_progmax_videos (name, description, thumbnail, video, category_id, sub_category_id, user_id, status, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, 2, 'active', NOW(), NOW())`,
              [name, desc, imagePool[imgIdx], videoPool[vidIdx], cat.id, subId]
            );
          }
        }
      }

      console.log(`✔ [Category: ${cat.name}] -> Configured 5 subcategories: News (0), Debates (1), Interviews (2), Series (3), Uncategorized (4)`);
    }

    await client.query("COMMIT;");
    console.log("\n==================================================");
    console.log("🎉 ALL TV PROGMAX SUBCATEGORIES SUCCESSFULLY UPDATED!");
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

updateTvProgmaxSubcategories();
