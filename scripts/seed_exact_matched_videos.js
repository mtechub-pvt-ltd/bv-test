import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import pkg from "pg";
const { Pool } = pkg;

dotenv.config();

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3801";
const scratchDir = "/Users/user6/.gemini/antigravity-ide/brain/72b27b92-c930-4c90-844c-3fefdb5573b7/scratch";
const mediaDir = path.join(scratchDir, "real_live_media");
const thumbDir = path.join(scratchDir, "exact_video_thumbs");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "user6",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "watchagocha-db",
  port: Number(process.env.DB_PORT) || 5432,
});

// Define 5 distinct video items specifically tailored to cover ALL 4 subcategories:
// 1. Prank & Fun
// 2. Sport & Fitness
// 3. Creativity & Entertainment
// 4. Uncategorized
// 5. Creativity & Entertainment (2nd feature)
const subcategoryTemplates = [
  {
    targetSubcategory: "Prank & Fun",
    titlePrefix: "Playful Golden Retriever Running & Outdoor Catch",
    description: "High-energy candid footage of a golden retriever playing with a red ball in the open grass.",
    videoPath: path.join(mediaDir, "dog_pet_play.mp4"),
    videoFilename: "golden_retriever_play.mp4",
    thumbPath: path.join(mediaDir, "dog_pet_play.jpg"),
    thumbFilename: "thumb_golden_retriever.jpg",
  },
  {
    targetSubcategory: "Sport & Fitness",
    titlePrefix: "Wild Horses Galloping Across Winter Snow",
    description: "Powerful wild stallions sprinting freely across snow-covered plains in high definition.",
    videoPath: path.join(mediaDir, "snow_horses_wild.mp4"),
    videoFilename: "wild_horses_snow_sprint.mp4",
    thumbPath: path.join(thumbDir, "snow_horses_wild.mp4.png"),
    thumbFilename: "thumb_wild_horses.png",
  },
  {
    targetSubcategory: "Creativity & Entertainment",
    titlePrefix: "African Wildlife Safari & Majestic Elephants",
    description: "Authentic 4K wildlife documentary footage of African elephants walking through the savannah.",
    videoPath: path.join(mediaDir, "african_elephants.mp4"),
    videoFilename: "african_elephants_safari.mp4",
    thumbPath: path.join(mediaDir, "african_elephants.jpg"),
    thumbFilename: "thumb_african_elephants.jpg",
  },
  {
    targetSubcategory: "Uncategorized",
    titlePrefix: "Night Metropolitan City Traffic & Skyline",
    description: "Captivating long-exposure motion of vehicles speeding along highways under glowing skyscraper lights.",
    videoPath: path.join(mediaDir, "urban_city_motion.mp4"),
    videoFilename: "city_night_traffic.mp4",
    thumbPath: path.join(mediaDir, "night_skyline_timelapse.jpg"),
    thumbFilename: "thumb_city_traffic.jpg",
  },
  {
    targetSubcategory: "Creativity & Entertainment",
    titlePrefix: "Deep Sea Turtle Coral Reef Underwater Dive",
    description: "Real underwater marine cinematography following a sea turtle swimming over vibrant coral reefs.",
    videoPath: path.join(mediaDir, "sea_turtle_ocean.mp4"),
    videoFilename: "sea_turtle_coral_dive.mp4",
    thumbPath: path.join(thumbDir, "sea_turtle_ocean.mp4.png"),
    thumbFilename: "thumb_sea_turtle.png",
  },
];

async function uploadFile(filePath, filename) {
  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(filename).toLowerCase();
  const mimeType = ext === ".mp4" ? "video/mp4" : ext === ".png" ? "image/png" : "image/jpeg";
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
  console.log("🌟 SEEDING WITH GUARANTEED 'UNCATEGORIZED' AND ALL SUBCATEGORIES");
  console.log("==================================================");

  // 1. Truncate table xpi_videos
  await pool.query("TRUNCATE TABLE xpi_videos RESTART IDENTITY CASCADE;");
  console.log("✔ Truncated xpi_videos table.");

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

  // 4. Upload the 5 media pairs
  console.log("\n2. Uploading media files...");
  const uploadedMap = [];

  for (const item of subcategoryTemplates) {
    console.log(`  ⬆ Uploading Video [${item.videoFilename}]...`);
    const videoUrl = await uploadFile(item.videoPath, item.videoFilename);
    console.log(`  ⬆ Uploading Thumbnail [${item.thumbFilename}]...`);
    const thumbUrl = await uploadFile(item.thumbPath, item.thumbFilename);

    uploadedMap.push({
      ...item,
      videoUrl,
      thumbUrl,
    });
  }

  // 5. Fetch all Video Mania categories and subcategories
  console.log("\n3. Fetching categories and subcategories...");
  const catRows = (await pool.query("SELECT id, name FROM video_category ORDER BY id")).rows;
  const subRows = (await pool.query("SELECT id, category_id, name FROM video_sub_category")).rows;

  console.log(`Found ${catRows.length} categories.`);

  // 6. Insert 5 videos for each category guaranteeing all 4 subcategories
  console.log("\n4. Publishing videos for each category with ALL subcategories (including Uncategorized)...");
  let count = 0;

  for (const cat of catRows) {
    const catId = cat.id;
    const catName = cat.name;

    console.log(`\n  ▶ Processing Category [${catName}] (ID: ${catId})...`);

    for (const item of uploadedMap) {
      const subObj = subRows.find(
        (s) => s.category_id === catId && s.name.trim().toLowerCase() === item.targetSubcategory.toLowerCase()
      );
      if (!subObj) {
        console.warn(`    ⚠ Subcategory ${item.targetSubcategory} not found for category ${catName}`);
      }
      const subId = subObj ? subObj.id : (subRows.find((s) => s.category_id === catId)?.id || 1);

      const title = `${item.titlePrefix} [${catName}]`;

      const payload = {
        name: title,
        description: item.description,
        video_category: catId,
        sub_category: subId,
        user_id: userId,
        video: item.videoUrl,
        thumbnail: item.thumbUrl,
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
        console.log(`    ✔ [ID: ${data.data.xpi_video_id}] "${title}" -> [${item.targetSubcategory}]`);
        count++;
      } else {
        console.warn(`    ⚠ Error:`, data);
      }
    }
  }

  console.log("\n==================================================");
  console.log(`🎉 SUCCESS! Published ${count} videos. Every category now has all 4 subcategories including 'Uncategorized'!`);
  console.log("==================================================");
  process.exit(0);
}

run().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});
