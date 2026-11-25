import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import pkg from "pg";
const { Pool } = pkg;

dotenv.config();

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3801";
const scratchDir = "/Users/user6/.gemini/antigravity-ide/brain/72b27b92-c930-4c90-844c-3fefdb5573b7/scratch/topic_media";

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "user6",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "watchagocha-db",
  port: Number(process.env.DB_PORT) || 5432,
});

if (!fs.existsSync(scratchDir)) {
  fs.mkdirSync(scratchDir, { recursive: true });
}

// Curated high-resolution Unsplash photo direct CDN sources across distinct topics
const topicPhotos = {
  // News & Politics
  news_general: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&auto=format&fit=crop&q=80",
  politics: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1200&auto=format&fit=crop&q=80",
  business_finance: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=1200&auto=format&fit=crop&q=80",
  technology_ai: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80",
  art_museum: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1200&auto=format&fit=crop&q=80",
  culture_heritage: "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1200&auto=format&fit=crop&q=80",
  religion: "https://images.unsplash.com/photo-1543731068-7e0f5beff43a?w=1200&auto=format&fit=crop&q=80",
  lifestyle_coffee: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1200&auto=format&fit=crop&q=80",
  entertainment_cinema: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&auto=format&fit=crop&q=80",
  education_library: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=1200&auto=format&fit=crop&q=80",
  fitness_gym: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1200&auto=format&fit=crop&q=80",
  fashion_beauty: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&auto=format&fit=crop&q=80",
  productivity_desk: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&auto=format&fit=crop&q=80",
  books_reading: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=1200&auto=format&fit=crop&q=80",
  travel_tropical: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80",
  multimedia_audio: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1200&auto=format&fit=crop&q=80",

  // Sports
  football_soccer: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&auto=format&fit=crop&q=80",
  basketball: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&auto=format&fit=crop&q=80",
  tennis: "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=1200&auto=format&fit=crop&q=80",
  boxing_mma: "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=1200&auto=format&fit=crop&q=80",
  swimming: "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=1200&auto=format&fit=crop&q=80",
  surfing: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=1200&auto=format&fit=crop&q=80",
  car_racing: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=1200&auto=format&fit=crop&q=80",
  cycling: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=1200&auto=format&fit=crop&q=80",
  skateboarding: "https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?w=1200&auto=format&fit=crop&q=80",
  equestrian: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80",
  skiing_snow: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=1200&auto=format&fit=crop&q=80",
  track_field: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&auto=format&fit=crop&q=80",

  // Photography & Nature
  nature_forest: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&auto=format&fit=crop&q=80",
  wildlife_animals: "https://images.unsplash.com/photo-1564349683136-77e08dba1ef6?w=1200&auto=format&fit=crop&q=80",
  food_gourmet: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&auto=format&fit=crop&q=80",
  tools_vintage: "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=1200&auto=format&fit=crop&q=80",
  wedding_romance: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&auto=format&fit=crop&q=80",
  vehicles_cars: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&auto=format&fit=crop&q=80",

  // Cinema & Film
  cinema_noir: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1200&auto=format&fit=crop&q=80",
  cinema_action: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&auto=format&fit=crop&q=80",
  cinema_drama: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1200&auto=format&fit=crop&q=80",

  // Kids & Animation
  kids_play: "https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=1200&auto=format&fit=crop&q=80",
  kids_craft: "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=1200&auto=format&fit=crop&q=80",

  // Mondo Market Goods
  market_watch_luxury: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200&auto=format&fit=crop&q=80",
  market_tech_gadget: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&auto=format&fit=crop&q=80",
  market_coffee_art: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=1200&auto=format&fit=crop&q=80",
  market_leather_craft: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=1200&auto=format&fit=crop&q=80",
  market_perfume_luxury: "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=1200&auto=format&fit=crop&q=80",
};

async function downloadPhoto(url, filename) {
  const destPath = path.join(scratchDir, filename);
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1000) {
    return destPath;
  }
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(destPath, buf);
    return destPath;
  } catch (err) {
    console.log(`  ⚠ Fallback download for ${filename}`);
    // Use fallback high-res image
    const fallbackUrl = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80";
    const res = await fetch(fallbackUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(destPath, buf);
    return destPath;
  }
}

