import pool from "../db.config/index.js";

async function updateOpenLettersSubcategories() {
  console.log("==================================================");
  console.log("✉ UPDATING OPEN LETTERS SUBCATEGORIES (PUBLIC, AUTHORITIES, LEADERS, CELEBRITIES, UNCATEGORIZED)");
  console.log("==================================================");

  const client = await pool.connect();

  try {
    await client.query("BEGIN;");

    const mainCats = (await client.query("SELECT id, name FROM disc_category ORDER BY id")).rows;
    console.log(`Found ${mainCats.length} main categories in Open Letters.`);

    const targetSubCategories = [
      { name: "Public", french_name: "Public", index: 0 },
      { name: "Authorities", french_name: "Autorités", index: 1 },
      { name: "Leaders", french_name: "Leaders", index: 2 },
      { name: "Celebrities", french_name: "Célébrités", index: 3 },
      { name: "Uncategorized", french_name: "Toute Autre…", index: 4 },
    ];

    for (const cat of mainCats) {
      const existingSubs = (
        await client.query(
          "SELECT id, name, french_name, index FROM disc_sub_category WHERE category_id = $1 ORDER BY id",
          [cat.id]
        )
      ).rows;

      // Update the 5 subcategories in-place
      for (let i = 0; i < targetSubCategories.length; i++) {
        const target = targetSubCategories[i];
        if (existingSubs[i]) {
          await client.query(
            "UPDATE disc_sub_category SET name = $1, french_name = $2, index = $3, updated_at = NOW() WHERE id = $4",
            [target.name, target.french_name, target.index, existingSubs[i].id]
          );
        } else {
          await client.query(
            `INSERT INTO disc_sub_category (category_id, name, french_name, index, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NOW(), NOW())`,
            [cat.id, target.name, target.french_name, target.index]
          );
        }
      }

      console.log(`✔ [Category: ${cat.name}] -> Configured 5 subcategories: Public (0), Authorities (1), Leaders (2), Celebrities (3), Uncategorized (4)`);
    }

    await client.query("COMMIT;");
    console.log("\n==================================================");
    console.log("🎉 ALL OPEN LETTERS SUBCATEGORIES SUCCESSFULLY UPDATED!");
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

updateOpenLettersSubcategories();
