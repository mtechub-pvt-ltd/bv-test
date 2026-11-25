import pool from "../db.config/index.js";

async function updateOnNewsSubcategories() {
  console.log("==================================================");
  console.log("📰 UPDATING ON-NEWS SUBCATEGORIES (ENGLISH, FRENCH, SPANISH, ARABIC, UNCATEGORIZED)");
  console.log("==================================================");

  const client = await pool.connect();

  try {
    // 1. Gather all unique valid live image URLs from DB
    const { rows: imgRows } = await client.query(`
      SELECT DISTINCT image as url FROM news WHERE image IS NOT NULL AND image LIKE 'https://%'
      UNION
      SELECT DISTINCT thumbnail as url FROM xpi_videos WHERE thumbnail IS NOT NULL AND thumbnail LIKE 'https://%'
    `);
    const imagePool = imgRows.map((r) => r.url);
    console.log(`Loaded ${imagePool.length} live images for news records.`);

    await client.query("BEGIN;");

    // 2. Fetch all main categories in news_category
    const mainCats = (await client.query("SELECT id, name FROM news_category ORDER BY id")).rows;
    console.log(`Found ${mainCats.length} main categories in On-News.`);

    const targetSubCategories = [
      { name: "English", french_name: "Anglais", index: 0 },
      { name: "French", french_name: "Français", index: 1 },
      { name: "Spanish", french_name: "Espagnol", index: 2 },
      { name: "Arabic", french_name: "Arabe", index: 3 },
      { name: "Uncategorized", french_name: "Toute Autre…", index: 4 },
    ];

    for (const cat of mainCats) {
      // Get all existing subcategories for this category
      const existingSubs = (
        await client.query(
          "SELECT id, name, index FROM news_sub_category WHERE category_id = $1 ORDER BY id",
          [cat.id]
        )
      ).rows;

      const keptSubIds = new Set();
      const keptSubMap = {};

      // 1. Identify or create English, French, Spanish, Arabic, Uncategorized
      for (const target of targetSubCategories) {
        let match = existingSubs.find(
          (s) => s.name.trim().toLowerCase() === target.name.trim().toLowerCase()
        );

        if (match) {
          await client.query(
            "UPDATE news_sub_category SET name = $1, french_name = $2, index = $3, updated_at = NOW() WHERE id = $4",
            [target.name, target.french_name, target.index, match.id]
          );
          keptSubIds.add(match.id);
          keptSubMap[target.name] = match.id;
        } else {
          const insertRes = await client.query(
            `INSERT INTO news_sub_category (category_id, name, french_name, index, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id`,
            [cat.id, target.name, target.french_name, target.index]
          );
          keptSubIds.add(insertRes.rows[0].id);
          keptSubMap[target.name] = insertRes.rows[0].id;
        }
      }

      // 2. Identify extra subcategories to remove
      const extraSubs = existingSubs.filter((s) => !keptSubIds.has(s.id));
      const uncategorizedId = keptSubMap["Uncategorized"];

      if (extraSubs.length > 0) {
        const extraIds = extraSubs.map((s) => s.id);
        // Reassign any news articles in extra subcategories to Uncategorized
        await client.query(
          "UPDATE news SET sub_category = $1 WHERE sub_category = ANY($2::int[])",
          [uncategorizedId, extraIds]
        );
        // Delete extra subcategories
        await client.query(
          "DELETE FROM news_sub_category WHERE id = ANY($1::int[])",
          [extraIds]
        );
      }

      // 3. Ensure at least 6 news records for each kept subcategory
      const keptIdsArray = Array.from(keptSubIds);
      for (let sIdx = 0; sIdx < keptIdsArray.length; sIdx++) {
        const subId = keptIdsArray[sIdx];
        const subName = targetSubCategories[sIdx]?.name || "News";
        const countRes = await client.query(
          "SELECT COUNT(*) as count FROM news WHERE category = $1 AND sub_category = $2",
          [cat.id, subId]
        );
        const count = Number(countRes.rows[0]?.count) || 0;

        if (count < 6) {
          const needed = 6 - count;
          for (let j = 1; j <= needed; j++) {
            const imgIdx = (cat.id * 31 + subId * 13 + j * 7) % imagePool.length;
            const title = `${cat.name} ${subName}: Latest Global Coverage #${j}`;
            const desc = `In-depth reporting and international news analysis regarding ${cat.name} in ${subName}.`;
            await client.query(
              `INSERT INTO news (title, description, image, category, sub_category, user_id, status, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, 2, 'active', NOW(), NOW())`,
              [title, desc, imagePool[imgIdx], cat.id, subId]
            );
          }
        }
      }

      console.log(`✔ [Category: ${cat.name}] -> Configured 5 subcategories: English (0), French (1), Spanish (2), Arabic (3), Uncategorized (4)`);
    }

    await client.query("COMMIT;");
    console.log("\n==================================================");
    console.log("🎉 ALL ON-NEWS SUBCATEGORIES UPDATED & CLEANED!");
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

updateOnNewsSubcategories();
