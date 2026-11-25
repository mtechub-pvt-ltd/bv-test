import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import pkg from "pg";
const { Pool } = pkg;

dotenv.config();

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3801";
const scratchDir = "/Users/user6/.gemini/antigravity-ide/brain/72b27b92-c930-4c90-844c-3fefdb5573b7/scratch/live_media";

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "user6",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "watchagocha-db",
  port: Number(process.env.DB_PORT) || 5432,
});

// Live online media to download and verify
const liveMediaToFetch = [
  {
    type: "video",
    filename: "wildlife_nature_4k.mp4",
    url: "https://www.w3schools.com/html/mov_bbb.mp4",
    mime: "video/mp4",
  },
  {
    type: "video",
    filename: "cinematic_animation_story.mp4",
    url: "https://raw.githubusercontent.com/mediaelement/mediaelement-files/master/big_buck_bunny.mp4",
    mime: "video/mp4",
  },
  {
    type: "video",
    filename: "music_visual_performance.mp4",
    url: "https://raw.githubusercontent.com/mediaelement/mediaelement-files/master/echo-hereweare.mp4",
    mime: "video/mp4",
  },
  {
    type: "image",
    filename: "thumb_sport_fitness.jpg",
    url: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&q=80",
    mime: "image/jpeg",
  },
  {
    type: "image",
    filename: "thumb_cinematic_aerial.jpg",
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
    mime: "image/jpeg",
  },
  {
    type: "image",
    filename: "thumb_entertainment_music.jpg",
    url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80",
    mime: "image/jpeg",
  },
  {
    type: "image",
    filename: "thumb_comedy_pranks.jpg",
    url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80",
    mime: "image/jpeg",
  },
];

const videoManiaEntries = [
  {
    title: "Extreme Calisthenics & High-Intensity Street Workout",
    description: "Real-world athletic performance, bodyweight training, and strength conditioning captured in high definition.",
    catName: "Pi V",
    subName: "Sport & Fitness",
    videoFile: "wildlife_nature_4k.mp4",
    thumbFile: "thumb_sport_fitness.jpg",
  },
  {
    title: "Cinematic Coastal Aerials & Nature Exploration",
    description: "Breathtaking landscapes, turquoise ocean waters, and golden hour aerial views shot across coastal national parks.",
    catName: "Pi V",
    subName: "Creativity & Entertainment",
    videoFile: "cinematic_animation_story.mp4",
    thumbFile: "thumb_cinematic_aerial.jpg",
  },
  {
    title: "Live Acoustic Indie Performance & Visual Echo Session",
    description: "An authentic live music performance featuring acoustic guitar, immersive stage lighting, and vocal harmonies.",
    catName: "09V",
    subName: "Creativity & Entertainment",
    videoFile: "music_visual_performance.mp4",
    thumbFile: "thumb_entertainment_music.jpg",
  },
  {
    title: "Funny Gaming Fails, Glitches & Live Prank Highlights",
    description: "The top viral gaming moments, hilarious in-game bloopers, and interactive comedy sketches.",
    catName: "09V",
    subName: "Prank & Fun",
    videoFile: "wildlife_nature_4k.mp4",
    thumbFile: "thumb_comedy_pranks.jpg",
  },
  {
    title: "Next-Gen 3D Animation & Visual Effects Showcase",
    description: "A showcase of cutting-edge CGI character animations, fluid dynamics, and visual storytelling.",
    catName: "36V",
    subName: "Creativity & Entertainment",
    videoFile: "cinematic_animation_story.mp4",
    thumbFile: "thumb_cinematic_aerial.jpg",
  },
  {
    title: "Olympic Sprint Training & Track Agility Drills",
    description: "Professional athletic training regimens focusing on explosive speed, stride frequency, and cardiovascular endurance.",
    catName: "63V",
    subName: "Sport & Fitness",
    videoFile: "wildlife_nature_4k.mp4",
    thumbFile: "thumb_sport_fitness.jpg",
  },
];

async function uploadFileViaApi(filePath, filename, mimeType) {
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: mimeType });
  const form = new FormData();
  form.append("file", blob, filename);

  const res = await fetch(`${BASE_URL}/api/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Upload failed for ${filename} with HTTP status ${res.status}`);
  }

  const json = await res.json();
  return json.url || json.secure_url;
}

