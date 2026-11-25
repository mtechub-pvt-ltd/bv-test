/**
 * Seed script: populate mondon_market (item + item_images) with proper
 * data across all 22 main categories and 5 sub-categories each.
 *
 *   - 22 categories × 5 sub-categories × 8 items = 880 items
 *   - Each item gets 1 image at https://picsum.photos/seed/mondo-{id}-img1/600/400
 *     (matches the existing picsum URL pattern; safe from cloudinary cleanup)
 *   - Owner = user_id 7 (Liam Smith — the existing seed owner)
 *   - Region set from sub_category (europe / americas / africa / asia / null)
 *   - condition = 'new', paid_status = false, status = 'active'
 *
 * Uses a SINGLE transaction for all inserts — much faster than per-item txns.
 *
 * Usage (from repo root):
 *   node migrations/seed_mondon_market.js            # run seed
 *   node migrations/seed_mondon_market.js --cleanup  # first delete existing seed rows
 */
import pool from "../db.config/index.js";

const ITEMS_PER_SUBCATEGORY = 8;
const OWNER_USER_ID = 7;
const SEED_USER_PREFIX = "mondo";

const SUBCATEGORY_REGION = {
  Europe: "europe",
  Americas: "americas",
  Africa: "africa",
  Asia: "asia",
  Uncategorized: null,
};

async function fetchCategoryStructure() {
  const { rows } = await pool.query(`
    SELECT c.id AS category_id, c.name AS category_name,
           s.id AS sub_id, s.name AS sub_name
    FROM item_category c
    JOIN item_sub_category s ON s.category_id = c.id
    ORDER BY c.id, s.id
  `);
  return rows;
}

async function ownerExists(userId) {
  const { rows } = await pool.query(
    `SELECT id FROM users WHERE id = $1 AND is_deleted = FALSE`,
    [userId]
  );
  return rows.length > 0;
}

async function deleteSeedRows() {
  const ids = await pool.query(
    `SELECT id FROM item WHERE user_id = $1 AND title LIKE $2`,
    [OWNER_USER_ID, `${SEED_USER_PREFIX} %`]
  );
  if (ids.rowCount === 0) {
    console.log("No existing seed rows found.");
    return 0;
  }
  const idList = ids.rows.map((r) => r.id);
  const del = await pool.query(
    `DELETE FROM item WHERE id = ANY($1::int[])`,
    [idList]
  );
  console.log(`Removed ${del.rowCount} existing seed items (cascaded dependent rows).`);
  return del.rowCount;
}

async function summaryCounts() {
  const { rows } = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM item) AS total_items,
       (SELECT COUNT(*)::int FROM item_images) AS total_images,
       (SELECT COUNT(*)::int FROM item WHERE user_id = $1 AND title LIKE $2) AS seed_items
     `,
    [OWNER_USER_ID, `${SEED_USER_PREFIX} %`]
  );
  return rows[0];
}

async function seed(structure) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1) Bulk insert items. Use RETURNING id, then bulk insert images in a second pass.
    // Postgres caps parameter count at 65535; we have 880 rows × 13 cols = 11440 — fine.
    const itemRows = [];
    for (const row of structure) {
      for (let i = 1; i <= ITEMS_PER_SUBCATEGORY; i++) {
        const region = SUBCATEGORY_REGION[row.sub_name] ?? null;
        const title = `${SEED_USER_PREFIX} ${row.category_name} #${row.sub_name}-${i}`;
        const description = `Seeded item for ${row.category_name} / ${row.sub_name}. Sample listing #${i} of ${ITEMS_PER_SUBCATEGORY} in this sub-category.`;
        const price = 100 + Math.floor(Math.random() * 9900);
        itemRows.push({
          user_id: OWNER_USER_ID,
          item_category: row.category_id,
          sub_category: row.sub_id,
          title,
          description,
          price,
          condition: "new",
          location: "Sample location",
          region,
        });
      }
    }

    // Build VALUES list dynamically
    const itemValues = [];
    const itemParams = [];
    itemRows.forEach((r, idx) => {
      const base = idx * 8;
      itemParams.push(
        r.user_id, r.item_category, r.sub_category, r.title,
        r.description, r.price, r.condition, r.location
      );
      // region needs to be NULL-aware
      itemValues.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${idx + 1 + itemRows.length * 8})`
      );
    });
    // Push region params last
    itemRows.forEach((r) => itemParams.push(r.region));

    const itemInsertSql = `
      INSERT INTO item
        (user_id, item_category, sub_category, title, description, price,
         condition, location, region, country_code, country, city, state,
         top_post, paid_status, status, shared_post_id)
      VALUES ${itemValues
        .map(
          (v) =>
            v.replace(
              "$" + (itemRows.length * 8 + 1) + ",",
              "NULL,"
            ).replace(
              new RegExp(`\\$${itemRows.length * 8 + 1}\\)`, "g"),
              "NULL)"
            )
        )
        .join(",\n")}
      RETURNING id
    `;

    // The above string-replace trick is fragile. Use a cleaner approach: pass region via CASE.
    const itemInsertClean = `
      INSERT INTO item
        (user_id, item_category, sub_category, title, description, price,
         condition, location, region, country_code, country, city, state,
         top_post, paid_status, status, shared_post_id)
      VALUES ${itemRows
        .map(
          (_, idx) =>
            `($${idx * 8 + 1}, $${idx * 8 + 2}, $${idx * 8 + 3}, $${idx * 8 + 4}, ` +
            `$${idx * 8 + 5}, $${idx * 8 + 6}, $${idx * 8 + 7}, $${idx * 8 + 8}, ` +
            `$${idx + itemRows.length * 8 + 1}, NULL, NULL, NULL, NULL, FALSE, FALSE, 'active', NULL)`
        )
        .join(",\n")}
      RETURNING id
    `;
    const ins = await client.query(itemInsertClean, itemParams);
    const newIds = ins.rows.map((r) => r.id);
    console.log(`Inserted ${newIds.length} items.`);

    // 2) Bulk insert images
    const imgValues = newIds.map((_, idx) => `($${idx * 2 + 1}, $${idx * 2 + 2})`).join(",\n");
    const imgParams = [];
    newIds.forEach((id) => {
      imgParams.push(id, `https://picsum.photos/seed/mondo-${id}-img1/600/400`);
    });
    const imgInsertSql = `INSERT INTO item_images (item_id, image) VALUES ${imgValues}`;
    await client.query(imgInsertSql, imgParams);
    console.log(`Inserted ${newIds.length} images.`);

    await client.query("COMMIT");
    return { totalItems: newIds.length, totalImages: newIds.length };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function run() {
  const shouldCleanup = process.argv.includes("--cleanup");

  try {
    console.log("=== mondon_market seed ===");
    if (!(await ownerExists(OWNER_USER_ID))) {
      console.error(`Owner user_id=${OWNER_USER_ID} not found. Aborting.`);
      process.exit(1);
    }

    if (shouldCleanup) {
      console.log("--cleanup passed: removing existing seed rows first...");
      await deleteSeedRows();
    }

    const structure = await fetchCategoryStructure();
    console.log(
      `Seeding ${structure.length} (category, subcategory) pairs × ${ITEMS_PER_SUBCATEGORY} items each...`
    );

    const before = await summaryCounts();
    console.log("Counts before:", before);

    const { totalItems, totalImages } = await seed(structure);
    console.log(`Inserted ${totalItems} items and ${totalImages} images.`);

    const after = await summaryCounts();
    console.log("Counts after:", after);
    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  }
}

run();