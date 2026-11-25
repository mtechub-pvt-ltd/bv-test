import fs from "fs";
import path from "path";
import pool from "../db.config/index.js";
import { clearAllCache } from "../utils/cacheService.js";

const LIVE_BASE_URL = "https://wocha-gocha.testing.mtechub.org";
const DATA_FILE = "./scripts/data/real_tvprogmax_cache.json";

if (!fs.existsSync("./scripts/data")) {
  fs.mkdirSync("./scripts/data", { recursive: true });
}

// 25 Categories of TV Progmax
const CATEGORY_CONFIG = {
  1: { name: "News", query: "news OR broadcast OR journalism OR headline OR \"breaking news\"" },
  2: { name: "Debates", query: "debate OR discussion OR forum OR panel OR controversy OR arguments" },
  3: { name: "Interviews", query: "interview OR \"in conversation\" OR dialogue OR profile OR \"exclusive interview\"" },
  4: { name: "Series", query: "series OR episode OR drama OR serial OR broadcast OR telenovela" },
  5: { name: "Weather Forecast", query: "weather OR forecast OR meteorology OR storm OR climate OR hurricane" },
  6: { name: "Documentaries", query: "documentary OR expedition OR historical OR chronicle OR \"short documentary\"" },
  7: { name: "Talk Shows", query: "\"talk show\" OR \"chat show\" OR television OR studio OR broadcast" },
  8: { name: "Science", query: "science OR physics OR astronomy OR space OR research OR biology OR chemistry" },
  9: { name: "Technology", query: "technology OR computing OR robotics OR electronics OR innovation OR software" },
  10: { name: "Education", query: "education OR educational OR instructional OR lecture OR classroom OR learning" },
  11: { name: "Culture", query: "culture OR cultural OR heritage OR traditions OR folklore OR museum OR indigenous" },
  12: { name: "Youth", query: "youth OR children OR animation OR cartoon OR kids OR family OR adolescent" },
  13: { name: "Cooking", query: "cooking OR culinary OR recipe OR kitchen OR chef OR bakery OR meal" },
  14: { name: "Travel", query: "travel OR journey OR expedition OR tourism OR exploration OR voyage OR scenic" },
  15: { name: "Health & Wellness", query: "health OR wellness OR medicine OR fitness OR healthcare OR medical OR therapy" },
  16: { name: "Music", query: "music OR concert OR symphony OR musical OR orchestra OR performance OR song" },
  17: { name: "Quiz", query: "quiz OR \"game show\" OR trivia OR contest OR tournament OR puzzle" },
  18: { name: "Competitions", query: "competition OR championship OR tournament OR athletic OR race OR match OR olympic" },
  19: { name: "Comedy", query: "comedy OR sitcom OR humor OR funny OR satirical OR sketch OR laughter" },
  20: { name: "Animal & Wildlife", query: "wildlife OR animal OR safari OR fauna OR nature OR birds OR mammals" },
  21: { name: "Nature", query: "nature OR wilderness OR forest OR ocean OR mountains OR landscape OR river" },
  22: { name: "Religion", query: "religion OR spiritual OR faith OR sacred OR cathedral OR church OR prayer" },
  23: { name: "Ceremonies", query: "ceremony OR festival OR celebration OR parade OR commemoration OR anniversary" },
  24: { name: "Shopping", query: "shopping OR marketplace OR commercial OR products OR showcase OR consumer OR goods" },
  25: { name: "Sports", query: "sports OR football OR basketball OR soccer OR athletics OR racing OR boxing" }
};

const SUBLANG_TITLES = [
  { subcatName: "English", suffix: "" },
  { subcatName: "French", suffix: " (Édition Française)" },
  { subcatName: "Spanish", suffix: " (Edición en Español)" },
  { subcatName: "Arabic", suffix: " (التغطية الخاصة - Special)" },
  { subcatName: "Uncategorized", suffix: " (International Feature)" }
];

