import pool from "../db.config/index.js";

async function run() {
  const cats = await pool.query(`
    SELECT id, name, french_name FROM item_category ORDER BY id
  `);
  console.log("item_category:");
  cats.rows.forEach(r => console.log(`  ${r.id}  ${r.name}  ${r.french_name || ""}`));

  const subs = await pool.query(`
    SELECT id, name, french_name, category_id FROM item_sub_category
    ORDER BY category_id, id LIMIT 30
  `);
  console.log("\nitem_sub_category (first 30):");
  subs.rows.forEach(r => console.log(`  ${r.id}  cat=${r.category_id}  ${r.name}  ${r.french_name || ""}`));

  // Real items that survived the cleanup (with images)
  const items = await pool.query(`
    SELECT i.id, i.title, ic.name AS category, i.created_at
    FROM item i
    LEFT JOIN item_category ic ON i.item_category = ic.id
    WHERE EXISTS (SELECT 1 FROM item_images ii WHERE ii.item_id = i.id)
    ORDER BY i.created_at DESC LIMIT 10
  `);
  console.log("\nrecent real items (still alive, have images):");
  items.rows.forEach(r => console.log(`  ${r.id} | ${r.title} | ${r.category} | ${r.created_at && r.created_at.toISOString().slice(0,10)}`));

  // A real item with full structure to understand the schema
  const real = await pool.query(`
    SELECT * FROM item ORDER BY id DESC LIMIT 1
  `);
  console.log("\nmost recent item row (full):", real.rows[0]);

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
