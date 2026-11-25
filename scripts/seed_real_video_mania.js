import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import pkg from "pg";
const { Pool } = pkg;

dotenv.config();

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3801";

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "user6",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "watchagocha-db",
  port: Number(process.env.DB_PORT) || 5432,
});

// Real video source files to verify and upload
const videoSources = [
  {
    path: "/Users/user6/Downloads/sidbarfrench_files/ebezofa2zp032cazbyp7.mp4",
    name: "ebezofa2zp032cazbyp7.mp4",
  },
  {
    path: "/Users/user6/Downloads/sidbarfrench_files/mxk5trhwex8yzeocdron.mp4",
    name: "mxk5trhwex8yzeocdron.mp4",
  },
  {
    path: "/Users/user6/Downloads/the_recent_video_you_generated.mp4",
    name: "the_recent_video_you_generated.mp4",
  },
  {
    path: "/Users/user6/Downloads/PiR0.mp4",
    name: "PiR0.mp4",
  },
];

// Real thumbnail source files to verify and upload
const thumbnailSources = [
  {
    path: "/Users/user6/Downloads/shows.jpg",
    name: "shows.jpg",
    mime: "image/jpeg",
  },
  {
    path: "/Users/user6/Downloads/valeriia-neganova-O3_0UW6WZ0E-unsplash.jpg",
    name: "valeriia-neganova.jpg",
    mime: "image/jpeg",
  },
  {
    path: "/Users/user6/Downloads/image.png",
    name: "image.png",
    mime: "image/png",
  },
  {
    path: "/Users/user6/Downloads/1000042732.jpg",
    name: "1000042732.jpg",
    mime: "image/jpeg",
  },
  {
    path: "/Users/user6/Downloads/image (7).png",
    name: "image7.png",
    mime: "image/png",
  },
];

// Video Mania video definitions with real titles & descriptions
const videoManiaEntries = [
  {
    title: "Urban Street Workout & Extreme Calisthenics",
    description: "Witness mind-blowing bodyweight feats, dynamic bar routines, and advanced calisthenics training in the heart of the city.",
    catName: "Pi V",
    subName: "Sport & Fitness",
    videoIdx: 0,
    thumbIdx: 0,
  },
  {
    title: "Creative Cinematic Drone Visuals & Aerial Landscapes",
    description: "An immersive journey through stunning coastlines, mountain ranges, and architectural masterpieces captured with 4K drone cinematography.",
    catName: "Pi V",
    subName: "Creativity & Entertainment",
    videoIdx: 1,
    thumbIdx: 1,
  },
  {
    title: "Hilarious Public Pranks & Comedy Reactions",
    description: "The funniest lighthearted social experiments and candid camera comedy moments that will brighten your day.",
    catName: "09V",
    subName: "Prank & Fun",
    videoIdx: 2,
    thumbIdx: 2,
  },
  {
    title: "High-Energy Extreme Mountain Biking Downhill Rush",
    description: "POV downhill freeride trail descent with steep drops, rock gardens, and high-speed jumps in rugged alpine terrain.",
    catName: "09V",
    subName: "Sport & Fitness",
    videoIdx: 3,
    thumbIdx: 3,
  },
  {
    title: "Digital Art Mastery & 3D Motion Graphics Showcase",
    description: "A showcase of cutting-edge visual effects, procedural motion graphics, and CGI concept art designed by leading creators.",
    catName: "36V",
    subName: "Creativity & Entertainment",
    videoIdx: 1,
    thumbIdx: 4,
  },
  {
    title: "Epic Football Freestyle & Street Tricks Compilation",
    description: "Unbelievable ball control, panna moves, and ground-breaking freestyle football combinations performed by pros.",
    catName: "63V",
    subName: "Sport & Fitness",
    videoIdx: 0,
    thumbIdx: 0,
  },
  {
    title: "Spontaneous Street Magic & Mind Illusion Pranks",
    description: "Mind-bending close-up magic tricks that leave spectators completely astonished and baffled.",
    catName: "90V",
    subName: "Prank & Fun",
    videoIdx: 2,
    thumbIdx: 2,
  },
  {
    title: "Cyberpunk City Nights & Synthwave Beats Animation",
    description: "Futuristic neon city vibes combined with retro-futuristic synthwave music and stylized animations.",
    catName: "126V",
    subName: "Creativity & Entertainment",
    videoIdx: 3,
    thumbIdx: 1,
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
    throw new Error(`Upload failed for ${filename} with status ${res.status}`);
  }

  const json = await res.json();
  return json.url || json.secure_url;
}