function cleanText(text) {
  if (!text) return "";
  if (Array.isArray(text)) text = text.join(" ");
  if (typeof text !== "string") text = String(text);
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
    const res = await fetch(thumbUrl, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) return thumbUrl;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 500) return thumbUrl;

    const blob = new Blob([buf], { type: "image/jpeg" });
    const form = new FormData();
    form.append("file", blob, `tv_thumb_${identifier}.jpg`);

    const upRes = await fetch(`${LIVE_BASE_URL}/api/upload`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(8000)
    });
    if (!upRes.ok) return thumbUrl;

    const data = await upRes.json();
    return (data.url || data.secure_url || thumbUrl).replace(/^http:\/\//, "https://");
  } catch (err) {
    return thumbUrl;
  }
}

async function inspectDoc(doc, globalSeenUrls) {
  try {
    const filesRes = await fetch(`https://archive.org/metadata/${doc.identifier}/files`, { signal: AbortSignal.timeout(3000) });
    if (!filesRes.ok) return null;
    const filesData = await filesRes.json();
    const files = filesData.result || [];

    const mp4 = files.find(
      (f) =>
        f.name &&
        f.name.endsWith(".mp4") &&
        !f.name.includes("_512kb") &&
        Number(f.size) > 1000000 &&
        Number(f.size) < 500000000
    );

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

      if (globalSeenUrls.has(rawVideoUrl)) return null;

      return {
        identifier: doc.identifier,
        rawTitle: doc.title,
        rawDescription: doc.description,
        videoUrl: rawVideoUrl,
        rawThumbUrl,
      };
    }
  } catch (e) {
    return null;
  }
  return null;
}

async function fetchCategoryVideos(catId, catConfig, globalSeenUrls, targetCount = 25) {
  console.log(`\n🔍 Fetching ${targetCount} unique videos for Category ${catId} (${catConfig.name})...`);

  const enc = encodeURIComponent(
    `mediatype:movies AND format:h.264 AND (${catConfig.query}) AND -title:TOSEC AND -collection:software AND -collection:opensource_audio`
  );

  let page = 1;
  const candidates = [];

  while (candidates.length < targetCount && page <= 5) {
    const searchUrl = `https://archive.org/advancedsearch.php?q=${enc}&fl[]=identifier,title,description,downloads&sort[]=downloads+desc&rows=50&page=${page}&output=json`;
    page++;

    try {
      const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(5000) });
      const searchData = await searchRes.json();
      const docs = searchData.response?.docs || [];
      if (docs.length === 0) break;

      const inspected = await Promise.all(docs.map(doc => inspectDoc(doc, globalSeenUrls)));
      for (const item of inspected) {
        if (item && !globalSeenUrls.has(item.videoUrl) && candidates.length < targetCount) {
          globalSeenUrls.add(item.videoUrl);
          candidates.push(item);
        }
      }
    } catch (err) {
      break;
    }
  }

  // Robust fallback if fewer than targetCount found
  if (candidates.length < targetCount) {
    console.log(`  Applying fallback search for Category ${catId} (currently ${candidates.length}/${targetCount})...`);
    const fbEnc = encodeURIComponent(
      `mediatype:movies AND format:h.264 AND (${catConfig.name.toLowerCase()} OR television OR broadcast OR documentary OR episode) AND -title:TOSEC AND -collection:software AND -collection:opensource_audio`
    );
    let fbPage = 1;
    while (candidates.length < targetCount && fbPage <= 5) {
      const fbSearchUrl = `https://archive.org/advancedsearch.php?q=${fbEnc}&fl[]=identifier,title,description,downloads&sort[]=downloads+desc&rows=50&page=${fbPage}&output=json`;
      fbPage++;
      try {
        const fbRes = await fetch(fbSearchUrl, { signal: AbortSignal.timeout(5000) });
        const fbData = await fbRes.json();
        const fbDocs = fbData.response?.docs || [];
        if (fbDocs.length === 0) break;

        const inspectedFb = await Promise.all(fbDocs.map(doc => inspectDoc(doc, globalSeenUrls)));
        for (const item of inspectedFb) {
          if (item && !globalSeenUrls.has(item.videoUrl) && candidates.length < targetCount) {
            globalSeenUrls.add(item.videoUrl);
            candidates.push(item);
          }
        }
      } catch (e) {
        break;
      }
    }
  }

  // Upload thumbnails with concurrency of 6
  console.log(`  Uploading ${candidates.length} thumbnails to CDN...`);
  const verified = [];
  const uploadConcurrency = 6;
  for (let i = 0; i < candidates.length; i += uploadConcurrency) {
    const batch = candidates.slice(i, i + uploadConcurrency);
    const uploadedBatch = await Promise.all(batch.map(async (item, batchIdx) => {
      const globalIdx = i + batchIdx;
      const cleanTitle = cleanText(item.rawTitle);
      const cleanDesc = cleanText(item.rawDescription);

      const subcatGroup = SUBLANG_TITLES[Math.floor(globalIdx / 5)] || SUBLANG_TITLES[0];

      const baseTitle = cleanTitle.length >= 6 ? cleanTitle.slice(0, 70) : `${catConfig.name} Broadcast Program #${globalIdx + 1}`;
      const finalTitle = `${baseTitle}${subcatGroup.suffix}`.slice(0, 85);

      const finalDesc =
        cleanDesc.length >= 15
          ? cleanDesc.slice(0, 250)
          : `High-definition broadcast programming and feature coverage in ${catConfig.name}.`;

      const uploadedThumb = await uploadThumbnail(item.rawThumbUrl, item.identifier);

      return {
        identifier: item.identifier,
        title: finalTitle,
        description: finalDesc,
        videoUrl: item.videoUrl,
        thumbUrl: uploadedThumb,
        subcatIndex: Math.floor(globalIdx / 5),
      };
    }));

    verified.push(...uploadedBatch);
    process.stdout.write(`    ✔ Uploaded ${verified.length}/${candidates.length} thumbnails\n`);
  }

  console.log(`  ✅ Category ${catId} (${catConfig.name}) acquired ${verified.length} verified videos.`);
  return verified;
}

