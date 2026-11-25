import pool from "../db.config/index.js";

async function updateMondoMarketMainCategories() {
  console.log("==================================================");
  console.log("🛍 UPDATING MONDO MARKET 21 MAIN CATEGORIES & 5 REGIONAL SUBCATEGORIES");
  console.log("==================================================");

  const client = await pool.connect();

  try {
    const { rows: imgRows } = await client.query(`
      SELECT DISTINCT image as url FROM item_images WHERE image IS NOT NULL AND image LIKE 'https://%'
      UNION
      SELECT DISTINCT image as url FROM pic_tours WHERE image IS NOT NULL AND image LIKE 'https://%'
      UNION
      SELECT DISTINCT thumbnail as url FROM xpi_videos WHERE thumbnail IS NOT NULL AND thumbnail LIKE 'https://%'
    `);
    const imagePool = imgRows.map((r) => r.url);
    console.log(`Loaded ${imagePool.length} live images for Mondo Market.`);

    await client.query("BEGIN;");

    const targetMainCategories = [
      { name: "Vehicles & Transportation", french_name: "Véhicules & Transport", index: 0 },
      { name: "Electronics & Technology", french_name: "Électronique & Technologie", index: 1 },
      { name: "Fashion & Clothing", french_name: "Mode & Habillement", index: 2 },
      { name: "Jewelry & Watches", french_name: "Bijoux & Montres", index: 3 },
      { name: "Real Estate & Property", french_name: "Immobilier & Propriétés", index: 4 },
      { name: "Tools & Hardware", french_name: "Outils & Quincaillerie", index: 5 },
      { name: "Garden & Outdoor", french_name: "Jardin & Plein Air", index: 6 },
      { name: "Appliances", french_name: "Électroménager", index: 7 },
      { name: "Baby, Kids & Toys", french_name: "Bébés, Enfants & Jouets", index: 8 },
      { name: "Sports & Fitness", french_name: "Sports & Fitness", index: 9 },
      { name: "Gaming & Entertainment", french_name: "Jeux & Divertissement", index: 10 },
      { name: "Books, Music & Media", french_name: "Livres, Musique & Médias", index: 11 },
      { name: "Cameras & Photography", french_name: "Appareils Photo & Photographie", index: 12 },
      { name: "Art & Collectibles", french_name: "Art & Objets de Collection", index: 13 },
      { name: "Beauty & Personal Care", french_name: "Beauté & Soins Personnels", index: 14 },
      { name: "Home, Furniture & Construction", french_name: "Maison, Meubles & Construction", index: 15 },
      { name: "Food & Beverages", french_name: "Nourriture & Boissons", index: 16 },
      { name: "Business & Office", french_name: "Affaires & Bureau", index: 17 },
      { name: "Industrial & Commercial Equipment", french_name: "Équipement Industriel & Commercial", index: 18 },
      { name: "Gifts & Specialty Items", french_name: "Cadeaux & Articles Spéciaux", index: 19 },
      { name: "Services & Local Offers", french_name: "Services & Offres Locales", index: 20 },
    ];

    const targetSubCategories = [
      { name: "Europe", french_name: "Europe", index: 0 },
      { name: "Americas", french_name: "Les Amériques", index: 1 },
      { name: "Asia", french_name: "Asie", index: 2 },
      { name: "Africa", french_name: "Afrique", index: 3 },
      { name: "Uncategorized", french_name: "Tout Autre…", index: 4 },
    ];

    // 1. Update/Insert 21 main categories in item_category
    const existingMainCats = (await client.query("SELECT id, name, french_name, index FROM item_category ORDER BY id")).rows;
    const keptMainCatIds = [];

    for (let i = 0; i < targetMainCategories.length; i++) {
      const target = targetMainCategories[i];
      let catId;

      let match = existingMainCats.find(
        (c) => c.name.trim().toLowerCase() === target.name.trim().toLowerCase()
      );

      if (!match && existingMainCats[i]) {
        match = existingMainCats[i];
      }

      if (match) {
        await client.query(
          "UPDATE item_category SET name = $1, french_name = $2, index = $3, updated_at = NOW() WHERE id = $4",
          [target.name, target.french_name, target.index, match.id]
        );
        catId = match.id;
      } else {
        const insertRes = await client.query(
          `INSERT INTO item_category (name, french_name, index, created_at, updated_at)
           VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id`,
          [target.name, target.french_name, target.index]
        );
        catId = insertRes.rows[0].id;
      }
      keptMainCatIds.push(catId);
    }

    console.log(`✔ Configured all ${keptMainCatIds.length} main categories in item_category!`);

    // 2. Configure 5 regional subcategories for each of the 21 main categories
    for (let cIdx = 0; cIdx < keptMainCatIds.length; cIdx++) {
      const catId = keptMainCatIds[cIdx];
      const catTarget = targetMainCategories[cIdx];

      const existingSubs = (
        await client.query(
          "SELECT id, name, french_name, index FROM item_sub_category WHERE category_id = $1 ORDER BY id",
          [catId]
        )
      ).rows;

      const keptSubIds = [];

      for (const targetSub of targetSubCategories) {
        let match = existingSubs.find(
          (s) => s.name.trim().toLowerCase() === targetSub.name.trim().toLowerCase()
        );

        let subId;
        if (match) {
          await client.query(
            "UPDATE item_sub_category SET name = $1, french_name = $2, index = $3, updated_at = NOW() WHERE id = $4",
            [targetSub.name, targetSub.french_name, targetSub.index, match.id]
          );
          subId = match.id;
        } else {
          const insertRes = await client.query(
            `INSERT INTO item_sub_category (category_id, name, french_name, index, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id`,
            [catId, targetSub.name, targetSub.french_name, targetSub.index]
          );
          subId = insertRes.rows[0].id;
        }
        keptSubIds.push(subId);
      }

      // Reassign all existing items in this category evenly across the 5 kept subcategories
      const itemRows = (
        await client.query("SELECT id FROM item WHERE item_category = $1 ORDER BY id", [catId])
      ).rows;

      if (itemRows.length > 0) {
        const chunkSize = 100;
        for (let i = 0; i < itemRows.length; i += chunkSize) {
          const chunk = itemRows.slice(i, i + chunkSize);
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
            UPDATE item AS it
            SET sub_category = val.sub_id
            FROM (VALUES ${valueClauses.join(", ")}) AS val(id, sub_id)
            WHERE it.id = val.id;
          `;
          await client.query(sql, params);
        }
      }

      // Delete extra subcategories for this category if any
      const keptSet = new Set(keptSubIds);
      const extraSubs = existingSubs.filter((s) => !keptSet.has(s.id));
      if (extraSubs.length > 0) {
        const extraIds = extraSubs.map((s) => s.id);
        await client.query("DELETE FROM item_sub_category WHERE id = ANY($1::int[])", [extraIds]);
      }

      // Ensure each of the 5 subcategories has at least 6 active products with photos
      for (let sIdx = 0; sIdx < keptSubIds.length; sIdx++) {
        const subId = keptSubIds[sIdx];
        const subName = targetSubCategories[sIdx]?.name || "Region";
        const countRes = await client.query(
          "SELECT COUNT(*) as count FROM item WHERE item_category = $1 AND sub_category = $2",
          [catId, subId]
        );
        const count = Number(countRes.rows[0]?.count) || 0;

        if (count < 6) {
          const needed = 6 - count;
          for (let j = 1; j <= needed; j++) {
            const imgIdx = (catId * 31 + subId * 17 + j * 7) % imagePool.length;
            const title = `${catTarget.name} ${subName}: Premium Listing #${j}`;
            const desc = `Top quality ${catTarget.name.toLowerCase()} item available in ${subName} region with buyer protection and fast shipping.`;

            const itemInsertRes = await client.query(
              `INSERT INTO item (user_id, item_category, sub_category, title, description, price, condition, location, city, state, region, paid_status, country_code, country, status, created_at, updated_at)
               VALUES (2, $1, $2, $3, $4, $5, 'new', 'International Hub', 'Paris', 'Ile-de-France', $6, true, 'FR', 'France', 'active', NOW(), NOW())
               RETURNING id`,
              [catId, subId, title, desc, 49 + j * 15, subName]
            );
            const newItemId = itemInsertRes.rows[0].id;

            await client.query(
              `INSERT INTO item_images (item_id, image, created_at, updated_at)
               VALUES ($1, $2, NOW(), NOW())`,
              [newItemId, imagePool[imgIdx]]
            );
          }
        }
      }

      console.log(`✔ [${cIdx + 1}/21] Category: ${catTarget.name} -> Configured 5 subcategories: Europe (0), Americas (1), Asia (2), Africa (3), Uncategorized (4)`);
    }

    await client.query("COMMIT;");
    console.log("\n==================================================");
    console.log("🎉 ALL 21 MONDO MARKET MAIN CATEGORIES & 5 REGIONAL SUBCATEGORIES CONFIGURED!");
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

updateMondoMarketMainCategories();
