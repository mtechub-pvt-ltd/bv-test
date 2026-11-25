/**
 * Cleanup script: remove sports rows that
 *   (a) reference a Cloudinary URL in image / video / thumbnail, OR
 *   (b) have no media at all (image, video and thumbnail all empty/null).
 *
 * Background: Cloudinary was used previously but is now disabled, so any
 * link of the form https://res.cloudinary.com/... is dead. Empty rows are
 * leftover test/abandoned uploads.
 *
 * Dependent tables (sport_comment, sport_like) are linked by FK with
 * ON DELETE CASCADE, so dependent rows go with them automatically.
 *
 * Usage (from repo root):
 *   node migrations/cleanup_sports_cloudinary_or_empty.js           # dry-run
 *   node migrations/cleanup_sports_cloudinary_or_empty.js --delete  # delete
 */
import pool from "../db.config/index.js";

const CLOUDINARY_PATTERN = "%cloudinary%";

async function fetchMatches() {
  const { rows } = await pool.query(
    `
    SELECT id, name, type, image, video, thumbnail, created_at
    FROM sports
    WHERE image ILIKE $1
       OR video ILIKE $1
       OR thumbnail ILIKE $1
       OR (
         (image IS NULL OR image = '')
         AND (video IS NULL OR video = '')
         AND (thumbnail IS NULL OR thumbnail = '')
       )
    ORDER BY id
    `,
    [CLOUDINARY_PATTERN]
  );
  return rows;
}

async function deleteMatches(ids) {
  if (ids.length === 0) return [];
  const { rows } = await pool.query(
    `
    DELETE FROM sports
    WHERE id = ANY($1::int[])
      AND (
        image ILIKE $2
        OR video ILIKE $2
        OR thumbnail ILIKE $2
        OR (
          (image IS NULL OR image = '')
          AND (video IS NULL OR video = '')
          AND (thumbnail IS NULL OR thumbnail = '')
        )
      )
    RETURNING id, name, type, image, video, thumbnail
    `,
    [ids, CLOUDINARY_PATTERN]
  );
  return rows;
}

async function summaryCounts() {
  const { rows } = await pool.query(
    `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE image ILIKE $1 OR video ILIKE $1 OR thumbnail ILIKE $1)::int AS cloudinary_any,
      COUNT(*) FILTER (
        WHERE (image IS NULL OR image = '')
          AND (video IS NULL OR video = '')
          AND (thumbnail IS NULL OR thumbnail = '')
      )::int AS no_media,
      COUNT(*) FILTER (
        WHERE image ILIKE $1
          OR video ILIKE $1
          OR thumbnail ILIKE $1
          OR (
            (image IS NULL OR image = '')
            AND (video IS NULL OR video = '')
            AND (thumbnail IS NULL OR thumbnail = '')
          )
      )::int AS combined
    FROM sports
    `,
    [CLOUDINARY_PATTERN]
  );
  return rows[0];
}

async function run() {
  const shouldDelete = process.argv.includes("--delete");

  try {
    console.log("=== sports module cleanup (cloudinary OR empty media) ===");
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
        console.log(
          `  id=${r.id} name=${JSON.stringify(r.name)} type=${r.type} image=${JSON.stringify(r.image)} video=${JSON.stringify(r.video)} thumbnail=${JSON.stringify(r.thumbnail)}`
        )
      );
      process.exit(0);
    }

    const deleted = await deleteMatches(matches.map((r) => r.id));
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