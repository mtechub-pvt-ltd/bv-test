import pool from "../db.config/index.js";

async function balanceNewsSubcategories() {
  console.log("==================================================");
  console.log("⚖ BALANCING NEWS ITEMS ACROSS 5 SUBCATEGORIES");
  console.log("==================================================");

  const client = await pool.connect();

  try {
    const mainCats = (await client.query("SELECT id, name FROM news_category ORDER BY id")).rows;

    await client.query("BEGIN;");

    for (const cat of mainCats) {
      const subs = (
        await client.query(
          "SELECT id, name, index FROM news_sub_category WHERE category_id = $1 ORDER BY index",
          [cat.id]
        )
      ).rows;

      const subIds = subs.map((s) => s.id);
      if (subIds.length === 0) continue;

      // Get all news for this category
      const newsRows = (
        await client.query(
          "SELECT id FROM news WHERE category = $1 ORDER BY id",
          [cat.id]
        )
      ).rows;

      // Distribute evenly across the 5 subcategories
      for (let i = 0; i < newsRows.length; i++) {
        const assignedSubId = subIds[i % subIds.length];
        await client.query("UPDATE news SET sub_category = $1 WHERE id = $2", [
          assignedSubId,
          newsRows[i].id,
        ]);
      }

      console.log(`✔ [${cat.name}]: ${newsRows.length} news items distributed evenly across 5 subcategories.`);
    }

    await client.query("COMMIT;");
    console.log("\n==================================================");
    console.log("🎉 ALL NEWS SUBCATEGORIES BALANCED PERFECTLY!");
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

balanceNewsSubcategories();
