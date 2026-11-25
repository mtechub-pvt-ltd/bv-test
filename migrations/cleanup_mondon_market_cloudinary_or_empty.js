/**
 * Cleanup script: remove item (mondon_market) rows that
 *   (a) have at least one image in item_images referencing Cloudinary, OR
 *   (b) have no images at all in item_images.
 *
 * Background: Cloudinary was used previously but is now disabled, so any
 * link of the form https://res.cloudinary.com/... is dead. Items with no
 * images are leftover test/abandoned/seed uploads.
 *
 * Note: the `item` table itself has no media column. All images live in
 * the `item_images` table (1-to-many via item_id).
 *
 * Dependent tables (item_images, save_item, send_offer,
 * mondon_market_comment, mondon_market_like, item_report) are linked
 * by FK with ON DELETE CASCADE / SET NULL, so dependent rows go with
 * them automatically.
 *
 * Usage (from repo root):
 *   node migrations/cleanup_mondon_market_cloudinary_or_empty.js           # dry-run
 *   node migrations/cleanup_mondon_market_cloudinary_or_empty.js --delete  # delete
 */
import pool from "../db.config/index.js";

const CLOUDINARY_PATTERN = "%cloudinary%";

async function fetchMatches() {
  const { rows } = await pool.query(
    `SELECT i.id, i.title, i.created_at,
            (SELECT COUNT(*)::int FROM item_images ii WHERE ii.item_id = i.id) AS image_count,
            EXISTS (SELECT 1 FROM item_images ii WHERE ii.item_id = i.id AND ii.image ILIKE $1) AS has_cloudinary_image
     FROM item i
     WHERE EXISTS (SELECT 1 FROM item_images ii WHERE ii.item_id = i.id AND ii.image ILIKE $1)
        OR NOT EXISTS (SELECT 1 FROM item_images ii WHERE ii.item_id = i.id)
     ORDER BY i.id`,
    [CLOUDINARY_PATTERN]
  );
  return rows;
}

async function deleteMatches(ids) {
  if (ids.length === 0) return [];
  const { rows } = await pool.query(
    `DELETE FROM item
     WHERE id = ANY($1::int[])
       AND (
         EXISTS (SELECT 1 FROM item_images ii WHERE ii.item_id = item.id AND ii.image ILIKE $2)
         OR NOT EXISTS (SELECT 1 FROM item_images ii WHERE ii.item_id = item.id)
       )
     RETURNING id, title`,
    [ids, CLOUDINARY_PATTERN]
  );
  return rows;
}

async function summaryCounts() {
  const { rows } = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM item) AS total_items,
       (SELECT COUNT(*)::int FROM item_images) AS total_images,
       (SELECT COUNT(DISTINCT item_id)::int FROM item_images WHERE image ILIKE $1) AS cloudinary_items,
       (SELECT COUNT(*)::int FROM item i
         WHERE NOT EXISTS (SELECT 1 FROM item_images ii WHERE ii.item_id = i.id)
       ) AS items_no_images,
       (SELECT COUNT(*)::int FROM item i
         WHERE EXISTS (SELECT 1 FROM item_images ii WHERE ii.item_id = i.id AND ii.image ILIKE $1)
            OR NOT EXISTS (SELECT 1 FROM item_images ii WHERE ii.item_id = i.id)
       ) AS combined
    `,
    [CLOUDINARY_PATTERN]
  );
  return rows[0];
}

async function run() {
  const shouldDelete = process.argv.includes("--delete");
  console.log("=== mondon_market (item) cleanup (cloudinary OR no images) ===");
  const before = await summaryCounts();
  console.log("Counts before:", before);

  const matches = await fetchMatches();
  console.log(`Matched items: ${matches.length}`);

  if (matches.length === 0) {
    console.log("Nothing to do. Exiting.");
    process.exit(0);
  }

  if (!shouldDelete) {
    console.log("\nDRY RUN — pass --delete to actually remove these rows.");
    console.log("Sample (first 25):");
    matches.slice(0, 25).forEach((r) => {
      const flags = [];
      if (r.has_cloudinary_image) flags.push("cloudinary_image");
      if (r.image_count === 0) flags.push("no_media");
      console.log(`  id=${r.id} flags=${flags.join(",")} title=${JSON.stringify(r.title)}`);
    });
    process.exit(0);
  }

  // Delete in chunks to avoid huge parameter arrays
  const CHUNK = 500;
  let deletedCount = 0;
  for (let i = 0; i < matches.length; i += CHUNK) {
    const chunk = matches.slice(i, i + CHUNK).map((r) => r.id);
    const deleted = await deleteMatches(chunk);
    deletedCount += deleted.length;
    console.log(`  progress: ${deletedCount}/${matches.length}`);
  }

  const after = await summaryCounts();
  console.log(`Deleted ${deletedCount} item rows.`);
  console.log("Counts after:", after);
  process.exit(0);
}

run().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});