import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import pkg from "pg";
const { Pool } = pkg;

dotenv.config();

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3801";
const scratchDir = "/Users/user6/.gemini/antigravity-ide/brain/72b27b92-c930-4c90-844c-3fefdb5573b7/scratch/real_live_media";

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "user6",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "watchagocha-db",
  port: Number(process.env.DB_PORT) || 5432,
});

// A comprehensive mix of Video Mania entries spanning across multiple categories & subcategories
const fullVideoMix = [
  // Pi V
  {
    title: "Golden Retriever Joyful Outdoor Fetch & Play",
    description: "Watch this energetic and playful golden retriever enjoying a sunny afternoon playing fetch in open green fields.",
    catName: "Pi V",
    subName: "Prank & Fun",
    videoFile: "dog_pet_play.mp4",
    thumbFile: "dog_pet_play.jpg",
  },
  {
    title: "African Wildlife Safari & Majestic Elephants",
    description: "An authentic safari experience following a herd of majestic African elephants walking peacefully across the savannah.",
    catName: "Pi V",
    subName: "Creativity & Entertainment",
    videoFile: "african_elephants.mp4",
    thumbFile: "african_elephants.jpg",
  },
  {
    title: "High-Intensity Calisthenics & Gym Training",
    description: "Professional strength conditioning, explosive pull-ups, and advanced bar gymnastics drills.",
    catName: "Pi V",
    subName: "Sport & Fitness",
    videoFile: "snow_horses_wild.mp4",
    thumbFile: "street_workout_gym.jpg",
  },

  // 09V
  {
    title: "Deep Sea Turtle Underwater Marine Exploration",
    description: "Immersive 4K underwater diving footage showing a graceful sea turtle gliding through tropical coral reef ecosystems.",
    catName: "09V",
    subName: "Creativity & Entertainment",
    videoFile: "sea_turtle_ocean.mp4",
    thumbFile: "sea_turtle_ocean.jpg",
  },
  {
    title: "Wild Horses Winter Sprint & High-Speed Endurance",
    description: "Powerful wild stallions galloping freely through snow-covered plains in a breathtaking display of strength and agility.",
    catName: "09V",
    subName: "Sport & Fitness",
    videoFile: "snow_horses_wild.mp4",
    thumbFile: "snow_horses_wild.jpg",
  },
  {
    title: "Hilarious Puppy Bloopers & Cute Animal Antics",
    description: "Funny and charming candid pet moments that will make you smile and laugh out loud.",
    catName: "09V",
    subName: "Prank & Fun",
    videoFile: "dog_pet_play.mp4",
    thumbFile: "candid_pet_comedy.jpg",
  },

  // 36V
  {
    title: "Cinematic Dragon Hunter Epic Adventure",
    description: "A dramatic visual quest following a fierce warrior on a winter journey across perilous mountain peaks.",
    catName: "36V",
    subName: "Creativity & Entertainment",
    videoFile: "cinematic_dragon_quest.mp4",
    thumbFile: "cinematic_dragon_quest.jpg",
  },
  {
    title: "Endurance Trail Running & Alpine Cross-Country",
    description: "Mountain trail runners conquering rocky elevations, ridges, and rugged wilderness pathways.",
    catName: "36V",
    subName: "Sport & Fitness",
    videoFile: "snow_horses_wild.mp4",
    thumbFile: "street_workout_gym.jpg",
  },

  // 63V
  {
    title: "Botanical Macro Time-lapse & Flower Blossoms",
    description: "Stunning high-definition botanical time-lapse revealing the intricate beauty of floral petals blooming in vivid colors.",
    catName: "63V",
    subName: "Creativity & Entertainment",
    videoFile: "nature_flower_bloom.mp4",
    thumbFile: "nature_flower_bloom.jpg",
  },
  {
    title: "Tropical Coral Reef Ecosystems & Exotic Fish",
    description: "Vibrant marine wildlife swimming through colorful Pacific coral gardens in crystal clear blue waters.",
    catName: "63V",
    subName: "Uncategorized",
    videoFile: "sea_turtle_ocean.mp4",
    thumbFile: "underwater_coral_reef.jpg",
  },

  // 90V
  {
    title: "Live Festival DJ Set & Dance Celebration",
    description: "Experience electrifying festival energy, vibrant stage lighting, and rhythmic beats bringing the crowd to life.",
    catName: "90V",
    subName: "Creativity & Entertainment",
    videoFile: "music_dance_friday.mp4",
    thumbFile: "music_dance_friday.jpg",
  },
  {
    title: "Electronic Neon Rave & Synth Dance Party",
    description: "Immersive festival atmosphere with laser lights, booming sub-bass, and euphoric dance crowds.",
    catName: "90V",
    subName: "Sport & Fitness",
    videoFile: "music_dance_friday.mp4",
    thumbFile: "electronic_party_beats.jpg",
  },

  // 126V
  {
    title: "Night Highway Traffic & Urban City Lights Timelapse",
    description: "Captivating long-exposure motion of vehicles and skyscrapers illuminating a bustling metropolitan skyline after dark.",
    catName: "126V",
    subName: "Uncategorized",
    videoFile: "urban_city_motion.mp4",
    thumbFile: "urban_city_motion.jpg",
  },
  {
    title: "Downtown Skyline Lights & Midnight Metropolis",
    description: "Aerial views over modern architecture, illuminated bridges, and the glowing urban city grid.",
    catName: "126V",
    subName: "Creativity & Entertainment",
    videoFile: "urban_city_motion.mp4",
    thumbFile: "night_skyline_timelapse.jpg",
  },

  // 180V
  {
    title: "Savannah Sunset Safari & Elephant Herd Migration",
    description: "Golden hour over the Serengeti as ancient elephant families travel toward watering holes.",
    catName: "180V",
    subName: "Creativity & Entertainment",
    videoFile: "african_elephants.mp4",
    thumbFile: "african_elephants.jpg",
  },
  {
    title: "Playful Golden Retriever Beach Running",
    description: "Splashing through ocean waves and catching frisbees along a sunny sandy shoreline.",
    catName: "180V",
    subName: "Prank & Fun",
    videoFile: "dog_pet_play.mp4",
    thumbFile: "dog_pet_play.jpg",
  },

  // 216V
  {
    title: "Glacier Mountain Expedition & High-Altitude Flight",
    description: "Panoramic cinematic journey over snow-capped mountain ranges and glacial valleys.",
    catName: "216V",
    subName: "Creativity & Entertainment",
    videoFile: "cinematic_dragon_quest.mp4",
    thumbFile: "cinematic_dragon_quest.jpg",
  },

  // 234V
  {
    title: "Spring Botanical Awakening & Blossom Time-lapse",
    description: "Ultra-detailed floral close-ups capturing the magic of spring blossoms opening in real time.",
    catName: "234V",
    subName: "Creativity & Entertainment",
    videoFile: "nature_flower_bloom.mp4",
    thumbFile: "nature_flower_bloom.jpg",
  },

  // 252V
  {
    title: "Midnight City Highway Speed & Light Streaks",
    description: "Fast-paced kinetic city visuals showcasing urban transport corridors and neon reflections.",
    catName: "252V",
    subName: "Uncategorized",
    videoFile: "urban_city_motion.mp4",
    thumbFile: "urban_city_motion.jpg",
  },

  // 306V
  {
    title: "Wild Mustangs Freedom Run Across Nordic Snow",
    description: "Witness the raw power and elegance of wild horses navigating snowy alpine forests.",
    catName: "306V",
    subName: "Sport & Fitness",
    videoFile: "snow_horses_wild.mp4",
    thumbFile: "snow_horses_wild.jpg",
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
  console.log("🚀 POPULATING FULL VIDEO MANIA CATEGORY MIX");
  console.log("==================================================");

  // 1. Authenticate as umarwebdeveloper920@gmail.com
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

  // 2. Upload media files via API
  console.log("\n2. Uploading distinct media files to server via POST /api/upload...");
  const uploadedMap = {};

  for (const item of fullVideoMix) {
    // Video
    if (!uploadedMap[item.videoFile]) {
      const vPath = path.join(scratchDir, item.videoFile);
      console.log(`  ⬆ Uploading Video: ${item.videoFile}...`);
      uploadedMap[item.videoFile] = await uploadFile(vPath, item.videoFile, "video/mp4");
      console.log(`    ✔ URL: ${uploadedMap[item.videoFile]}`);
    }

    // Thumbnail
    if (!uploadedMap[item.thumbFile]) {
      const tPath = path.join(scratchDir, item.thumbFile);
      console.log(`  ⬆ Uploading Thumbnail: ${item.thumbFile}...`);
      uploadedMap[item.thumbFile] = await uploadFile(tPath, item.thumbFile, "image/jpeg");
      console.log(`    ✔ URL: ${uploadedMap[item.thumbFile]}`);
    }
  }

  // 3. Match Category & Subcategory IDs from database
  console.log("\n3. Resolving category & subcategory database IDs...");
  const catRows = (await pool.query("SELECT id, name FROM video_category")).rows;
  const subRows = (await pool.query("SELECT id, category_id, name FROM video_sub_category")).rows;

  const catMap = new Map();
  for (const c of catRows) {
    catMap.set(c.name.trim().toLowerCase(), c.id);
  }

  // 4. Create Video Mania Posts via API
  console.log("\n4. Creating Video Mania entries via POST /xpi/createXpiVideo...");
  let count = 0;

  for (const item of fullVideoMix) {
    const catId = catMap.get(item.catName.toLowerCase()) || 1;
    const subObj = subRows.find(
      (s) => s.category_id === catId && s.name.trim().toLowerCase() === item.subName.toLowerCase()
    );
    const subId = subObj ? subObj.id : (subRows.find((s) => s.category_id === catId)?.id || 1);

    const videoUrl = uploadedMap[item.videoFile];
    const thumbUrl = uploadedMap[item.thumbFile];

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
      console.log(`      Category: ${item.catName} (ID: ${catId}) | Subcategory: ${item.subName} (ID: ${subId})`);
      console.log(`      Video: ${videoUrl}`);
      console.log(`      Thumbnail: ${thumbUrl}\n`);
      count++;
    } else {
      console.warn(`  ⚠ Failed to create "${item.title}":`, data);
    }
  }

  console.log("==================================================");
  console.log(`🎉 SUCCESS! Seeded ${count} real mixed Video Mania posts across all categories!`);
  console.log("==================================================");
  process.exit(0);
}

run().catch((e) => {
  console.error("❌ Fatal Error:", e);
  process.exit(1);
});
