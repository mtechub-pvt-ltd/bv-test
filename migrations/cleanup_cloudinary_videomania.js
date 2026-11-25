/**
 * Cleanup script: remove videomania (xpi_videos) records whose video or
 * thumbnail URL points to Cloudinary.
 *
 * Background: Cloudinary was used previously but has since been disabled.
 * Existing rows still reference Cloudinary URLs (e.g.
 *   https://res.cloudinary.com/<cloud_name>/image/upload/...)
 * which are now unreachable. This script removes those rows from the
 * videomania module so the app no longer surfaces dead links.
 *
 * Related tables (left untouched here):
 *   - like_video, video_comment, viewed_video, save_item_general
 *     are linked by FK with ON DELETE CASCADE / SET NULL (see model/init.sql),
 *     so deleting from xpi_videos handles dependent rows automatically.
 *
 * Usage (from repo root):
 *   node migrations/cleanup_cloudinary_videomania.js           # dry-run (default)
 *   node migrations/cleanup_cloudinary_videomania.js --delete  # actually delete
 */
import pool from "../db.config/index.js";

const CLOUDINARY_PATTERN = "%cloudinary%";

async function fetchMatches() {
  const sql = `
    SELECT id, name, video, thumbnail, created_at
    FROM xpi_videos
    WHERE video ILIKE $1
       OR thumbnail ILIKE $1
    ORDER BY id
  `;
  const { rows } = await pool.query(sql, [CLOUDINARY_PATTERN]);
  return rows;
}

async function deleteMatches(ids) {
  const sql = `
    DELETE FROM xpi_videos
    WHERE id = ANY($1::int[])
      AND (video ILIKE $2 OR thumbnail ILIKE $2)
    RETURNING id, name, video, thumbnail
  `;
  const { rows } = await pool.query(sql, [ids, CLOUDINARY_PATTERN]);
  return rows;
}

async function summaryCounts() {
  const totalQ = `SELECT COUNT(*)::int AS c FROM xpi_videos`;
  const videoQ = `SELECT COUNT(*)::int AS c FROM xpi_videos WHERE video ILIKE $1`;
  const thumbQ = `SELECT COUNT(*)::int AS c FROM xpi_videos WHERE thumbnail ILIKE $1`;
  const eitherQ = `SELECT COUNT(*)::int AS c FROM xpi_videos WHERE video ILIKE $1 OR thumbnail ILIKE $1`;

  const [total, video, thumb, either] = await Promise.all([
    pool.query(totalQ),
    pool.query(videoQ, [CLOUDINARY_PATTERN]),
    pool.query(thumbQ, [CLOUDINARY_PATTERN]),
    pool.query(eitherQ, [CLOUDINARY_PATTERN]),
  ]);

  return {
    totalInVideomania: total.rows[0].c,
    videoColumnCloudinary: video.rows[0].c,
    thumbnailColumnCloudinary: thumb.rows[0].c,
    eitherColumnCloudinary: either.rows[0].c,
  };
}

async function run() {
  const shouldDelete = process.argv.includes("--delete");

  try {
    console.log("=== videomania (xpi_videos) Cloudinary cleanup ===");
    const counts = await summaryCounts();
    console.log("Counts before:", counts);

    const matches = await fetchMatches();
    console.log(`Matched rows (video OR thumbnail contains 'cloudinary'): ${matches.length}`);

    if (matches.length === 0) {
      console.log("Nothing to do. Exiting.");
      process.exit(0);
    }

    if (!shouldDelete) {
      console.log("\nDRY RUN — pass --delete to actually remove these rows.");
      console.log("Sample (first 10):");
      matches.slice(0, 10).forEach((r) => {
        console.log(`  id=${r.id} name="${r.name}"`);
        console.log(`    video    : ${r.video}`);
        console.log(`    thumbnail: ${r.thumbnail}`);
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