async function main() {
  console.log("==========================================================");
  console.log("📺 SEEDING TV PROGMAX: REAL UNIQUE BROADCAST VIDEOS & THUMBS");
  console.log("==========================================================");

  // 1. Load seen video URLs from Video Mania (xpi_videos) to guarantee ZERO overlap
  const vmVideos = (await pool.query("SELECT DISTINCT video FROM xpi_videos WHERE video IS NOT NULL")).rows;
  const globalSeenUrls = new Set(vmVideos.map(r => r.video));
  console.log(`Loaded ${globalSeenUrls.size} existing Video Mania URLs to guarantee 100% uniqueness.`);

  // 2. Load or initialize cache
  let cache = {};
  if (fs.existsSync(DATA_FILE)) {
    try {
      cache = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
      console.log(`Loaded cached data for ${Object.keys(cache).length} categories.`);
      for (const catId of Object.keys(cache)) {
        for (const item of cache[catId]) {
          globalSeenUrls.add(item.videoUrl);
        }
      }
    } catch (e) {
      cache = {};
    }
  }

  // 3. Fetch 25 videos for all 25 categories
  for (let catId = 1; catId <= 25; catId++) {
    const catConfig = CATEGORY_CONFIG[catId];
    if (!catConfig) continue;

    if (!cache[catId] || cache[catId].length < 25) {
      const catItems = await fetchCategoryVideos(catId, catConfig, globalSeenUrls, 25);
      cache[catId] = catItems;
      fs.writeFileSync(DATA_FILE, JSON.stringify(cache, null, 2), "utf-8");
    } else {
      console.log(`Category ${catId} (${catConfig.name}) already has ${cache[catId].length} cached videos.`);
    }
  }

  // 4. Fetch all subcategories from database
  const subRows = (await pool.query("SELECT id, category_id, name FROM tv_progmax_sub_category ORDER BY category_id, id")).rows;
  const subcatsByCat = {};
  for (const s of subRows) {
    if (!subcatsByCat[s.category_id]) subcatsByCat[s.category_id] = [];
    subcatsByCat[s.category_id].push(s);
  }

  // 5. Update database rows
  console.log("\n==========================================================");
  console.log("💾 UPDATING tv_progmax_videos IN DATABASE...");
  console.log("==========================================================");

  const client = await pool.connect();
  try {
    await client.query("BEGIN;");
    let totalUpdated = 0;

    for (let catId = 1; catId <= 25; catId++) {
      const catItems = cache[catId] || [];
      const subcats = subcatsByCat[catId] || [];
      if (catItems.length === 0 || subcats.length === 0) continue;

      let itemIndex = 0;

      for (const subcat of subcats) {
        // Fetch 5 rows for this subcategory
        const dbRows = (await client.query(
          "SELECT id FROM tv_progmax_videos WHERE category_id = $1 AND sub_category_id = $2 ORDER BY id ASC LIMIT 5",
          [catId, subcat.id]
        )).rows;

        for (const row of dbRows) {
          if (itemIndex < catItems.length) {
            const item = catItems[itemIndex++];

            await client.query(
              "UPDATE tv_progmax_videos SET name = $1, description = $2, video = $3, thumbnail = $4, status = 'approved', updated_at = NOW() WHERE id = $5",
              [item.title, item.description, item.videoUrl, item.thumbUrl, row.id]
            );
            totalUpdated++;
          }
        }
      }
    }

    await client.query("COMMIT;");
    console.log(`✔ Successfully updated ${totalUpdated} records in tv_progmax_videos.`);

  } catch (err) {
    await client.query("ROLLBACK;");
    console.error("Database update error:", err);
  } finally {
    client.release();
  }

  // 6. Invalidate caches
  console.log("\n🧹 Purging application cache...");
  try {
    await clearAllCache();
    console.log("✔ Cache purged successfully!");
  } catch (err) {
    console.warn("Cache purge notice:", err.message);
  }

  // 7. Final Verification
  console.log("\n==========================================================");
  console.log("📊 FINAL VERIFICATION: TV PROGMAX MODULE");
  console.log("==========================================================");

  const [totalRes, distinctVideos, distinctThumbs, subcatCheck, catCheck, cdnCheck] = await Promise.all([
    pool.query("SELECT COUNT(*)::int as total FROM tv_progmax_videos"),
    pool.query("SELECT COUNT(DISTINCT video)::int as distinct_videos FROM tv_progmax_videos"),
    pool.query("SELECT COUNT(DISTINCT thumbnail)::int as distinct_thumbs FROM tv_progmax_videos"),
    pool.query("SELECT sub_category_id, COUNT(*)::int as cnt FROM tv_progmax_videos GROUP BY sub_category_id HAVING COUNT(*) != 5"),
    pool.query("SELECT category_id, COUNT(*)::int as cnt FROM tv_progmax_videos GROUP BY category_id ORDER BY category_id"),
    pool.query("SELECT COUNT(*)::int as non_cdn FROM tv_progmax_videos WHERE thumbnail NOT LIKE 'https://wocha-gocha.testing.mtechub.org/fileUpload/%'")
  ]);

  console.log({
    totalVideos: totalRes.rows[0].total,
    distinctVideos: distinctVideos.rows[0].distinct_videos,
    distinctThumbnails: distinctThumbs.rows[0].distinct_thumbs,
    subcategoriesNotFive: subcatCheck.rows.length,
    categoriesCount: catCheck.rows.length,
    nonCdnThumbnails: cdnCheck.rows[0].non_cdn
  });

  const samples = (await pool.query(
    "SELECT id, category_id, sub_category_id, name, video, thumbnail FROM tv_progmax_videos ORDER BY id ASC LIMIT 5"
  )).rows;
  console.log("\nSample updated records:", samples);

  console.log("\n🎉 TV PROGMAX UPGRADE COMPLETE!");
  process.exit(0);
}

main();
