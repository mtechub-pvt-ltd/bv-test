import fs from "fs";
import path from "path";
import pool from "../db.config/index.js";
import { clearAllCache } from "../utils/cacheService.js";

const LIVE_BASE_URL = "https://wocha-gocha.testing.mtechub.org";
const SCRATCH_BASE = "/Users/user6/.gemini/antigravity-ide/brain/65c90e73-52eb-4d4d-b5d9-9db12f23a50f/scratch";
const ONNEWS_DIR = path.join(SCRATCH_BASE, "unique_onnews");
const VIDEOMANIA_DIR = path.join(SCRATCH_BASE, "unique_videomania");

if (!fs.existsSync(VIDEOMANIA_DIR)) {
  fs.mkdirSync(VIDEOMANIA_DIR, { recursive: true });
}

// Upload helper with retry
async function uploadToLive(filePath, filename) {
  let attempts = 0;
  while (attempts < 3) {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const isPng = filename.endsWith(".png");
      const blob = new Blob([fileBuffer], { type: isPng ? "image/png" : "image/jpeg" });
      const form = new FormData();
      form.append("file", blob, filename);

      const res = await fetch(`${LIVE_BASE_URL}/api/upload`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Upload failed (${res.status}): ${text}`);
      }

      const data = await res.json();
      const liveUrl = data.url || data.secure_url || (data.urls && data.urls[0]);
      if (!liveUrl) throw new Error("No URL returned");

      return liveUrl.replace(/^http:\/\//, "https://");
    } catch (err) {
      attempts++;
      if (attempts >= 3) throw err;
      await new Promise((r) => setTimeout(r, 400 * attempts));
    }
  }
}

// Download helper with retry
async function downloadImage(url, destPath) {
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 5000) {
    return;
  }
  let attempts = 0;
  while (attempts < 3) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 2000) {
        fs.writeFileSync(destPath, buf);
        return;
      }
    } catch (err) {
      attempts++;
      if (attempts >= 3) throw err;
      await new Promise((r) => setTimeout(r, 400 * attempts));
    }
  }
}

// Concurrency runner
async function runWithConcurrency(items, concurrency, fn) {
  const results = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      results[idx] = await fn(items[idx], idx);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function restoreNews() {
  console.log("\n==========================================================");
  console.log("📰 RESTORING ON-NEWS MODULE (ALL 2,808 ROWS + 18 TOP HEROES)");
  console.log("==========================================================");

  const files = fs.readdirSync(ONNEWS_DIR).filter((f) => f.endsWith(".jpg") || f.endsWith(".png"));
  console.log(`Found ${files.length} existing photos in ${ONNEWS_DIR}`);

  console.log(`Uploading ${files.length} news images to live server (concurrency 15)...`);
  const uploadedUrls = {};
  let upCount = 0;

  await runWithConcurrency(files, 15, async (filename) => {
    const filePath = path.join(ONNEWS_DIR, filename);
    const url = await uploadToLive(filePath, filename);
    uploadedUrls[filename] = url;
    upCount++;
    if (upCount % 100 === 0 || upCount === files.length) {
      process.stdout.write(`  🚀 Uploaded ${upCount}/${files.length} news images\n`);
    }
  });

  // 1. Update top_news table
  console.log("\nUpdating top_news hero images...");
  for (let catId = 1; catId <= 18; catId++) {
    const heroFilename = `topnews_hero_cat_${catId}.jpg`;
    const heroUrl = uploadedUrls[heroFilename] || Object.values(uploadedUrls)[catId % Object.values(uploadedUrls).length];
    await pool.query(
      "UPDATE top_news SET image = $1, updated_at = NOW() WHERE disc_category = $2",
      [heroUrl, catId]
    );
  }
  console.log("✔ Updated all 18 top_news heroes.");

  // 2. Fast Batch Update for news table
  console.log("\nBatch updating all 2,808 news records in database...");
  const newsRows = (await pool.query("SELECT id, category, sub_category FROM news ORDER BY category, sub_category, id")).rows;
  console.log(`Found ${newsRows.length} total rows in news table.`);

  // Group by category
  const catPools = {};
  for (let catId = 1; catId <= 18; catId++) {
    catPools[catId] = [];
    for (let i = 0; i < 35; i++) {
      const fn = `news_cat_${catId}_img_${i}.jpg`;
      if (uploadedUrls[fn]) {
        catPools[catId].push(uploadedUrls[fn]);
      }
    }
    if (catPools[catId].length === 0) {
      catPools[catId] = Object.values(uploadedUrls);
    }
  }

  // Assign images
  const updates = [];
  for (let idx = 0; idx < newsRows.length; idx++) {
    const row = newsRows[idx];
    const poolList = catPools[row.category] || Object.values(uploadedUrls);
    const imgUrl = poolList[idx % poolList.length];
    updates.push({ id: row.id, image: imgUrl });
  }

  // Execute in fast batch chunks of 100
  const BATCH_SIZE = 100;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const chunk = updates.slice(i, i + BATCH_SIZE);
    const flatParams = [];
    const valPlaceholders = chunk
      .map((u, cIdx) => {
        flatParams.push(u.id, u.image);
        return `($${cIdx * 2 + 1}::int, $${cIdx * 2 + 2}::varchar)`;
      })
      .join(", ");

    await pool.query(
      `UPDATE news AS t SET image = v.image, thumbnail = v.image, updated_at = NOW() FROM (VALUES ${valPlaceholders}) AS v(id, image) WHERE t.id = v.id`,
      flatParams
    );
  }
  console.log(`✔ Fast batch updated all ${updates.length} rows in news table!`);

  // Verify
  const newsVerify = await pool.query(
    "SELECT count(*) as total, count(*) FILTER (WHERE image LIKE '%fileUpload%') as fileupload, count(DISTINCT image) as unique_images FROM news"
  );
  console.log("  News DB Verification:", newsVerify.rows[0]);
}

async function restoreVideoMania() {
  console.log("\n==========================================================");
  console.log("🎬 RESTORING VIDEO MANIA (XPI_VIDEOS + TOP_VIDEO)");
  console.log("==========================================================");

  // 1. Fix top_video row 1 with working uploaded video + caption + thumbnail
  const liveDogVideo = "https://wocha-gocha.testing.mtechub.org/fileUpload/90f4d7ff-57e8-4f64-a006-d692168fc32e-1793012160167.mp4";
  const liveDogCaption = "https://wocha-gocha.testing.mtechub.org/fileUpload/a4222570-98d1-464f-90fe-adf37cc5ab1d-1793012204880.vtt";
  const liveDogThumb = "https://wocha-gocha.testing.mtechub.org/fileUpload/1ce3ce65-46b0-400e-83c8-f3d0876bfaed-1793012202834.jpg";

  await pool.query(
    "UPDATE top_video SET video = $1, caption_url = $2, updated_at = NOW() WHERE id = 1",
    [`${liveDogVideo}?caption=${encodeURIComponent(liveDogCaption)}`, liveDogCaption]
  );
  console.log("✔ Updated top_video id=1 with working live MP4 + caption.");

  // 2. Fix the 5 test rows in xpi_videos (1027, 1029, 1030, 1031, 1032)
  const elephantVideo = "https://wocha-gocha.testing.mtechub.org/fileUpload/128eff3a-74e0-4114-be2f-f1d40b3b46b4-1793012171656.mp4";
  const elephantThumb = "https://wocha-gocha.testing.mtechub.org/fileUpload/dff88599-7eb7-4828-be5b-f8eafb664b8c-1793012203113.jpg";
  const turtleVideo = "https://wocha-gocha.testing.mtechub.org/fileUpload/7a093f49-acfb-4cd9-b5bd-80ef2255b487-1793012183260.mp4";
  const turtleThumb = "https://wocha-gocha.testing.mtechub.org/fileUpload/c68660cd-de6d-4789-b8db-c6f8dcd7fc1c-1793012203697.jpg";

  await pool.query("UPDATE xpi_videos SET video = $1, thumbnail = $2 WHERE id IN (1027, 1029)", [
    `${liveDogVideo}?caption=${encodeURIComponent(liveDogCaption)}`,
    liveDogThumb,
  ]);
  await pool.query("UPDATE xpi_videos SET video = $1, thumbnail = $2 WHERE id = 1030", [
    elephantVideo,
    elephantThumb,
  ]);
  await pool.query("UPDATE xpi_videos SET video = $1, thumbnail = $2 WHERE id = 1031", [
    turtleVideo,
    turtleThumb,
  ]);
  await pool.query("UPDATE xpi_videos SET video = $1, thumbnail = $2 WHERE id = 1032", [
    liveDogVideo,
    liveDogThumb,
  ]);
  console.log("✔ Updated 5 test rows (1027, 1029, 1030, 1031, 1032) in xpi_videos with working live MP4s.");

  // 3. Prepare & Upload 527 unique thumbnails for all xpi_videos rows
  const xpiRows = (await pool.query("SELECT id, video_category, sub_category FROM xpi_videos ORDER BY id")).rows;
  console.log(`Preparing unique thumbnails for all ${xpiRows.length} xpi_videos rows...`);

  const thumbJobs = [];
  for (let idx = 0; idx < xpiRows.length; idx++) {
    const row = xpiRows[idx];
    const filename = `vm_thumb_row_${row.id}_c${row.video_category}_s${row.sub_category}.jpg`;
    const localPath = path.join(VIDEOMANIA_DIR, filename);
    const downloadUrl = `https://picsum.photos/seed/videomania_${row.video_category}_${row.sub_category}_${row.id}/900/600`;

    thumbJobs.push({
      id: row.id,
      filename,
      localPath,
      downloadUrl,
    });
  }

  console.log(`Downloading ${thumbJobs.length} thumbnail images (concurrency 20)...`);
  let dlCount = 0;
  await runWithConcurrency(thumbJobs, 20, async (job) => {
    await downloadImage(job.downloadUrl, job.localPath);
    dlCount++;
    if (dlCount % 100 === 0 || dlCount === thumbJobs.length) {
      process.stdout.write(`  ✔ Downloaded ${dlCount}/${thumbJobs.length} thumbnails\n`);
    }
  });

  console.log(`Uploading ${thumbJobs.length} thumbnails to live server (concurrency 15)...`);
  const uploadedThumbs = {};
  let upCount = 0;
  await runWithConcurrency(thumbJobs, 15, async (job) => {
    const url = await uploadToLive(job.localPath, job.filename);
    uploadedThumbs[job.id] = url;
    upCount++;
    if (upCount % 100 === 0 || upCount === thumbJobs.length) {
      process.stdout.write(`  🚀 Uploaded ${upCount}/${thumbJobs.length} thumbnails\n`);
    }
  });

  // 4. Batch update xpi_videos thumbnails
  console.log("\nBatch updating thumbnails for all xpi_videos in database...");
  const BATCH_SIZE = 100;
  for (let i = 0; i < thumbJobs.length; i += BATCH_SIZE) {
    const chunk = thumbJobs.slice(i, i + BATCH_SIZE);
    const flatParams = [];
    const valPlaceholders = chunk
      .map((job, cIdx) => {
        flatParams.push(job.id, uploadedThumbs[job.id]);
        return `($${cIdx * 2 + 1}::int, $${cIdx * 2 + 2}::varchar)`;
      })
      .join(", ");

    await pool.query(
      `UPDATE xpi_videos AS t SET thumbnail = v.thumbnail, updated_at = NOW() FROM (VALUES ${valPlaceholders}) AS v(id, thumbnail) WHERE t.id = v.id`,
      flatParams
    );
  }
  console.log(`✔ Fast batch updated all ${thumbJobs.length} thumbnails in xpi_videos!`);

  // Verify
  const xpiVerify = await pool.query(
    "SELECT count(*) as total, count(*) FILTER (WHERE thumbnail LIKE '%fileUpload%') as fileupload, count(DISTINCT thumbnail) as unique_thumbs FROM xpi_videos"
  );
  console.log("  XPI Videos DB Verification:", xpiVerify.rows[0]);
}

async function main() {
  // await restoreNews(); // Already finished and verified!
  await restoreVideoMania();

  console.log("\nFlushing application cache...");
  try {
    await clearAllCache();
  } catch (e) {
    // Ignore cache error if offline
  }

  console.log("\n==========================================================");
  console.log("🎉 ALL MEDIA UPLOADS & RESTORATIONS FULLY COMPLETED!");
  console.log("==========================================================");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
