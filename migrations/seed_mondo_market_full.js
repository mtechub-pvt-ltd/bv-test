/**
 * Top-up seed: ensure every (item_category, item_sub_category) pair has
 * exactly ITEMS_PER_SUBCATEGORY mondon_market items owned by OWNER_USER_ID.
 *
 *   - Idempotent. Uses SELECT-then-INSERT so reruns are safe.
 *   - Only fills subcategories that are short of the target. Existing rows
 *     (including previously-seeded "mondo %" rows) are left untouched.
 *   - Region set from sub_category name (europe/americas/africa/asia/null).
 *   - Image URL pattern matches `seed_mondon_market.js`:
 *     https://picsum.photos/seed/mondo-{id}-img1/600/400
 *
 * Usage (from repo root):
 *   node migrations/seed_mondo_market_full.js            # run fill
 */
import pool from "../db.config/index.js";

const ITEMS_PER_SUBCATEGORY = 8;
const OWNER_USER_ID = 7;

const SUBCATEGORY_REGION = {
  Europe: "europe",
  Americas: "americas",
  Africa: "africa",
  Asia: "asia",
  Uncategorized: null,
};

async function fetchCategoryStructure() {
  const { rows } = await pool.query(`
    SELECT c.id   AS category_id,
           c.name AS category_name,
           s.id   AS sub_id,
           s.name AS sub_name
      FROM item_category c
      JOIN item_sub_category s ON s.category_id = c.id
     ORDER BY c.id, s.id
  `);
  return rows;
}

async function countExisting({ categoryId, subId }) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS n
       FROM item
      WHERE user_id = $1
        AND item_category = $2
        AND sub_category = $3
        AND title LIKE 'mondo %'`,
    [OWNER_USER_ID, categoryId, subId]
  );
  return rows[0].n;
}

async function insertOne({ client, categoryId, subId, categoryName, subName, slot }) {
  const region = SUBCATEGORY_REGION[subName] ?? null;
  const title = `mondo ${categoryName} #${subName}-${slot}`;
  const description =
    `Seeded item for ${categoryName} / ${subName}. Sample listing #${slot} of ${ITEMS_PER_SUBCATEGORY} in this sub-category.`;
  const price = 100 + Math.floor(Math.random() * 9900);

  const ins = await client.query(
    `INSERT INTO item
       (user_id, item_category, sub_category, title, description, price,
        condition, location, region, country_code, country, city, state,
        top_post, paid_status, status, shared_post_id)
     VALUES ($1, $2, $3, $4, $5, $6, 'new', 'Sample location', $7,
             NULL, NULL, NULL, NULL, FALSE, FALSE, 'active', NULL)
     RETURNING id`,
    [OWNER_USER_ID, categoryId, subId, title, description, price, region]
  );
  const newId = ins.rows[0].id;
  await client.query(
    `INSERT INTO item_images (item_id, image) VALUES ($1, $2)`,
    [newId, `https://picsum.photos/seed/mondo-${newId}-img1/600/400`]
  );
  return newId;
}

async function summarize(structure) {
  const { rows } = await pool.query(`
    SELECT c.id AS cat_id, c.name AS cat_name,
           COUNT(i.id)::int AS items
      FROM item_category c
      LEFT JOIN item i
        ON i.item_category = c.id
       AND i.user_id  = $1
       AND i.title LIKE 'mondo %'
     GROUP BY c.id, c.name
     ORDER BY c.id
  `, [OWNER_USER_ID]);
  return rows;
}

async function run() {
  try {
    console.log("=== mondo market top-up seed ===");
    const structure = await fetchCategoryStructure();
    console.log(`Pairs to inspect: ${structure.length} (target ${ITEMS_PER_SUBCATEGORY}/pair, total ${structure.length * ITEMS_PER_SUBCATEGORY})`);

    const owner = await pool.query(
      `SELECT id FROM users WHERE id = $1 AND is_deleted = FALSE`,
      [OWNER_USER_ID]
    );
    if (owner.rowCount === 0) {
      console.error(`Owner user_id=${OWNER_USER_ID} not found. Aborting.`);
      process.exit(1);
    }

    let insertedPairs = 0;
    let insertedItems = 0;

    for (const row of structure) {
      const existing = await countExisting({
        categoryId: row.category_id,
        subId: row.sub_id,
      });
      const missing = ITEMS_PER_SUBCATEGORY - existing;
      if (missing <= 0) continue;

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        for (let slot = existing + 1; slot <= ITEMS_PER_SUBCATEGORY; slot++) {
          await insertOne({
            client,
            categoryId: row.category_id,
            subId: row.sub_id,
            categoryName: row.category_name,
            subName: row.sub_name,
            slot,
          });
          insertedItems += 1;
        }
        await client.query("COMMIT");
        insertedPairs += 1;
        console.log(`  cat ${row.category_id} (${row.category_name}) / sub ${row.sub_id} (${row.sub_name}): +${missing} (now ${ITEMS_PER_SUBCATEGORY})`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }

    console.log(`Done. Pairs topped up: ${insertedPairs}. Items inserted: ${insertedItems}.`);
    console.log("Per-category mondo totals after fill:");
    const after = await summarize(structure);
    after.forEach((r) =>
      console.log(`  cat ${r.cat_id} (${r.cat_name}) -> ${r.items}`)
    );
    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  }
}

run();