/**
 * Cleanup script: remove GEBC rows that
 *   (a) reference a Cloudinary URL in image, OR
 *   (b) have no media at all (image is NULL or empty).
 *
 * Background: Cloudinary was used previously but is now disabled, so any
 * link of the form https://res.cloudinary.com/... is dead. Empty rows are
 * leftover test/abandoned uploads.
 *
 * Note: the GEBC table only has an `image` column (no video/thumbnail).
 *
 * Dependent tables (GEBC_comment, like_GEBC) are linked by FK with
 * ON DELETE CASCADE, so dependent rows go with them automatically.
 *
 * Usage (from repo root):
 *   node migrations/cleanup_gebc_cloudinary_or_empty.js           # dry-run
 *   node migrations/cleanup_gebc_cloudinary_or_empty.js --delete  # delete
 */
import pool from "../db.config/index.js";

const CLOUDINARY_PATTERN = "%cloudinary%";

async function fetchMatches() {
  const { rows } = await pool.query(
    `SELECT id, name, image, created_at
     FROM gebc
     WHERE image ILIKE $1
        OR image IS NULL
        OR image = ''
     ORDER BY id`,
    [CLOUDINARY_PATTERN]
  );
  return rows;
}

async function deleteMatches(ids) {
  if (ids.length === 0) return [];
  const { rows } = await pool.query(
    `DELETE FROM gebc
     WHERE id = ANY($1::int[])
       AND (image ILIKE $2 OR image IS NULL OR image = '')
     RETURNING id, name, image`,
    [ids, CLOUDINARY_PATTERN]
  );
  return rows;
}

async function summaryCounts() {
  const { rows } = await pool.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE image ILIKE $1)::int AS cloudinary_image,
       COUNT(*) FILTER (WHERE image IS NULL OR image = '')::int AS no_media,
       COUNT(*) FILTER (WHERE image ILIKE $1 OR image IS NULL OR image = '')::int AS combined
     FROM gebc`,
    [CLOUDINARY_PATTERN]
  );
  return rows[0];
}

async function run() {
  const shouldDelete = process.argv.includes("--delete");
  console.log("=== GEBC cleanup (cloudinary OR empty image) ===");
  const before = await summaryCounts();
  console.log("Counts before:", before);

  const matches = await fetchMatches();
  console.log(`Matched rows: ${matches.length}`);

  if (matches.length === 0) {
    console.log("Nothing to do. Exiting.");
    process.exit(0);
  }

  if (!shouldDelete) {
    console.log("\nDRY RUN — pass --delete to actually remove these rows.");
    matches.slice(0, 25).forEach((r) =>
      console.log(`  id=${r.id} name=${JSON.stringify(r.name)} image=${JSON.stringify(r.image)}`)
    );
    process.exit(0);
  }

  const deleted = await deleteMatches(matches.map((r) => r.id));
  console.log(`Deleted ${deleted.length} rows.`);

  const after = await summaryCounts();
  console.log("Counts after:", after);
  process.exit(0);
}

run().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});