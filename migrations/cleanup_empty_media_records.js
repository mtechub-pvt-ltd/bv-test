/**
 * Cleanup script: remove rows that have no usable media.
 *
 *   - pic_tours: rows where image is NULL or empty string
 *   - xpi_videos (videomania): rows where BOTH video and thumbnail are NULL/empty
 *
 * Background: leftover test/abandoned uploads that have no media attached.
 * Dependent rows in pic_comment / like_pic / like_video / video_comment /
 * viewed_video / save_item_general are removed automatically via FK
 * ON DELETE CASCADE / SET NULL.
 *
 * Usage (from repo root):
 *   node migrations/cleanup_empty_media_records.js           # dry-run (default)
 *   node migrations/cleanup_empty_media_records.js --delete  # actually delete
 */
import pool from "../db.config/index.js";

async function fetchPicTours() {
  const { rows } = await pool.query(`
    SELECT id, name, image, created_at
    FROM pic_tours
    WHERE image IS NULL OR image = ''
    ORDER BY id
  `);
  return rows;
}

async function fetchXpiVideos() {
  const { rows } = await pool.query(`
    SELECT id, name, video, thumbnail, created_at
    FROM xpi_videos
    WHERE (video IS NULL OR video = '')
      AND (thumbnail IS NULL OR thumbnail = '')
    ORDER BY id
  `);
  return rows;
}

async function deletePicTours(ids) {
  if (ids.length === 0) return [];
  const { rows } = await pool.query(
    `DELETE FROM pic_tours WHERE id = ANY($1::int[]) RETURNING id, name`,
    [ids]
  );
  return rows;
}

async function deleteXpiVideos(ids) {
  if (ids.length === 0) return [];
  const { rows } = await pool.query(
    `DELETE FROM xpi_videos WHERE id = ANY($1::int[]) RETURNING id, name`,
    [ids]
  );
  return rows;
}

async function summaryCounts() {
  const pt = await pool.query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE image IS NULL OR image = '')::int AS empty_image
       FROM pic_tours`
  );
  const xv = await pool.query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE (video IS NULL OR video = '') AND (thumbnail IS NULL OR thumbnail = ''))::int AS empty_both
       FROM xpi_videos`
  );
  return {
    pic_tours: pt.rows[0],
    xpi_videos: xv.rows[0],
  };
}

async function run() {
  const shouldDelete = process.argv.includes("--delete");

  try {
    console.log("=== Empty-media cleanup (pic_tours + xpi_videos) ===");
    const before = await summaryCounts();
    console.log("Counts before:", before);

    const picTours = await fetchPicTours();
    const xpiVideos = await fetchXpiVideos();
    console.log(
      `Matched: pic_tours=${picTours.length}, xpi_videos=${xpiVideos.length}`
    );

    if (picTours.length === 0 && xpiVideos.length === 0) {
      console.log("Nothing to do. Exiting.");
      process.exit(0);
    }

    if (!shouldDelete) {
      console.log("\nDRY RUN — pass --delete to actually remove these rows.");
      console.log(`\npic_tours (first 10 of ${picTours.length}):`);
      picTours.slice(0, 10).forEach((r) =>
        console.log(`  id=${r.id} name=${JSON.stringify(r.name)} image=${JSON.stringify(r.image)}`)
      );
      console.log(`\nxpi_videos (first 10 of ${xpiVideos.length}):`);
      xpiVideos.slice(0, 10).forEach((r) =>
        console.log(
          `  id=${r.id} name=${JSON.stringify(r.name)} video=${JSON.stringify(r.video)} thumbnail=${JSON.stringify(r.thumbnail)}`
        )
      );
      process.exit(0);
    }

    const deletedPt = await deletePicTours(picTours.map((r) => r.id));
    const deletedXv = await deleteXpiVideos(xpiVideos.map((r) => r.id));
    console.log(
      `Deleted: pic_tours=${deletedPt.length}, xpi_videos=${deletedXv.length}`
    );

    const after = await summaryCounts();
    console.log("Counts after:", after);
    process.exit(0);
  } catch (err) {
    console.error("Cleanup failed:", err);
    process.exit(1);
  }
}

run();