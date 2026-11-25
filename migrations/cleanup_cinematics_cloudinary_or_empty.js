/**
 * Cleanup script: remove cinematics_videos rows that
 *   (a) reference a Cloudinary URL in video / thumbnail, OR
 *   (b) have no media at all (video and thumbnail both empty/null).
 *
 * Background: Cloudinary was used previously but is now disabled, so any
 * link of the form https://res.cloudinary.com/... is dead. Empty rows are
 * leftover test/abandoned uploads.
 *
 * Dependent tables (cinematics_video_comment, cinematics_video_like,
 * cinematics_video_viewed) are linked by FK with ON DELETE CASCADE,
 * so dependent rows go with them automatically.
 *
 * Usage (from repo root):
 *   node migrations/cleanup_cinematics_cloudinary_or_empty.js           # dry-run
 *   node migrations/cleanup_cinematics_cloudinary_or_empty.js --delete  # delete
 */
import pool from "../db.config/index.js";

const CLOUDINARY_PATTERN = "%cloudinary%";

async function fetchMatches() {
  const { rows } = await pool.query(
    `SELECT id, name, video, thumbnail, created_at
     FROM cinematics_videos
     WHERE video ILIKE $1
        OR thumbnail ILIKE $1
        OR ((video IS NULL OR video = '') AND (thumbnail IS NULL OR thumbnail = ''))
     ORDER BY id`,
    [CLOUDINARY_PATTERN]
  );
  return rows;
}

async function deleteMatches(ids) {
  if (ids.length === 0) return [];
  const { rows } = await pool.query(
    `DELETE FROM cinematics_videos
     WHERE id = ANY($1::int[])
       AND (
         video ILIKE $2
         OR thumbnail ILIKE $2
         OR ((video IS NULL OR video = '') AND (thumbnail IS NULL OR thumbnail = ''))
       )
     RETURNING id, name, video, thumbnail`,
    [ids, CLOUDINARY_PATTERN]
  );
  return rows;
}

async function summaryCounts() {
  const { rows } = await pool.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE video ILIKE $1 OR thumbnail ILIKE $1)::int AS cloudinary_any,
       COUNT(*) FILTER (WHERE (video IS NULL OR video = '') AND (thumbnail IS NULL OR thumbnail = ''))::int AS no_media,
       COUNT(*) FILTER (
         WHERE video ILIKE $1
           OR thumbnail ILIKE $1
           OR ((video IS NULL OR video = '') AND (thumbnail IS NULL OR thumbnail = ''))
       )::int AS combined
     FROM cinematics_videos`,
    [CLOUDINARY_PATTERN]
  );
  return rows[0];
}

async function run() {
  const shouldDelete = process.argv.includes("--delete");
  console.log("=== cinematics_videos cleanup (cloudinary OR empty media) ===");
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
      console.log(`  id=${r.id} name=${JSON.stringify(r.name)} video=${JSON.stringify(r.video)} thumbnail=${JSON.stringify(r.thumbnail)}`)
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