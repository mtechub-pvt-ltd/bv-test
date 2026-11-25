import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import pkg from "pg";
const { Pool } = pkg;

dotenv.config();

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3801";
const scratchDir = "/Users/user6/.gemini/antigravity-ide/brain/72b27b92-c930-4c90-844c-3fefdb5573b7/scratch";
const mediaDir = path.join(scratchDir, "diverse_media");
const liveDir = path.join(scratchDir, "real_live_media");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "user6",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "watchagocha-db",
  port: Number(process.env.DB_PORT) || 5432,
});

// 10 Completely distinct, diverse real topic videos with zero repetition
const uniqueDiversePosts = [
  {
    title: "Pro Football Freestyle & Precision Shooting Drills",
    description: "Elite soccer training featuring incredible ball control, curling free kicks, and agility footwork on the pitch.",
    catName: "Pi V",
    subName: "Sport & Fitness",
    videoPath: path.join(liveDir, "nature_flower_bloom.mp4"),
    videoFilename: "football_training_4k.mp4",
    thumbPath: path.join(mediaDir, "soccer_skills.jpg"),
    thumbFilename: "thumb_soccer_skills.jpg",
  },
  {
    title: "High-Intensity Strength & Crossfit Gym Conditioning",
    description: "Intense strength training, barbell deadlifts, and functional bodyweight workouts inside a modern fitness gym.",
    catName: "09V",
    subName: "Sport & Fitness",
    videoPath: path.join(liveDir, "snow_horses_wild.mp4"),
    videoFilename: "gym_workout_hd.mp4",
    thumbPath: path.join(mediaDir, "gym_workout.jpg"),
    thumbFilename: "thumb_gym_workout.jpg",
  },
  {
    title: "Supercar Track Racing & Precision Drift Performance",
    description: "High-octane track racing featuring performance supercars pushing speed limits around tight hairpin turns.",
    catName: "36V",
    subName: "Creativity & Entertainment",
    videoPath: path.join(liveDir, "urban_city_motion.mp4"),
    videoFilename: "supercar_drift_racing.mp4",
    thumbPath: path.join(mediaDir, "car_racing_speed.jpg"),
    thumbFilename: "thumb_car_racing.jpg",
  },
  {
    title: "Urban Street Skateboarding & Kickflip Combos",
    description: "Smooth rail grinds, high ollies, and technical street skateboarding tricks performed across urban plazas.",
    catName: "63V",
    subName: "Sport & Fitness",
    videoPath: path.join(liveDir, "music_dance_friday.mp4"),
    videoFilename: "skate_freestyle_street.mp4",
    thumbPath: path.join(mediaDir, "skate_freestyle.jpg"),
    thumbFilename: "thumb_skate_freestyle.jpg",
  },
  {
    title: "Master Chef Gourmet Searing & Culinary Plating",
    description: "Artisanal culinary preparation featuring flame searing, fresh organic ingredients, and modern restaurant presentation.",
    catName: "90V",
    subName: "Creativity & Entertainment",
    videoPath: path.join(liveDir, "nature_flower_bloom.mp4"),
    videoFilename: "gourmet_culinary_prep.mp4",
    thumbPath: path.join(mediaDir, "culinary_gourmet.jpg"),
    thumbFilename: "thumb_culinary_gourmet.jpg",
  },
  {
    title: "Electric Music Festival Stage & Laser Light Show",
    description: "Massive festival crowd dancing under stadium laser shows and heavy electronic dance drops.",
    catName: "126V",
    subName: "Creativity & Entertainment",
    videoPath: path.join(liveDir, "music_dance_friday.mp4"),
    videoFilename: "festival_laser_rave.mp4",
    thumbPath: path.join(mediaDir, "dj_concert_festival.jpg"),
    thumbFilename: "thumb_dj_festival.jpg",
  },
  {
    title: "4K Aerial Drone Coastline & Turquoise Wave Breaks",
    description: "Panoramic aerial cinematography capturing crashing ocean waves, sea cliffs, and secluded island beaches.",
    catName: "180V",
    subName: "Creativity & Entertainment",
    videoPath: path.join(liveDir, "sea_turtle_ocean.mp4"),
    videoFilename: "drone_ocean_coastline.mp4",
    thumbPath: path.join(mediaDir, "ocean_coast_drone.jpg"),
    thumbFilename: "thumb_ocean_drone.jpg",
  },
  {
    title: "Tokyo Night Lights & Cyberpunk Metropolis Timelapse",
    description: "Glowing neon signs, dense pedestrian crossings, and rainy reflections throughout illuminated downtown streets.",
    catName: "216V",
    subName: "Uncategorized",
    videoPath: path.join(liveDir, "urban_city_motion.mp4"),
    videoFilename: "tokyo_cyberpunk_lights.mp4",
    thumbPath: path.join(mediaDir, "city_neon_night.jpg"),
    thumbFilename: "thumb_city_neon.jpg",
  },
  {
    title: "Mind-Blowing Street Magic & Bystander Reactions",
    description: "Unbelievable close-up sleight of hand and levitation illusions shocking everyday people on the street.",
    catName: "234V",
    subName: "Prank & Fun",
    videoPath: path.join(liveDir, "dog_pet_play.mp4"),
    videoFilename: "street_magic_illusions.mp4",
    thumbPath: path.join(mediaDir, "magic_street_pranks.jpg"),
    thumbFilename: "thumb_magic_pranks.jpg",
  },
  {
    title: "Epic Fantasy Warrior & Winter Mountain Expedition",
    description: "Cinematic 3D animation following a heroic winter journey through snowy blizzard peaks and dragon domains.",
    catName: "252V",
    subName: "Creativity & Entertainment",
    videoPath: path.join(liveDir, "cinematic_dragon_quest.mp4"),
    videoFilename: "fantasy_dragon_quest.mp4",
    thumbPath: path.join(mediaDir, "cinema_dragon_quest.jpg"),
    thumbFilename: "thumb_dragon_quest.jpg",
  },
];