async function main() {
  console.log("==================================================");
  console.log("🌐 LIVE WEB MEDIA DOWNLOAD & VIDEO MANIA CREATION");
  console.log("==================================================");

  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

  // 1. Download live web videos & thumbnails
  console.log("\n1. Searching and downloading live web videos & thumbnails...");
  for (const item of liveMediaToFetch) {
    const dest = path.join(scratchDir, item.filename);
    if (!fs.existsSync(dest) || fs.statSync(dest).size === 0) {
      console.log(`  ⬇ Downloading from live URL: ${item.url}`);
      const res = await fetch(item.url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) throw new Error(`Failed to fetch ${item.url} (${res.status})`);
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(dest, buf);
    }
    const stat = fs.statSync(dest);
    console.log(`  ✔ Verified [${item.type.toUpperCase()}]: ${item.filename} (${(stat.size / 1024).toFixed(1)} KB)`);
  }

  // 2. Clear old xpi_videos data
  console.log("\n2. Cleaning old video records from database...");
  await pool.query("DELETE FROM xpi_videos;");
  console.log("✔ Old video records removed.");

  // 3. Authenticate User
  console.log("\n3. Authenticating user umarwebdeveloper920@gmail.com...");
  const loginRes = await fetch(`${BASE_URL}/user/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "umarwebdeveloper920@gmail.com",
      password: "Mtechub@123",
    }),
  });

  const loginJson = await loginRes.json();
  if (!loginJson.user || !loginJson.user.token) {
    console.error("❌ Login failed:", loginJson);
    process.exit(1);
  }

  const token = loginJson.user.token;
  const userId = loginJson.user.id;
  console.log(`✔ Authenticated! User ID: ${userId}`);

  // 4. Upload downloaded live files via API
  console.log("\n4. Uploading downloaded media files to server via POST /api/upload...");
  const uploadedUrlMap = {};

  for (const item of liveMediaToFetch) {
    const filePath = path.join(scratchDir, item.filename);
    console.log(`  ⬆ Uploading ${item.filename}...`);
    const uploadedUrl = await uploadFileViaApi(filePath, item.filename, item.mime);
    console.log(`    ✔ Server URL: ${uploadedUrl}`);
    uploadedUrlMap[item.filename] = uploadedUrl;
  }

  // 5. Query Category & Subcategory IDs
  console.log("\n5. Fetching category mappings from database...");
  const catRows = (await pool.query("SELECT id, name FROM video_category")).rows;
  const subRows = (await pool.query("SELECT id, category_id, name FROM video_sub_category")).rows;

  const catMap = new Map();
  for (const c of catRows) {
    catMap.set(c.name.trim().toLowerCase(), c.id);
  }

  // 6. Create Video Mania posts via API
  console.log("\n6. Creating Video Mania entries via POST /xpi/createXpiVideo...");
  let createdCount = 0;

  for (const item of videoManiaEntries) {
    const catId = catMap.get(item.catName.toLowerCase()) || 1;
    const subObj = subRows.find(
      (s) => s.category_id === catId && s.name.trim().toLowerCase() === item.subName.toLowerCase()
    );
    const subId = subObj ? subObj.id : (subRows.find((s) => s.category_id === catId)?.id || 1);

    const videoUrl = uploadedUrlMap[item.videoFile];
    const thumbUrl = uploadedUrlMap[item.thumbFile];

    const payload = {
      name: item.title,
      description: item.description,
      video_category: catId,
      sub_category: subId,
      user_id: userId,
      video: videoUrl,
      thumbnail: thumbUrl,
    };

    const res = await fetch(`${BASE_URL}/xpi/createXpiVideo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.status === 200 || res.status === 201) {
      console.log(`  ✔ [ID: ${data.data.xpi_video_id}] "${item.title}"`);
      console.log(`    Category: ${item.catName} | Subcategory: ${item.subName}`);
      console.log(`    Video: ${videoUrl}`);
      console.log(`    Thumbnail: ${thumbUrl}\n`);
      createdCount++;
    } else {
      console.warn(`  ⚠ Failed to create "${item.title}":`, data);
    }
  }

  console.log("==================================================");
  console.log(`🎉 COMPLETED! ${createdCount} live web videos & thumbnails downloaded, uploaded, and created in Video Mania!`);
  console.log("==================================================");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
