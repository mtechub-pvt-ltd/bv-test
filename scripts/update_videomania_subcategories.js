import pool from "../db.config/index.js";

async function cleanAndBalanceVideoManiaSubcategories() {
  console.log("==================================================");
  console.log("📹 CLEANING & BALANCING VIDEO MANIA SUBCATEGORIES (ENTERTAINMENT, INFORMATION, EDUCATION, VLOGGING, UNCATEGORIZED)");
  console.log("==================================================");

  const client = await pool.connect();

  try {
    const { rows: imgRows } = await client.query(`
      SELECT DISTINCT thumbnail as url FROM xpi_videos WHERE thumbnail IS NOT NULL AND thumbnail LIKE 'https://%'
      UNION
      SELECT DISTINCT thumbnail as url FROM fan_star_videos WHERE thumbnail IS NOT NULL AND thumbnail LIKE 'https://%'
    `);
    const imagePool = imgRows.map((r) => r.url);

    const { rows: vidRows } = await client.query(`
      SELECT DISTINCT video as url FROM xpi_videos WHERE video IS NOT NULL AND video LIKE 'https://%'
      UNION
      SELECT DISTINCT video as url FROM fan_star_videos WHERE video IS NOT NULL AND video LIKE 'https://%'
    `);
    const videoPool = vidRows.map((r) => r.url);

    await client.query("BEGIN;");

    const mainCats = (await client.query("SELECT id, name FROM video_category ORDER BY id")).rows;

    const targetSubCategories = [
      { name: "Entertainment", french_name: "Divertissement", index: 0 },
      { name: "Information", french_name: "Information", index: 1 },
      { name: "Education", french_name: "Éducation", index: 2 },
      { name: "Vlogging", french_name: "Vlogging", index: 3 },
      { name: "Uncategorized", french_name: "Tout Autre…", index: 4 },
    ];

    for (const cat of mainCats) {
      const existingSubs = (
        await client.query(
          "SELECT id, name, french_name, index FROM video_sub_category WHERE category_id = $1 ORDER BY id",
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
            "UPDATE video_sub_category SET name = $1, french_name = $2, index = $3, updated_at = NOW() WHERE id = $4",
            [target.name, target.french_name, target.index, match.id]
          );
          subId = match.id;
        } else {
          const insertRes = await client.query(
            `INSERT INTO video_sub_category (category_id, name, french_name, index, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id`,
            [cat.id, target.name, target.french_name, target.index]
          );
          subId = insertRes.rows[0].id;
        }
        keptSubIds.push(subId);
      }

      // Reassign all videos in this category evenly across the 5 kept subcategories
      const videoRows = (
        await client.query("SELECT id FROM xpi_videos WHERE video_category = $1 ORDER BY id", [cat.id])
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
            UPDATE xpi_videos AS v
            SET sub_category = val.sub_id
            FROM (VALUES ${valueClauses.join(", ")}) AS val(id, sub_id)
            WHERE v.id = val.id;
          `;
          await client.query(sql, params);
        }
      }

      // Delete extra old subcategories
      const keptSet = new Set(keptSubIds);
      const extraSubs = existingSubs.filter((s) => !keptSet.has(s.id));
      if (extraSubs.length > 0) {
        const extraIds = extraSubs.map((s) => s.id);
        await client.query("DELETE FROM video_sub_category WHERE id = ANY($1::int[])", [extraIds]);
      }

      // Ensure each of the 5 subcategories has at least 6 videos
      for (let sIdx = 0; sIdx < keptSubIds.length; sIdx++) {
        const subId = keptSubIds[sIdx];
        const subName = targetSubCategories[sIdx]?.name || "Video";
        const countRes = await client.query(
          "SELECT COUNT(*) as count FROM xpi_videos WHERE video_category = $1 AND sub_category = $2",
          [cat.id, subId]
        );
        const count = Number(countRes.rows[0]?.count) || 0;

        if (count < 6) {
          const needed = 6 - count;
          for (let j = 1; j <= needed; j++) {
            const imgIdx = (cat.id * 31 + subId * 17 + j * 7) % imagePool.length;
            const vidIdx = (cat.id * 11 + subId * 5 + j * 3) % videoPool.length;
            const name = `${cat.name} ${subName}: Feature Video Clip #${j}`;
            const desc = `Popular trending clip in ${cat.name} (${subName}).`;

            await client.query(
              `INSERT INTO xpi_videos (name, description, thumbnail, video, video_category, sub_category, user_id, status, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, 2, 'active', NOW(), NOW())`,
              [name, desc, imagePool[imgIdx], videoPool[vidIdx], cat.id, subId]
            );
          }
        }
      }

      console.log(`✔ [Category: ${cat.name}] -> Cleaned & Configured 5 subcategories: Entertainment (0), Information (1), Education (2), Vlogging (3), Uncategorized (4)`);
    }

    await client.query("COMMIT;");
    console.log("\n==================================================");
    console.log("🎉 ALL VIDEO MANIA SUBCATEGORIES SUCCESSFULLY CLEANED & CONFIGURED!");
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

cleanAndBalanceVideoManiaSubcategories();