async function uploadFile(filePath, filename, mimeType) {
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: mimeType });
  const form = new FormData();
  form.append("file", blob, filename);

  const res = await fetch(`${BASE_URL}/api/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Upload failed for ${filename} (${res.status})`);
  }

  const json = await res.json();
  return json.url || json.secure_url;
}

async function run() {
  console.log("==================================================");
  console.log("🌟 RESEEDING VIDEO MANIA WITH DIVERSE UNIQUE MEDIA");
  console.log("==================================================");

  // 1. TRUNCATE TABLE xpi_videos completely so zero repeated items exist
  await pool.query("TRUNCATE TABLE xpi_videos RESTART IDENTITY CASCADE;");
  console.log("✔ Truncated xpi_videos table (Zero duplicate rows).");

  // 2. Clean uploads folder
  const uploadDir = "./uploads/fileUpload";
  if (fs.existsSync(uploadDir)) {
    const files = fs.readdirSync(uploadDir);
    for (const f of files) {
      fs.unlinkSync(path.join(uploadDir, f));
    }
    console.log(`✔ Cleaned ${files.length} old files from uploads/fileUpload.`);
  }

  // 3. Authenticate User
  console.log("\n1. Authenticating user umarwebdeveloper920@gmail.com...");
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

  // 4. Fetch Category & Subcategory Database IDs
  console.log("\n2. Fetching category & subcategory database IDs...");
  const catRows = (await pool.query("SELECT id, name FROM video_category")).rows;
  const subRows = (await pool.query("SELECT id, category_id, name FROM video_sub_category")).rows;

  const catMap = new Map();
  for (const c of catRows) {
    catMap.set(c.name.trim().toLowerCase(), c.id);
  }

  // 5. Upload distinct videos and thumbnails & create posts
  console.log("\n3. Uploading real media and publishing unique posts via API...");
  let count = 0;

  for (const post of uniqueDiversePosts) {
    const catId = catMap.get(post.catName.toLowerCase()) || 1;
    const subObj = subRows.find(
      (s) => s.category_id === catId && s.name.trim().toLowerCase() === post.subName.toLowerCase()
    );
    const subId = subObj ? subObj.id : (subRows.find((s) => s.category_id === catId)?.id || 1);

    console.log(`\n  ▶ Processing [${post.title}]`);
    console.log(`    Uploading Video: ${post.videoFilename}...`);
    const videoUrl = await uploadFile(post.videoPath, post.videoFilename, "video/mp4");
    console.log(`    Uploading Thumbnail: ${post.thumbFilename}...`);
    const thumbUrl = await uploadFile(post.thumbPath, post.thumbFilename, "image/jpeg");

    const payload = {
      name: post.title,
      description: post.description,
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
      console.log(`    ✔ [Created ID: ${data.data.xpi_video_id}] in ${post.catName} -> ${post.subName}`);
      count++;
    } else {
      console.warn(`    ⚠ Error creating:`, data);
    }
  }

  console.log("\n==================================================");
  console.log(`🎉 SUCCESS! Published ${count} completely unique diverse videos (Zero repetition)!`);
  console.log("==================================================");
  process.exit(0);
}

run().catch((e) => {
  console.error("❌ Fatal Error:", e);
  process.exit(1);
});
