import fs from "fs";
import path from "path";
import pool from "../db.config/index.js";
import { clearAllCache } from "../utils/cacheService.js";

const LIVE_BASE_URL = "https://wocha-gocha.testing.mtechub.org";
const DATA_FILE = "./scripts/data/real_videomania_cache.json";

// Ensure data dir exists
if (!fs.existsSync("./scripts/data")) {
  fs.mkdirSync("./scripts/data", { recursive: true });
}

const CATEGORY_QUERIES = {
  1: { name: "Pranks", query: "prank OR pranks OR \"practical joke\" OR \"hidden camera\"" },
  2: { name: "Comedy", query: "comedy OR standup OR \"stand up comedy\" OR \"funny clips\"" },
  3: { name: "Sketches", query: "sketch OR \"comedy sketch\" OR parody OR skit OR satire" },
  4: { name: "Tutorial", query: "tutorial OR \"how to\" OR instructional OR lesson OR walkthrough" },
  5: { name: "Challenges", query: "challenge OR contest OR competition OR tournament" },
  6: { name: "Vlogs", query: "vlog OR vlogging OR \"day in the life\" OR \"video blog\"" },
  7: { name: "Technology & AI", query: "\"artificial intelligence\" OR robotics OR technology OR computers OR software" },
  8: { name: "Unboxing", query: "unboxing OR \"product review\" OR gadget OR tech OR hardware" },
  9: { name: "Explainer", query: "explainer OR documentary OR science OR education OR history" },
  10: { name: "Concerts", query: "concert OR \"live concert\" OR \"live music\" OR band OR performance" },
  11: { name: "Cooking", query: "cooking OR recipe OR culinary OR kitchen OR chef OR baking" },
  12: { name: "Travel", query: "travel OR tourism OR expedition OR journey OR exploring" },
  13: { name: "Fitness", query: "fitness OR workout OR exercise OR bodybuilding OR training" },
  14: { name: "Beauty & Fashion", query: "fashion OR \"runway fashion\" OR beauty OR makeup OR style" },
  15: { name: "DIY & Crafts", query: "crafts OR \"diy crafts\" OR woodworking OR handmade OR pottery" },
  16: { name: "Gaming", query: "gaming OR \"video game\" OR gameplay OR playthrough OR esports" },
  17: { name: "Animation", query: "animation OR \"animated short\" OR cartoon OR \"3d animation\"" },
  18: { name: "Motivational", query: "motivational OR inspiration OR speech OR leadership OR ambition" },
  19: { name: "Storytelling", query: "storytelling OR \"short film\" OR narrative OR drama OR cinema" },
  20: { name: "Business", query: "business OR startup OR entrepreneur OR economics OR finance" },
  21: { name: "Social & Cultural", query: "culture OR cultural OR traditions OR heritage OR festival" },
};

