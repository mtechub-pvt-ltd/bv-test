import pool from "../db.config/index.js";

async function fastBalanceNewsSubcategories() {
  console.log("==================================================");
  console.log("🚀 FAST BATCH BALANCING OF NEWS ACROSS 5 SUBCATEGORIES");
  console.log("==================================================");

  const client = await pool.connect();

  try {
    const mainCats = (await client.query("SELECT id, name FROM news_category ORDER BY id")).rows;
    const allUpdates = [];

    for (const cat of mainCats) {
      const subs = (
        await client.query(
          "SELECT id, name, index FROM news_sub_category WHERE category_id = $1 ORDER BY index",
          [cat.id]
        )
      ).rows;

      const subIds = subs.map((s) => s.id);
      if (subIds.length === 0) continue;

      const newsRows = (
        await client.query(
          "SELECT id FROM news WHERE category = $1 ORDER BY id",
          [cat.id]
        )
      ).rows;

      for (let i = 0; i < newsRows.length; i++) {
        const assignedSubId = subIds[i % subIds.length];
        allUpdates.push({ id: newsRows[i].id, subId: assignedSubId });
      }
    }

    console.log(`Total news rows to update: ${allUpdates.length}`);

    await client.query("BEGIN;");

    const chunkSize = 200;
    for (let i = 0; i < allUpdates.length; i += chunkSize) {
      const chunk = allUpdates.slice(i, i + chunkSize);
      const valueClauses = [];
      const params = [];
      let pIdx = 1;

      for (const item of chunk) {
        valueClauses.push(`($${pIdx}::int, $${pIdx + 1}::int)`);
        params.push(item.id, item.subId);
        pIdx += 2;
      }

      const sql = `
        UPDATE news AS n
        SET sub_category = v.sub_id
        FROM (VALUES ${valueClauses.join(", ")}) AS v(id, sub_id)
        WHERE n.id = v.id;
      `;
      await client.query(sql, params);
    }

    await client.query("COMMIT;");
    console.log("\n==================================================");
    console.log("🎉 ALL NEWS ITEMS INSTANTLY BALANCED ACROSS 5 SUBCATEGORIES!");
    console.log("==================================================");
  } catch (err) {
    await client.query("ROLLBACK;").catch(() => {});
    console.error("Fatal error:", err);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

fastBalanceNewsSubcategories();
