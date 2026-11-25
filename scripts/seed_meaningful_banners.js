import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import pkg from "pg";
const { Pool } = pkg;

dotenv.config();

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3801";
const scratchDir = "/Users/user6/.gemini/antigravity-ide/brain/72b27b92-c930-4c90-844c-3fefdb5573b7/scratch/meaningful_banners";

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "user6",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "watchagocha-db",
  port: Number(process.env.DB_PORT) || 5432,
});

// Curated high-resolution landscape banners tailored for each module
const bannerDefinitions = [
  {
    module: "video_category",
    name: "Video Mania Ultra HD Creators Hub",
    imageUrl: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=1600&h=500&fit=crop&q=85",
    link: "https://wotchagotcha.com/video-mania",
    price: 150,
    topBanner: true,
  },
  {
    module: "pic_category",
    name: "Pic Tours Global Photography Expedition",
    imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1600&h=500&fit=crop&q=85",
    link: "https://wotchagotcha.com/pic-tours",
    price: 120,
    topBanner: true,
  },
  {
    module: "news_category",
    name: "On-News 24/7 International Journalism & Real-Time Dispatches",
    imageUrl: "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1600&h=500&fit=crop&q=85",
    link: "https://wotchagotcha.com/on-news",
    price: 180,
    topBanner: true,
  },
  {
    module: "sports_category",
    name: "Sport & Sport Championship League: Live Scores & Arena Highlights",
    imageUrl: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1600&h=500&fit=crop&q=85",
    link: "https://wotchagotcha.com/sport-and-sport",
    price: 160,
    topBanner: true,
  },
  {
    module: "disc_category",
    name: "Open Letters Civic Forum: Public Petitions, Speeches & Democracy",
    imageUrl: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=1600&h=500&fit=crop&q=85",
    link: "https://wotchagotcha.com/open-letters",
    price: 100,
    topBanner: true,
  },
  {
    module: "tv_progmax_category",
    name: "tvProgMax International Satellite TV & Multilingual Broadcast Stream",
    imageUrl: "https://images.unsplash.com/photo-1593784991095-a205069470b6?w=1600&h=500&fit=crop&q=85",
    link: "https://wotchagotcha.com/tv-progmax",
    price: 190,
    topBanner: true,
  },
  {
    module: "qafi_category",
    name: "Q & A Thought Leadership & Global Inquiry Community",
    imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1600&h=500&fit=crop&q=85",
    link: "https://wotchagotcha.com/q-and-a",
    price: 110,
    topBanner: true,
  },
  {
    module: "learning_hobbies_category",
    name: "Learning & Hobbies Masterclass Academy: Skill Up with Industry Leaders",
    imageUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1600&h=500&fit=crop&q=85",
    link: "https://wotchagotcha.com/learning-and-hobbies",
    price: 140,
    topBanner: true,
  },
  {
    module: "kid_vids_category",
    name: "Kid-Vid Wonderful World of Animation, Learning & Play",
    imageUrl: "https://images.unsplash.com/photo-1566140967404-b8b3932483f5?w=1600&h=500&fit=crop&q=85",
    link: "https://wotchagotcha.com/kid-vids",
    price: 130,
    topBanner: true,
  },
  {
    module: "fan_star_category",
    name: "Fan-Star Zone Red Carpet & Superstars Community Festival",
    imageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1600&h=500&fit=crop&q=85",
    link: "https://wotchagotcha.com/fan-star",
    price: 175,
    topBanner: true,
  },
  {
    module: "cinematics_category",
    name: "Cinematic World Premieres: Directors Cut & Festival Screenings",
    imageUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&h=500&fit=crop&q=85",
    link: "https://wotchagotcha.com/cinematic",
    price: 200,
    topBanner: true,
  },
  {
    module: "gebc_category",
    name: "EBIC Expressive Symbols, Badges & Creative Reactions",
    imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1600&h=500&fit=crop&q=85",
    link: "https://wotchagotcha.com/ebic",
    price: 90,
    topBanner: true,
  },
  {
    module: "item_category",
    name: "Mondo Market Global Merchant Bazaar: Buy & Sell Verified Goods Worldwide",
    imageUrl: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1600&h=500&fit=crop&q=85",
    link: "https://wotchagotcha.com/mondo-market",
    price: 220,
    topBanner: true,
  },
];

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