async function uploadFileViaApi(filePath, filename) {
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: "image/jpeg" });
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

async function main() {
  console.log("==================================================");
  console.log("🎨 SEEDING CATEGORY-SPECIFIC DISTINCT MEDIA POOL");
  console.log("==================================================");

  const client = await pool.connect();
  const uploadedUrls = {};

  try {
    console.log("1. Downloading and uploading topic-specific imagery...");
    for (const [topicKey, imgUrl] of Object.entries(topicPhotos)) {
      const filename = `topic_${topicKey}.jpg`;
      const localPath = await downloadPhoto(imgUrl, filename);
      const url = await uploadFileViaApi(localPath, filename);
      uploadedUrls[topicKey] = url;
      console.log(`  ✔ [${topicKey}] -> ${url}`);
    }

    // ----------------------------------------------------
    // ON-NEWS: Assign exact topic photos by Category Name
    // ----------------------------------------------------
    console.log("\n2. Updating On-News with topic-matched imagery...");
    const newsTopicMapping = {
      News: "news_general",
      Politics: "politics",
      Business: "business_finance",
      Art: "art_museum",
      "Tech & Innovation": "technology_ai",
      Culture: "culture_heritage",
      "Religion Trending": "religion",
      Lifestyle: "lifestyle_coffee",
      Entertainment: "entertainment_cinema",
      Education: "education_library",
      Sports: "football_soccer",
      Finance: "business_finance",
      "Fitness & Health": "fitness_gym",
      "Beauty & Fashion": "fashion_beauty",
      Productivity: "productivity_desk",
      Books: "books_reading",
      "Travel & Tourism": "travel_tropical",
      Multimedia: "multimedia_audio",
    };

    const newsCats = (await client.query("SELECT id, name FROM news_category ORDER BY id")).rows;
    for (const cat of newsCats) {
      const topicKey = newsTopicMapping[cat.name] || "news_general";
      const imgUrl = uploadedUrls[topicKey] || uploadedUrls.news_general;
      await client.query("UPDATE news SET image = $1 WHERE category = $2", [imgUrl, cat.id]);
      await client.query("UPDATE top_news SET image = $1 WHERE disc_category = $2", [imgUrl, cat.id]);
      console.log(`  ✔ On-News [${cat.name}] -> assigned "${topicKey}"`);
    }

    // ----------------------------------------------------
    // SPORT & SPORT: Assign exact sport photos by Category Name
    // ----------------------------------------------------
    console.log("\n3. Updating Sport & Sport with sport-matched imagery...");
    const sportTopicMapping = {
      Football: "football_soccer",
      Basketball: "basketball",
      Hockey: "swimming",
      Volleyball: "tennis",
      Tennis: "tennis",
      Boxing: "boxing_mma",
      Wrestling: "boxing_mma",
      Judo: "boxing_mma",
      Karate: "boxing_mma",
      Swimming: "swimming",
      Snowboarding: "skiing_snow",
      Surfing: "surfing",
      "Car Racing": "car_racing",
      "Road Cycling": "cycling",
      Equestrian: "equestrian",
      Skiing: "skiing_snow",
      "Ice Hockey": "swimming",
      "Motorcycle Racing": "car_racing",
      "Track & Field": "track_field",
      Skateboarding: "skateboarding",
    };

    const sportCats = (await client.query("SELECT id, name FROM sports_category ORDER BY id")).rows;
    for (const cat of sportCats) {
      const topicKey = sportTopicMapping[cat.name] || "football_soccer";
      const imgUrl = uploadedUrls[topicKey] || uploadedUrls.football_soccer;
      await client.query("UPDATE sports SET image = $1 WHERE category_id = $2", [imgUrl, cat.id]);
      console.log(`  ✔ Sport & Sport [${cat.name}] -> assigned "${topicKey}"`);
    }

    // ----------------------------------------------------
    // PIC TOURS: Assign exact photography photos by Category Name
    // ----------------------------------------------------
    console.log("\n4. Updating Pic Tours with photography-matched imagery...");
    const picTopicMapping = {
      Funny: "kids_play",
      People: "culture_heritage",
      Creativity: "art_museum",
      Vehicles: "vehicles_cars",
      "Tools & Devices": "tools_vintage",
      Wedding: "wedding_romance",
      Exotic: "travel_tropical",
      Entertainment: "entertainment_cinema",
      Celebrities: "fashion_beauty",
      Animals: "wildlife_animals",
      Technologies: "technology_ai",
      Memories: "lifestyle_coffee",
      "Beauty & Fashion": "fashion_beauty",
      Art: "art_museum",
      "Tavel & Tourism": "travel_tropical",
      Nature: "nature_forest",
      Science: "technology_ai",
      Food: "food_gourmet",
      Sports: "track_field",
    };

    const picCats = (await client.query("SELECT id, name FROM pic_category ORDER BY id")).rows;
    for (const cat of picCats) {
      const topicKey = picTopicMapping[cat.name] || "nature_forest";
      const imgUrl = uploadedUrls[topicKey] || uploadedUrls.nature_forest;
      await client.query("UPDATE pic_tours SET image = $1 WHERE pic_category = $2", [imgUrl, cat.id]);
      await client.query("UPDATE top_tours SET image = $1 WHERE pic_category = $2", [imgUrl, cat.id]);
      console.log(`  ✔ Pic Tours [${cat.name}] -> assigned "${topicKey}"`);
    }

    // ----------------------------------------------------
    // MONDO MARKET: Assign exact regional goods photos
    // ----------------------------------------------------
    console.log("\n5. Updating Mondo Market with regional goods imagery...");
    const marketTopicMapping = {
      Europe: "market_watch_luxury",
      Africa: "market_coffee_art",
      Americas: "market_tech_gadget",
      Asia: "market_tech_gadget",
      "Middle-East": "market_perfume_luxury",
    };

    const marketCats = (await client.query("SELECT id, name FROM item_category ORDER BY id")).rows;
    for (const cat of marketCats) {
      const topicKey = marketTopicMapping[cat.name] || "market_watch_luxury";
      const imgUrl = uploadedUrls[topicKey] || uploadedUrls.market_watch_luxury;
      const items = (await client.query("SELECT id FROM item WHERE item_category = $1", [cat.id])).rows;
      for (const it of items) {
        await client.query("UPDATE item_images SET image = $1 WHERE item_id = $2", [imgUrl, it.id]);
      }
      console.log(`  ✔ Mondo Market [${cat.name}] -> assigned "${topicKey}"`);
    }

    // ----------------------------------------------------
    // CINEMATIC: Assign genre-specific movie thumbnails
    // ----------------------------------------------------
    console.log("\n6. Updating Cinematic with genre-specific cinema imagery...");
    const cineTopicMapping = {
      Detectives: "cinema_noir",
      Comedy: "entertainment_cinema",
      Thrillers: "cinema_noir",
      Crime: "cinema_noir",
      Romantic: "wedding_romance",
      Action: "cinema_action",
      Drama: "cinema_drama",
      Hooror: "cinema_noir",
      War: "cinema_action",
      Classic: "cinema_drama",
    };

    const cineCats = (await client.query("SELECT id, name FROM cinematics_category ORDER BY id")).rows;
    for (const cat of cineCats) {
      const topicKey = cineTopicMapping[cat.name] || "cinema_action";
      const imgUrl = uploadedUrls[topicKey] || uploadedUrls.cinema_action;
      await client.query("UPDATE cinematics_videos SET thumbnail = $1 WHERE category_id = $2", [imgUrl, cat.id]);
      console.log(`  ✔ Cinematic [${cat.name}] -> assigned "${topicKey}"`);
    }

    // ----------------------------------------------------
    // OPEN LETTERS: Assign civic topic-specific letter images
    // ----------------------------------------------------
    console.log("\n7. Updating Open Letters with civic topic imagery...");
    const letterTopicMapping = {
      Politics: "politics",
      Gouvernance: "politics",
      "Business & Finance": "business_finance",
      Education: "education_library",
      "War & Security": "cinema_action",
      "Science & Innovation": "technology_ai",
      "Art & Culture": "art_museum",
      "Beauty & Fashion": "fashion_beauty",
      "Infrastructure Development": "tools_vintage",
      Multimedia: "multimedia_audio",
      Entertainment: "entertainment_cinema",
      Showbiz: "entertainment_cinema",
      "Social Welfare": "culture_heritage",
      "Project Management": "productivity_desk",
      "Women Empowment": "culture_heritage",
      "Fitness & Health": "fitness_gym",
      Religion: "religion",
      Energy: "technology_ai",
      Water: "travel_tropical",
      Culture: "culture_heritage",
      Immigration: "travel_tropical",
    };

    const letterCats = (await client.query("SELECT id, name FROM disc_category ORDER BY id")).rows;
    for (const cat of letterCats) {
      const topicKey = letterTopicMapping[cat.name] || "politics";
      const imgUrl = uploadedUrls[topicKey] || uploadedUrls.politics;
      const letters = (await client.query("SELECT id FROM post_letters WHERE disc_category = $1", [cat.id])).rows;
      for (const l of letters) {
        await client.query("UPDATE post_letters_images SET image = $1 WHERE letter_id = $2", [imgUrl, l.id]);
      }
      console.log(`  ✔ Open Letters [${cat.name}] -> assigned "${topicKey}"`);
    }

    // ----------------------------------------------------
    // Q & A: Assign discussion inquiry topic images
    // ----------------------------------------------------
    console.log("\n8. Updating Q & A with topic imagery...");
    const qafiCats = (await client.query("SELECT id, name FROM qafi_category ORDER BY id")).rows;
    for (const cat of qafiCats) {
      const topicKey = newsTopicMapping[cat.name] || "news_general";
      const imgUrl = uploadedUrls[topicKey] || uploadedUrls.news_general;
      await client.query("UPDATE qafi SET image = $1 WHERE category = $2", [imgUrl, cat.id]);
      console.log(`  ✔ Q & A [${cat.name}] -> assigned "${topicKey}"`);
    }

    // ----------------------------------------------------
    // LEARNING & HOBBIES: Assign masterclass topic imagery
    // ----------------------------------------------------
    console.log("\n9. Updating Learning & Hobbies with academy topic imagery...");
    const learnTopicMapping = {
      Art: "art_museum",
      "Science & Tech": "technology_ai",
      Maths: "technology_ai",
      Business: "business_finance",
      Health: "fitness_gym",
      "Social Studies": "culture_heritage",
      Humanities: "books_reading",
      "Religion Languages": "religion",
      Langues: "education_library",
    };

    const learnCats = (await client.query("SELECT id, name FROM learning_hobbies_category ORDER BY id")).rows;
    for (const cat of learnCats) {
      const topicKey = learnTopicMapping[cat.name] || "education_library";
      const imgUrl = uploadedUrls[topicKey] || uploadedUrls.education_library;
      await client.query("UPDATE learning_hobbies_videos SET thumbnail = $1 WHERE category_id = $2", [imgUrl, cat.id]);
      console.log(`  ✔ Learning & Hobbies [${cat.name}] -> assigned "${topicKey}"`);
    }

    // ----------------------------------------------------
    // KID-VID: Assign children's creative topic imagery
    // ----------------------------------------------------
    console.log("\n10. Updating Kid-Vid with kids animation topic imagery...");
    const kidTopicMapping = {
      "Art & Craft": "kids_craft",
      "Toys & Play": "kids_play",
      "Learning & Hobbies": "kids_play",
      "Show &": "entertainment_cinema",
      Cartoon: "kids_craft",
      "Music & Dance": "multimedia_audio",
      Gaming: "technology_ai",
    };

    const kidCats = (await client.query("SELECT id, name FROM kid_vids_category ORDER BY id")).rows;
    for (const cat of kidCats) {
      const topicKey = kidTopicMapping[cat.name] || "kids_play";
      const imgUrl = uploadedUrls[topicKey] || uploadedUrls.kids_play;
      await client.query("UPDATE kid_vids_videos SET thumbnail = $1 WHERE category_id = $2", [imgUrl, cat.id]);
      console.log(`  ✔ Kid-Vid [${cat.name}] -> assigned "${topicKey}"`);
    }

    console.log("\n==================================================");
    console.log("🎉 ALL MODULES SUCCESSFULLY UPDATED WITH DISTINCT CATEGORY-SPECIFIC MEDIA!");
    console.log("==================================================");
  } finally {
    client.release();
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
