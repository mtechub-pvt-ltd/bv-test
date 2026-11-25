/**
 * Cleanup script: remove pic_tours records whose image URL points to Cloudinary.
 *
 * Background: Cloudinary was used previously but has since been disabled.
 * Existing rows still reference Cloudinary URLs (e.g.
 *   https://res.cloudinary.com/<cloud_name>/image/upload/...)
 * which are now unreachable. This script removes those rows so the app
 * no longer surfaces dead image links.
 *
 * The pic_tours table has a single `image` column. Dependent tables
 * (pic_comment, like_pic) are linked by FK with ON DELETE CASCADE,
 * so deleting from pic_tours cleans up dependent rows automatically.
 *
 * Usage (from repo root):
 *   node migrations/cleanup_cloudinary_pictours.js           # dry-run (default)
 *   node migrations/cleanup_cloudinary_pictours.js --delete  # actually delete
 */
import pool from "../db.config/index.js";

const CLOUDINARY_PATTERN = "%cloudinary%";

async function fetchMatches() {
  const sql = `
    SELECT id, name, image, created_at
    FROM pic_tours
    WHERE image ILIKE $1
    ORDER BY id
  `;
  const { rows } = await pool.query(sql, [CLOUDINARY_PATTERN]);
  return rows;
}

async function deleteMatches(ids) {
  const sql = `
    DELETE FROM pic_tours
    WHERE id = ANY($1::int[])
      AND image ILIKE $2
    RETURNING id, name, image
  `;
  const { rows } = await pool.query(sql, [ids, CLOUDINARY_PATTERN]);
  return rows;
}

async function summaryCounts() {
  const totalQ = `SELECT COUNT(*)::int AS c FROM pic_tours`;
  const imgQ = `SELECT COUNT(*)::int AS c FROM pic_tours WHERE image ILIKE $1`;
  const [total, img] = await Promise.all([
    pool.query(totalQ),
    pool.query(imgQ, [CLOUDINARY_PATTERN]),
  ]);

  return {
    totalInPicTours: total.rows[0].c,
    imageColumnCloudinary: img.rows[0].c,
  };
}

async function run() {
  const shouldDelete = process.argv.includes("--delete");

  try {
    console.log("=== pic_tours Cloudinary cleanup ===");
    const counts = await summaryCounts();
    console.log("Counts before:", counts);

    const matches = await fetchMatches();
    console.log(`Matched rows (image contains 'cloudinary'): ${matches.length}`);

    if (matches.length === 0) {
      console.log("Nothing to do. Exiting.");
      process.exit(0);
    }

    if (!shouldDelete) {
      console.log("\nDRY RUN — pass --delete to actually remove these rows.");
      console.log("Sample (first 10):");
      matches.slice(0, 10).forEach((r) => {
        console.log(`  id=${r.id} name="${r.name}"`);
        console.log(`    image: ${r.image}`);
      });
      process.exit(0);
    }

    const ids = matches.map((r) => r.id);
    const deleted = await deleteMatches(ids);
    console.log(`Deleted ${deleted.length} rows.`);

    const after = await summaryCounts();
    console.log("Counts after:", after);
    process.exit(0);
  } catch (err) {
    console.error("Cleanup failed:", err);
    process.exit(1);
  }
}

run();