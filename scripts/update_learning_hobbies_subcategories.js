import pool from "../db.config/index.js";

async function updateLearningHobbiesSubcategories() {
  console.log("==================================================");
  console.log("🎓 UPDATING LEARNING & HOBBIES SUBCATEGORIES (ENGLISH, FRENCH, SPANISH, ARABIC, UNCATEGORIZED)");
  console.log("==================================================");

  const client = await pool.connect();

  try {
    const { rows: imgRows } = await client.query(`
      SELECT DISTINCT thumbnail as url FROM learning_hobbies_videos WHERE thumbnail IS NOT NULL AND thumbnail LIKE 'https://%'
      UNION
      SELECT DISTINCT thumbnail as url FROM xpi_videos WHERE thumbnail IS NOT NULL AND thumbnail LIKE 'https://%'
    `);
    const imagePool = imgRows.map((r) => r.url);

    const { rows: vidRows } = await client.query(`
      SELECT DISTINCT video as url FROM learning_hobbies_videos WHERE video IS NOT NULL AND video LIKE 'https://%'
      UNION
      SELECT DISTINCT video as url FROM xpi_videos WHERE video IS NOT NULL AND video LIKE 'https://%'
    `);
    const videoPool = vidRows.map((r) => r.url);
    console.log(`Loaded ${imagePool.length} live images and ${videoPool.length} live videos.`);

    await client.query("BEGIN;");

    const mainCats = (await client.query("SELECT id, name FROM learning_hobbies_category ORDER BY id")).rows;
    console.log(`Found ${mainCats.length} main categories in Learning & Hobbies.`);

    const targetSubCategories = [
      { name: "English", french_name: "Anglais", index: 0 },
      { name: "French", french_name: "Français", index: 1 },
      { name: "Spanish", french_name: "Espagnol", index: 2 },
      { name: "Arabic", french_name: "Arabe", index: 3 },
      { name: "Uncategorized", french_name: "Toute Autre…", index: 4 },
    ];

    for (const cat of mainCats) {
      const existingSubs = (
        await client.query(
          "SELECT id, name, index FROM learning_hobbies_sub_category WHERE category_id = $1 ORDER BY id",
          [cat.id]
        )
      ).rows;

      const keptSubIds = [];
      const keptSubMap = {};

      for (const target of targetSubCategories) {
        let match = existingSubs.find(
          (s) => s.name.trim().toLowerCase() === target.name.trim().toLowerCase()
        );

        if (match) {
          await client.query(
            "UPDATE learning_hobbies_sub_category SET name = $1, french_name = $2, index = $3, updated_at = NOW() WHERE id = $4",
            [target.name, target.french_name, target.index, match.id]
          );
          keptSubIds.push(match.id);
          keptSubMap[target.name] = match.id;
        } else {
          const insertRes = await client.query(
            `INSERT INTO learning_hobbies_sub_category (category_id, name, french_name, index, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id`,
            [cat.id, target.name, target.french_name, target.index]
          );
          keptSubIds.push(insertRes.rows[0].id);
          keptSubMap[target.name] = insertRes.rows[0].id;
        }
      }

      // Reassign all videos in this category evenly across the 5 kept subcategories
      const videoRows = (
        await client.query("SELECT id FROM learning_hobbies_videos WHERE category_id = $1 ORDER BY id", [cat.id])
      ).rows;

      if (videoRows.length > 0) {
        const chunkSize = 100;
        for (let i = 0; i < videoRows.length; i += chunkSize) {
          const chunk = videoRows.slice(i, i + chunkSize);
          const valueClauses = [];
          const params = [];
          let pIdx = 1;

          for (let j = 0; j < chunk.length; j++) {
            const assignedSubId = keptSubIds[(i + j) % keptSubIds.length];
            valueClauses.push(`($${pIdx}::int, $${pIdx + 1}::int)`);
            params.push(chunk[j].id, assignedSubId);
            pIdx += 2;
          }

          const sql = `
            UPDATE learning_hobbies_videos AS v
            SET sub_category_id = val.sub_id
            FROM (VALUES ${valueClauses.join(", ")}) AS val(id, sub_id)
            WHERE v.id = val.id;
          `;
          await client.query(sql, params);
        }
      }

      // Delete extra subcategories
      const keptSet = new Set(keptSubIds);
      const extraSubs = existingSubs.filter((s) => !keptSet.has(s.id));
      if (extraSubs.length > 0) {
        const extraIds = extraSubs.map((s) => s.id);
        await client.query("DELETE FROM learning_hobbies_sub_category WHERE id = ANY($1::int[])", [extraIds]);
      }

      // Ensure at least 6 records for each subcategory
      for (let sIdx = 0; sIdx < keptSubIds.length; sIdx++) {
        const subId = keptSubIds[sIdx];
        const subName = targetSubCategories[sIdx]?.name || "Learning";
        const countRes = await client.query(
          "SELECT COUNT(*) as count FROM learning_hobbies_videos WHERE category_id = $1 AND sub_category_id = $2",
          [cat.id, subId]
        );
        const count = Number(countRes.rows[0]?.count) || 0;

        if (count < 6) {
          const needed = 6 - count;
          for (let j = 1; j <= needed; j++) {
            const imgIdx = (cat.id * 31 + subId * 13 + j * 7) % imagePool.length;
            const vidIdx = (cat.id * 11 + subId * 5 + j * 3) % videoPool.length;
            const name = `${cat.name} ${subName}: Educational Masterclass #${j}`;
            const desc = `Engaging tutorial and learning content regarding ${cat.name} presented in ${subName}.`;

            await client.query(
              `INSERT INTO learning_hobbies_videos (name, description, thumbnail, video, category_id, sub_category_id, user_id, status, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, 2, 'active', NOW(), NOW())`,
              [name, desc, imagePool[imgIdx], videoPool[vidIdx], cat.id, subId]
            );
          }
        }
      }

      console.log(`✔ [Category: ${cat.name}] -> Configured 5 subcategories: English (0), French (1), Spanish (2), Arabic (3), Uncategorized (4)`);
    }

    await client.query("COMMIT;");
    console.log("\n==================================================");
    console.log("🎉 ALL LEARNING & HOBBIES SUBCATEGORIES SUCCESSFULLY UPDATED & BALANCED!");
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

updateLearningHobbiesSubcategories();
