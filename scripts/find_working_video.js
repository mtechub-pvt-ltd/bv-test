import "dotenv/config";
import pool from "../db.config/index.js";

async function run() {
  console.log("=== Finding Real Working Video in xpi_videos ===");

  // Fetch all videos from xpi_videos
  const { rows } = await pool.query(
    "SELECT id, name, description, video_category, video, thumbnail FROM xpi_videos WHERE video IS NOT NULL AND video != '' ORDER BY id DESC LIMIT 50"
  );

  console.log(`Found ${rows.length} total videos in xpi_videos.`);

  // Filter out broken sample-videos.com or dead domain links
  const working = rows.filter((v) => {
    const url = String(v.video || "").toLowerCase();
    return (
      !url.includes("sample-videos.com") &&
      !url.includes("commondatastorage.googleapis.com/gtv-videos-bucket") &&
      !url.includes("0x0.st")
    );
  });

  console.log(`Found ${working.length} REAL non-sample working video(s):`);
  working.forEach((v, i) => {
    console.log(`  [${i + 1}] ID: ${v.id}, Name: "${v.name}", Thumbnail: "${v.thumbnail}", Video: "${v.video}"`);
  });

  if (working.length > 0) {
    const bestVid = working[0];
    console.log(`\nSetting top_video to BEST REAL VIDEO ID ${bestVid.id} ("${bestVid.name}")...`);

    // Clear top_video
    await pool.query("DELETE FROM top_video");

    // Insert real working video with thumbnail into top_video
    const insertRes = await pool.query(
      `INSERT INTO top_video (name, description, video_category, video, thumbnail, image)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        bestVid.name || "Top Featured Video",
        bestVid.description || "Watch top trending video",
        bestVid.video_category || 1,
        bestVid.video,
        bestVid.thumbnail || "",
        bestVid.thumbnail || ""
      ]
    );

    console.log("✅ Successfully updated top_video table! New Record:", insertRes.rows[0]);
  } else {
    console.log("⚠️ No working real videos found. Showing top xpi_videos rows:", rows.slice(0, 5));
  }

  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Error finding working video:", err);
  process.exit(1);
});