async function main() {
  console.log("==================================================");
  console.log("🎬 SEEDING REAL VIDEO MANIA DATA VIA API");
  console.log("==================================================");

  // 1. Authenticate user
  console.log("\n1. Authenticating as umarwebdeveloper920@gmail.com...");
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
  console.log(`✔ Authenticated successfully! User ID: ${userId}`);

  // 2. Verify all local media files first
  console.log("\n2. Verifying local video and image files exist and are valid...");
  for (const v of videoSources) {
    if (!fs.existsSync(v.path)) {
      console.error(`❌ Video file not found: ${v.path}`);
      process.exit(1);
    }
    const stat = fs.statSync(v.path);
    console.log(`  ✔ Video verified: ${v.name} (${(stat.size / (1024 * 1024)).toFixed(2)} MB)`);
  }

  for (const t of thumbnailSources) {
    if (!fs.existsSync(t.path)) {
      console.error(`❌ Thumbnail file not found: ${t.path}`);
      process.exit(1);
    }
    const stat = fs.statSync(t.path);
    console.log(`  ✔ Thumbnail verified: ${t.name} (${(stat.size / 1024).toFixed(1)} KB)`);
  }

  // 3. Upload verified videos via API
  console.log("\n3. Uploading real videos to server via POST /api/upload...");
  const uploadedVideos = [];
  for (const v of videoSources) {
    console.log(`  ⬆ Uploading ${v.name}...`);
    const url = await uploadFileViaApi(v.path, v.name, "video/mp4");
    console.log(`    ✔ Saved at: ${url}`);
    uploadedVideos.push(url);
  }

  // 4. Upload verified thumbnails via API
  console.log("\n4. Uploading real thumbnails to server via POST /api/upload...");
  const uploadedThumbnails = [];
  for (const t of thumbnailSources) {
    console.log(`  ⬆ Uploading ${t.name}...`);
    const url = await uploadFileViaApi(t.path, t.name, t.mime);
    console.log(`    ✔ Saved at: ${url}`);
    uploadedThumbnails.push(url);
  }

  // 5. Query Category & Subcategory IDs from database
  console.log("\n5. Matching category and subcategory database IDs...");
  const catRows = (await pool.query("SELECT id, name FROM video_category")).rows;
  const subRows = (await pool.query("SELECT id, category_id, name FROM video_sub_category")).rows;

  const catMap = new Map();
  for (const c of catRows) {
    catMap.set(c.name.trim().toLowerCase(), c.id);
  }

  // 6. Create Video Mania posts via API
  console.log("\n6. Creating Video Mania posts via POST /xpi/createXpiVideo...");
  let createdCount = 0;

  for (const item of videoManiaEntries) {
    const catId = catMap.get(item.catName.toLowerCase()) || 1;
    const subObj = subRows.find(
      (s) => s.category_id === catId && s.name.trim().toLowerCase() === item.subName.toLowerCase()
    );
    const subId = subObj ? subObj.id : (subRows.find((s) => s.category_id === catId)?.id || 1);

    const videoUrl = uploadedVideos[item.videoIdx % uploadedVideos.length];
    const thumbUrl = uploadedThumbnails[item.thumbIdx % uploadedThumbnails.length];

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
      console.log(`    Category: ${item.catName} (ID: ${catId}) | Subcategory: ${item.subName} (ID: ${subId})`);
      console.log(`    Video: ${videoUrl}`);
      console.log(`    Thumbnail: ${thumbUrl}\n`);
      createdCount++;
    } else {
      console.warn(`  ⚠ Failed to create "${item.title}":`, data);
    }
  }

  console.log("==================================================");
  console.log(`🎉 COMPLETED! Created ${createdCount} real Video Mania posts via API.`);
  console.log("==================================================");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
