import pool from "../db.config/index.js";

async function updateSportsSubcategories() {
  console.log("==================================================");
  console.log("🏅 UPDATING SPORT & SPORT SUBCATEGORIES (EUROPE, AMERICAS, ASIA, AFRICA, UNCATEGORIZED)");
  console.log("==================================================");

  const client = await pool.connect();

  try {
    await client.query("BEGIN;");

    const mainCats = (await client.query("SELECT id, name FROM sports_category ORDER BY id")).rows;
    console.log(`Found ${mainCats.length} main categories in Sport & Sport.`);

    const targetSubCategories = [
      { name: "Europe", french_name: "Europe", index: 0 },
      { name: "Americas", french_name: "Les Amériques", index: 1 },
      { name: "Asia", french_name: "Asie", index: 2 },
      { name: "Africa", french_name: "Afrique", index: 3 },
      { name: "Uncategorized", french_name: "Toute Autre…", index: 4 },
    ];

    for (const cat of mainCats) {
      const existingSubs = (
        await client.query(
          "SELECT id, name, french_name, index FROM sport_sub_category WHERE category_id = $1 ORDER BY id",
          [cat.id]
        )
      ).rows;

      for (const target of targetSubCategories) {
        // Find existing match by name or by French name (e.g. 'Afrique' -> 'Africa')
        let match = existingSubs.find((s) => {
          const n = s.name.trim().toLowerCase();
          const targetN = target.name.trim().toLowerCase();
          return (
            n === targetN ||
            (targetN === "africa" && (n === "afrique" || n === "africa")) ||
            (targetN === "uncategorized" && n === "uncategorized")
          );
        });

        if (match) {
          await client.query(
            "UPDATE sport_sub_category SET name = $1, french_name = $2, index = $3, updated_at = NOW() WHERE id = $4",
            [target.name, target.french_name, target.index, match.id]
          );
        } else {
          await client.query(
            `INSERT INTO sport_sub_category (category_id, name, french_name, index, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NOW(), NOW())`,
            [cat.id, target.name, target.french_name, target.index]
          );
        }
      }

      console.log(`✔ [Category: ${cat.name}] -> Configured 5 subcategories: Europe (0), Americas (1), Asia (2), Africa (3), Uncategorized (4)`);
    }

    await client.query("COMMIT;");
    console.log("\n==================================================");
    console.log("🎉 ALL SPORT SUBCATEGORIES SUCCESSFULLY UPDATED!");
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

updateSportsSubcategories();