function cleanText(text) {
  if (!text) return "";
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/youtube|download|mp4|ia\.mp4|official video|full video|archive\.org/gi, "")
    .replace(/[_\-\|\/\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function uploadThumbnail(thumbUrl, identifier) {
  try {
    const res = await fetch(thumbUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return thumbUrl;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 500) return thumbUrl;

    const blob = new Blob([buf], { type: "image/jpeg" });
    const form = new FormData();
    form.append("file", blob, `vm_thumb_${identifier}.jpg`);

    const upRes = await fetch(`${LIVE_BASE_URL}/api/upload`, {
      method: "POST",
      body: form,
    });
    if (!upRes.ok) return thumbUrl;

    const data = await upRes.json();
    return (data.url || data.secure_url || thumbUrl).replace(/^http:\/\//, "https://");
  } catch (err) {
    return thumbUrl;
  }
}

async function fetchCategoryVideos(catId, catConfig, targetCount = 25) {
  console.log(`\n🔍 Fetching ${targetCount} real videos for Category ${catId} (${catConfig.name})...`);
  const enc = encodeURIComponent(`mediatype:movies AND format:h.264 AND (${catConfig.query})`);
  const searchUrl = `https://archive.org/advancedsearch.php?q=${enc}&fl[]=identifier,title,description,downloads&sort[]=downloads+desc&rows=${targetCount * 4}&page=1&output=json`;

  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();
  const docs = searchData.response?.docs || [];

  const verified = [];
  const seenUrls = new Set();

  for (const doc of docs) {
    if (verified.length >= targetCount) break;
    try {
      const filesRes = await fetch(`https://archive.org/metadata/${doc.identifier}/files`);
      const filesData = await filesRes.json();
      const files = filesData.result || [];

      // Find best MP4 video (between 1MB and 120MB)
      const mp4 = files.find(
        (f) =>
          f.name &&
          f.name.endsWith(".mp4") &&
          !f.name.includes("_512kb") &&
          Number(f.size) > 1000000 &&
          Number(f.size) < 120000000
      );

      // Find matching thumbnail extracted from video
      const thumb = files.find(
        (f) =>
          f.name &&
          (f.name.endsWith(".jpg") || f.name.endsWith(".png")) &&
          (f.name.includes("thumb") ||
            f.format?.includes("Thumbnail") ||
            f.format?.includes("Item Image") ||
            f.name.includes(".thumbs"))
      );

      if (mp4 && thumb && doc.title) {
        const rawVideoUrl = `https://archive.org/download/${doc.identifier}/${encodeURIComponent(mp4.name)}`;
        const rawThumbUrl = `https://archive.org/download/${doc.identifier}/${encodeURIComponent(thumb.name)}`;

        if (seenUrls.has(rawVideoUrl)) continue;
        seenUrls.add(rawVideoUrl);

        const cleanTitle = cleanText(doc.title);
        const cleanDesc = cleanText(doc.description);

        const finalTitle =
          cleanTitle.length >= 6
            ? cleanTitle.slice(0, 80)
            : `${catConfig.name}: Real Feature Story #${verified.length + 1}`;

        const finalDesc =
          cleanDesc.length >= 15
            ? cleanDesc.slice(0, 250)
            : `Compelling real story and visual moments in ${catConfig.name}.`;

        // Upload thumbnail to staging server for instant CDN loading
        const uploadedThumb = await uploadThumbnail(rawThumbUrl, doc.identifier);

        verified.push({
          identifier: doc.identifier,
          title: finalTitle,
          description: finalDesc,
          videoUrl: rawVideoUrl,
          thumbUrl: uploadedThumb,
        });

        process.stdout.write(`  ✔ [${verified.length}/${targetCount}] ${finalTitle.slice(0, 45)}...\n`);
      }
    } catch (e) {
      // skip errors on individual items
    }
  }

  console.log(`✅ Category ${catId} (${catConfig.name}) acquired ${verified.length} unique videos.`);
  return verified;
}

async function main() {
  console.log("==========================================================");
  console.log("🚀 POPULATING VIDEO MANIA WITH REAL UNIQUE STORY-DRIVEN VIDEOS");
  console.log("==========================================================");

  let cache = {};
  if (fs.existsSync(DATA_FILE)) {
    try {
      cache = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
      console.log(`Loaded cached data for ${Object.keys(cache).length} categories.`);
    } catch (e) {
      cache = {};
    }
  }

  // Fetch for all 21 categories
  for (let catId = 1; catId <= 21; catId++) {
    if (!cache[catId] || cache[catId].length < 25) {
      const catConfig = CATEGORY_QUERIES[catId];
      const items = await fetchCategoryVideos(catId, catConfig, 25);
      cache[catId] = items;
      fs.writeFileSync(DATA_FILE, JSON.stringify(cache, null, 2), "utf-8");
    }
  }

  console.log("\n==========================================================");
  console.log("💾 UPDATING DATABASE (xpi_videos & top_video)...");
  console.log("==========================================================");

  const client = await pool.connect();

  try {
    await client.query("BEGIN;");

    let totalUpdated = 0;

    for (let catId = 1; catId <= 21; catId++) {
      const catItems = cache[catId] || [];
      if (catItems.length === 0) continue;

      // Fetch the 25 rows in xpi_videos for this category ordered by sub_category, id
      const dbRows = (
        await client.query(
          "SELECT id, sub_category FROM xpi_videos WHERE video_category = $1 ORDER BY sub_category, id",
          [catId]
        )
      ).rows;

      console.log(`Category ${catId} (${CATEGORY_QUERIES[catId].name}): updating ${dbRows.length} records...`);

      for (let i = 0; i < dbRows.length; i++) {
        const row = dbRows[i];
        const data = catItems[i % catItems.length];

        await client.query(
          `UPDATE xpi_videos 
           SET name = $1, description = $2, video = $3, thumbnail = $4, updated_at = NOW() 
           WHERE id = $5`,
          [data.title, data.description, data.videoUrl, data.thumbUrl, row.id]
        );
        totalUpdated++;
      }

      // Update top_video for this category with the premiere #1 item
      const topData = catItems[0];
      const topExists = (
        await client.query("SELECT id FROM top_video WHERE video_category = $1", [catId])
      ).rows;

      if (topExists.length > 0) {
        await client.query(
          `UPDATE top_video 
           SET name = $1, description = $2, video = $3, updated_at = NOW() 
           WHERE video_category = $4`,
          [
            `Featured: ${topData.title}`,
            topData.description,
            topData.videoUrl,
            catId,
          ]
        );
      } else {
        await client.query(
          `INSERT INTO top_video (name, description, video_category, video, created_at, updated_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW())`,
          [
            `Featured: ${topData.title}`,
            topData.description,
            catId,
            topData.videoUrl,
          ]
        );
      }
    }

    await client.query("COMMIT;");
    clearAllCache();
    console.log(`\n🎉 Successfully updated ${totalUpdated} Video Mania records with real, unique videos and matching thumbnails!`);
  } catch (err) {
    await client.query("ROLLBACK;");
    console.error("❌ Database update failed:", err);
    throw err;
  } finally {
    client.release();
    process.exit(0);
  }
}

main();
