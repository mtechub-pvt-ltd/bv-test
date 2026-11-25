import "dotenv/config";
import pool from "../db.config/index.js";

async function run() {
  const pranksCaptionUrl = "https://wocha-gocha.testing.mtechub.org/fileUpload/f44f564a-83a4-4263-90c9-91106da0146c-1791274141195.vtt";
  const bwCaptionUrl = "https://wocha-gocha.testing.mtechub.org/fileUpload/27357649-8c86-411e-91ea-fdedfe84d80f-1791277527247.vtt";

  console.log("=== Updating Videos in DB with Closed Captions ===");

  // 1. Ensure columns exist
  await pool.query("ALTER TABLE top_video ADD COLUMN IF NOT EXISTS caption_url TEXT");
  await pool.query("ALTER TABLE xpi_videos ADD COLUMN IF NOT EXISTS caption_url TEXT");

  // 2. Update top_video id = 1
  const tvRes = await pool.query("SELECT id, video FROM top_video WHERE id = 1");
  if (tvRes.rows.length > 0) {
    const rawVideo = tvRes.rows[0].video.split("?")[0];
    const newVideo = `${rawVideo}?caption=${encodeURIComponent(pranksCaptionUrl)}`;
    await pool.query(
      "UPDATE top_video SET caption_url = $1, video = $2 WHERE id = 1",
      [pranksCaptionUrl, newVideo]
    );
    console.log("✅ Updated top_video id=1 successfully!");
  }

  // 3. Update xpi_videos id = 1023
  const xvRes = await pool.query("SELECT id, video FROM xpi_videos WHERE id = 1023");
  if (xvRes.rows.length > 0) {
    const rawVideo = xvRes.rows[0].video.split("?")[0];
    const newVideo = `${rawVideo}?caption=${encodeURIComponent(pranksCaptionUrl)}`;
    await pool.query(
      "UPDATE xpi_videos SET caption_url = $1, video = $2 WHERE id = 1023",
      [pranksCaptionUrl, newVideo]
    );
    console.log("✅ Updated xpi_videos id=1023 successfully!");
  }

  // 4. Update xpi_videos 1019, 1020, 1021, 1022 (the black & white movie clip)
  const bwIds = [1019, 1020, 1021, 1022];
  for (const id of bwIds) {
    const r = await pool.query("SELECT id, video FROM xpi_videos WHERE id = $1", [id]);
    if (r.rows.length > 0) {
      const rawVideo = (r.rows[0].video || "").split("?")[0];
      const newVideo = rawVideo ? `${rawVideo}?caption=${encodeURIComponent(bwCaptionUrl)}` : "";
      await pool.query(
        "UPDATE xpi_videos SET caption_url = $1, video = $2 WHERE id = $3",
        [bwCaptionUrl, newVideo, id]
      );
      console.log(`✅ Updated xpi_videos id=${id} with black-and-white dialogue captions!`);
    }
  }

  // 5. Update top_video rows using this clip (e.g. 3, 4)
  const tvBw = await pool.query("SELECT id, video FROM top_video WHERE video ILIKE '%a909b4a0%'");
  for (const r of tvBw.rows) {
    const rawVideo = r.video.split("?")[0];
    const newVideo = `${rawVideo}?caption=${encodeURIComponent(bwCaptionUrl)}`;
    await pool.query(
      "UPDATE top_video SET caption_url = $1, video = $2 WHERE id = $3",
      [bwCaptionUrl, newVideo, r.id]
    );
    console.log(`✅ Updated top_video id=${r.id} with black-and-white dialogue captions!`);
  }

  // 6. Verify updates
  const checkXv = await pool.query("SELECT id, name, video, caption_url FROM xpi_videos WHERE id = 1020");
  console.log("Verified xpi_videos 1020:", checkXv.rows[0]);

  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Error updating captions:", err);
  process.exit(1);
});