async function downloadPhoto(url, filename) {
  const localPath = path.join(scratchDir, filename);
  if (!fs.existsSync(localPath) || fs.statSync(localPath).size === 0) {
    console.log(`  ⬇ Downloading banner: ${filename}...`);
    let imgBuf;
    try {
      const imgRes = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (imgRes.ok) imgBuf = Buffer.from(await imgRes.arrayBuffer());
    } catch (e) {}

    if (!imgBuf || imgBuf.length === 0) {
      const fallbackUrl = `https://picsum.photos/seed/${encodeURIComponent(filename)}/1600/500`;
      const fbRes = await fetch(fallbackUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
      imgBuf = Buffer.from(await fbRes.arrayBuffer());
    }
    fs.writeFileSync(localPath, imgBuf);
  }
  return localPath;
}

async function main() {
  console.log("==================================================");
  console.log("🎨 SEEDING MEANINGFUL & VISUALLY STUNNING BANNERS FOR ALL MODULES");
  console.log("==================================================");

  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

  const userId = 2; // umarwebdeveloper920@gmail.com

  // 1. Seed Banner Configuration
  console.log("\n1. Seeding banner_configuration...");
  await pool.query("TRUNCATE TABLE banner_configuration RESTART IDENTITY CASCADE;");
  await pool.query(`
    INSERT INTO banner_configuration (description, length, width, cost, top_banner_cost, created_at, updated_at)
    VALUES ('Standard Premium Responsive Billboard Banner (1600x500)', 1600, 500, 50, 100, NOW(), NOW()),
           ('Subcategory Targeted Display Banner (1200x400)', 1200, 400, 35, 70, NOW(), NOW())
  `);
  console.log("✔ banner_configuration seeded successfully.");

  // 2. Wipe existing banner table
  console.log("\n2. Wiping old banner table...");
  await pool.query("TRUNCATE TABLE banner RESTART IDENTITY CASCADE;");

  // 3. Seed Promotional Banners for each module
  console.log("\n3. Uploading and seeding banners across all 13 modules...");
  let seededCount = 0;

  for (let i = 0; i < bannerDefinitions.length; i++) {
    const item = bannerDefinitions[i];
    const filename = `banner_${item.module}.jpg`;
    const localPath = await downloadPhoto(item.imageUrl, filename);
    const uploadedUrl = await uploadFileViaApi(localPath, filename);

    // Fetch all categories for this module's table
    const catTable = item.module === "video_category" ? "video_category" : item.module;
    const catRows = (await pool.query(`SELECT id FROM ${catTable} ORDER BY id`)).rows;

    for (let c = 0; c < catRows.length; c++) {
      const catId = catRows[c].id;
      await pool.query(
        `INSERT INTO banner (
          image, banner_link, category_table, category_id,
          price, startdate, enddate, status, user_id,
          paid_status, top_banner, transaction_id, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, '2026-01-01', '2030-12-31', 'active', $6,
          TRUE, $7, $8, NOW(), NOW()
        )`,
        [uploadedUrl, item.link, item.module, catId, item.price, userId, item.topBanner, `tx_promo_${item.module}_${catId}`]
      );
      seededCount++;
    }

    console.log(`  ✔ [${item.module}] -> "${item.name}" (Seeded across ${catRows.length} categories)`);
    console.log(`      Image: ${uploadedUrl}`);
    console.log(`      Link: ${item.link}\n`);
  }

  console.log("==================================================");
  console.log(`🎉 SUCCESS! Seeded ${seededCount} meaningful promotional banners across all 13 modules!`);
  console.log("==================================================");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
