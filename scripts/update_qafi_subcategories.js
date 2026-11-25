import pool from "../db.config/index.js";

async function updateQafiSubcategories() {
  console.log("==================================================");
  console.log("❓ UPDATING QAFI SUBCATEGORIES (ENGLISH, FRENCH, SPANISH, ARABIC, UNCATEGORIZED)");
  console.log("==================================================");

  const client = await pool.connect();

  try {
    const { rows: imgRows } = await client.query(`
      SELECT DISTINCT image as url FROM qafi WHERE image IS NOT NULL AND image LIKE 'https://%'
      UNION
      SELECT DISTINCT thumbnail as url FROM xpi_videos WHERE thumbnail IS NOT NULL AND thumbnail LIKE 'https://%'
    `);
    const imagePool = imgRows.map((r) => r.url);
    console.log(`Loaded ${imagePool.length} live images for QAFI records.`);

    await client.query("BEGIN;");

    const mainCats = (await client.query("SELECT id, name FROM qafi_category ORDER BY id")).rows;
    console.log(`Found ${mainCats.length} main categories in QAFI.`);

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
          "SELECT id, name, index FROM qafi_sub_category WHERE category_id = $1 ORDER BY id",
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
            "UPDATE qafi_sub_category SET name = $1, french_name = $2, index = $3, updated_at = NOW() WHERE id = $4",
            [target.name, target.french_name, target.index, match.id]
          );
          keptSubIds.push(match.id);
          keptSubMap[target.name] = match.id;
        } else {
          const insertRes = await client.query(
            `INSERT INTO qafi_sub_category (category_id, name, french_name, index, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id`,
            [cat.id, target.name, target.french_name, target.index]
          );
          keptSubIds.push(insertRes.rows[0].id);
          keptSubMap[target.name] = insertRes.rows[0].id;
        }
      }

      // Reassign all QAFIs in this category evenly across the 5 kept subcategories
      const qafiRows = (
        await client.query("SELECT id FROM qafi WHERE category = $1 ORDER BY id", [cat.id])
      ).rows;

      if (qafiRows.length > 0) {
        const chunkSize = 100;
        for (let i = 0; i < qafiRows.length; i += chunkSize) {
          const chunk = qafiRows.slice(i, i + chunkSize);
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
            UPDATE qafi AS q
            SET sub_category = v.sub_id
            FROM (VALUES ${valueClauses.join(", ")}) AS v(id, sub_id)
            WHERE q.id = v.id;
          `;
          await client.query(sql, params);
        }
      }

      // Delete extra subcategories
      const keptSet = new Set(keptSubIds);
      const extraSubs = existingSubs.filter((s) => !keptSet.has(s.id));
      if (extraSubs.length > 0) {
        const extraIds = extraSubs.map((s) => s.id);
        await client.query("DELETE FROM qafi_sub_category WHERE id = ANY($1::int[])", [extraIds]);
      }

      // Ensure at least 6 records for each subcategory
      for (let sIdx = 0; sIdx < keptSubIds.length; sIdx++) {
        const subId = keptSubIds[sIdx];
        const subName = targetSubCategories[sIdx]?.name || "Discussion";
        const countRes = await client.query(
          "SELECT COUNT(*) as count FROM qafi WHERE category = $1 AND sub_category = $2",
          [cat.id, subId]
        );
        const count = Number(countRes.rows[0]?.count) || 0;

        if (count < 6) {
          const needed = 6 - count;
          for (let j = 1; j <= needed; j++) {
            const imgIdx = (cat.id * 31 + subId * 13 + j * 7) % imagePool.length;
            const desc = `Engaging question and insightful answers regarding ${cat.name} in ${subName} - Post #${j}.`;
            await client.query(
              `INSERT INTO qafi (description, image, category, sub_category, user_id, status, type, created_at, updated_at)
               VALUES ($1, $2, $3, $4, 2, 'active', 'image', NOW(), NOW())`,
              [desc, imagePool[imgIdx], cat.id, subId]
            );
          }
        }
      }

      console.log(`✔ [Category: ${cat.name}] -> Configured 5 subcategories: English (0), French (1), Spanish (2), Arabic (3), Uncategorized (4)`);
    }

    await client.query("COMMIT;");
    console.log("\n==================================================");
    console.log("🎉 ALL QAFI SUBCATEGORIES SUCCESSFULLY UPDATED & BALANCED!");
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

updateQafiSubcategories();
