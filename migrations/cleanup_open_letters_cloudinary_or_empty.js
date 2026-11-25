/**
 * Cleanup script: remove open letter (post_letters) rows that
 *   (a) reference a Cloudinary URL in their video, OR
 *   (b) have at least one image row in post_letters_images that references Cloudinary, OR
 *   (c) have no video AND no images at all.
 *
 * Background: Cloudinary was used previously but is now disabled, so any
 * link of the form https://res.cloudinary.com/... is dead. Empty rows
 * are leftover test/abandoned/seed uploads.
 *
 * Dependent tables (post_letters_images, like_post_letter, comment_post_letter,
 * report_post_letter, letter_reciever_info) are linked by FK with
 * ON DELETE CASCADE, so dependent rows go with them automatically.
 *
 * Usage (from repo root):
 *   node migrations/cleanup_open_letters_cloudinary_or_empty.js           # dry-run
 *   node migrations/cleanup_open_letters_cloudinary_or_empty.js --delete  # delete
 */
import pool from "../db.config/index.js";

const CLOUDINARY_PATTERN = "%cloudinary%";

async function fetchMatches() {
  const { rows } = await pool.query(
    `
    SELECT pl.id, pl.name, pl.video,
           (SELECT COUNT(*) FROM post_letters_images pli WHERE pli.letter_id = pl.id)::int AS image_count,
           EXISTS (SELECT 1 FROM post_letters_images pli WHERE pli.letter_id = pl.id AND pli.image ILIKE $1) AS has_cloudinary_image
    FROM post_letters pl
    WHERE pl.video ILIKE $1
       OR EXISTS (SELECT 1 FROM post_letters_images pli WHERE pli.letter_id = pl.id AND pli.image ILIKE $1)
       OR (
         (pl.video IS NULL OR pl.video = '')
         AND NOT EXISTS (SELECT 1 FROM post_letters_images pli WHERE pli.letter_id = pl.id)
       )
    ORDER BY pl.id
    `,
    [CLOUDINARY_PATTERN]
  );
  return rows;
}

async function deleteMatches(ids) {
  if (ids.length === 0) return [];
  const { rows } = await pool.query(
    `
    DELETE FROM post_letters
    WHERE id = ANY($1::int[])
      AND (
        video ILIKE $2
        OR EXISTS (SELECT 1 FROM post_letters_images pli WHERE pli.letter_id = post_letters.id AND pli.image ILIKE $2)
        OR (
          (video IS NULL OR video = '')
          AND NOT EXISTS (SELECT 1 FROM post_letters_images pli WHERE pli.letter_id = post_letters.id)
        )
      )
    RETURNING id, name
    `,
    [ids, CLOUDINARY_PATTERN]
  );
  return rows;
}

async function summaryCounts() {
  const { rows } = await pool.query(
    `
    SELECT
      (SELECT COUNT(*)::int FROM post_letters) AS total_letters,
      (SELECT COUNT(*)::int FROM post_letters_images) AS total_images,
      (SELECT COUNT(*)::int FROM post_letters WHERE video ILIKE $1) AS cloudinary_video,
      (SELECT COUNT(DISTINCT letter_id)::int FROM post_letters_images WHERE image ILIKE $1) AS cloudinary_image_letters,
      (SELECT COUNT(*)::int FROM post_letters pl
         WHERE (pl.video IS NULL OR pl.video = '')
           AND NOT EXISTS (SELECT 1 FROM post_letters_images pli WHERE pli.letter_id = pl.id)
      ) AS empty_letters,
      (SELECT COUNT(*)::int FROM post_letters pl
         WHERE pl.video ILIKE $1
            OR EXISTS (SELECT 1 FROM post_letters_images pli WHERE pli.letter_id = pl.id AND pli.image ILIKE $1)
            OR ((pl.video IS NULL OR pl.video = '')
                AND NOT EXISTS (SELECT 1 FROM post_letters_images pli WHERE pli.letter_id = pl.id))
      ) AS combined
    `,
    [CLOUDINARY_PATTERN]
  );
  return rows[0];
}

async function run() {
  const shouldDelete = process.argv.includes("--delete");

  try {
    console.log("=== open letters (post_letters) cleanup (cloudinary OR no media) ===");
    const before = await summaryCounts();
    console.log("Counts before:", before);

    const matches = await fetchMatches();
    console.log(`Matched letters: ${matches.length}`);

    if (matches.length === 0) {
      console.log("Nothing to do. Exiting.");
      process.exit(0);
    }

    if (!shouldDelete) {
      console.log("\nDRY RUN — pass --delete to actually remove these rows.");
      console.log(`Sample (first 20 of ${matches.length}):`);
      matches.slice(0, 20).forEach((r) => {
        const flags = [];
        if (r.video && r.video.toLowerCase().includes("cloudinary")) flags.push("cloudinary_video");
        if (r.has_cloudinary_image) flags.push("cloudinary_image");
        if ((!r.video || r.video === "") && r.image_count === 0) flags.push("no_media");
        console.log(`  id=${r.id} name=${JSON.stringify(r.name)} flags=${flags.join(",")} video=${JSON.stringify(r.video)} image_count=${r.image_count}`);
      });
      process.exit(0);
    }

    const deleted = await deleteMatches(matches.map((r) => r.id));
    console.log(`Deleted ${deleted.length} letter rows.`);

    const after = await summaryCounts();
    console.log("Counts after:", after);
    process.exit(0);
  } catch (err) {
    console.error("Cleanup failed:", err);
    process.exit(1);
  }
}

run();