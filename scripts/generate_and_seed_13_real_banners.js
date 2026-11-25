import fs from "fs";
import path from "path";
import sharp from "sharp";
import pool from "../db.config/index.js";
import { clearAllCache } from "../utils/cacheService.js";

const LIVE_BASE_URL = "https://wocha-gocha.testing.mtechub.org";
const SCRATCH_DIR = "./scripts/data/real_module_banners";

if (!fs.existsSync(SCRATCH_DIR)) {
  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
}

const MODULE_BANNERS = [
  {
    module: "video_category",
    bgUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&h=450&q=80",
    badge: "CREATIVE SPOTLIGHT",
    title: "TRENDING SHORT CLIPS &amp; STORIES",
    subtitle: "Stream 4K Trending Short Films, Creative Visuals &amp; Independent Stories",
    cta: "WATCH CLIPS NOW",
    color1: "#FF007A",
    color2: "#7928CA",
    accent: "#00DFD8",
    rightTitle: "CREATIVE STUDIO",
    rightSub: "Ultra HD Short Clips",
    rightTag: "100% FREE STREAM",
  },
  {
    module: "pic_category",
    bgUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&h=450&q=80",
    badge: "FINE ART &amp; TRAVEL",
    title: "GLOBAL PHOTO EXPEDITIONS",
    subtitle: "Explore Breathtaking Landscapes, Urban Culture &amp; World Heritage",
    cta: "EXPLORE PHOTO TOURS",
    color1: "#0070F3",
    color2: "#00DFD8",
    accent: "#7928CA",
    rightTitle: "NATURE &amp; TRAVEL",
    rightSub: "High-Res Photography",
    rightTag: "EXPLORE GALLERIES",
  },
  {
    module: "news_category",
    bgUrl: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&h=450&q=80",
    badge: "24/7 LIVE COVERAGE",
    title: "WORLD NEWS &amp; VERIFIED INSIGHTS",
    subtitle: "Real-Time International Dispatches, Market Updates &amp; Deep Reports",
    cta: "READ BREAKING NEWS",
    color1: "#D32F2F",
    color2: "#FF6F00",
    accent: "#FFD54F",
    rightTitle: "GLOBAL DISPATCH",
    rightSub: "Real-Time Journalism",
    rightTag: "VERIFIED REPORTS",
  },
  {
    module: "sports_category",
    bgUrl: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&h=450&q=80",
    badge: "CHAMPIONSHIP LEAGUE",
    title: "ATHLETIC ACTION &amp; HIGHLIGHTS",
    subtitle: "Live Match Scores, Tournament Standings &amp; Legendary Moments",
    cta: "WATCH HIGHLIGHTS",
    color1: "#00C853",
    color2: "#0091EA",
    accent: "#FFD600",
    rightTitle: "ARENA LEAGUES",
    rightSub: "Match Highlights",
    rightTag: "GLOBAL COMPETITION",
  },
  {
    module: "disc_category",
    bgUrl: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&h=450&q=80",
    badge: "PUBLIC DISCOURSE",
    title: "CITIZEN VOICES &amp; OPEN PETITIONS",
    subtitle: "Sign Public Letters, Champion Causes &amp; Share Ideas with the World",
    cta: "READ OPEN LETTERS",
    color1: "#2E3192",
    color2: "#1BFFFF",
    accent: "#FF8008",
    rightTitle: "CIVIC FORUM",
    rightSub: "Global Petitions",
    rightTag: "COMMUNITY VOICES",
  },
  {
    module: "tv_progmax_category",
    bgUrl: "https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=1200&h=450&q=80",
    badge: "SATELLITE &amp; CABLE NETWORK",
    title: "INTERNATIONAL TV BROADCASTS",
    subtitle: "Multilingual Television Series, News Programs &amp; Documentaries",
    cta: "STREAM TV BROADCASTS",
    color1: "#11998E",
    color2: "#38EF7D",
    accent: "#FF007F",
    rightTitle: "GLOBAL NETWORK",
    rightSub: "Satellite Broadcasts",
    rightTag: "24/7 STREAMING",
  },
  {
    module: "qafi_category",
    bgUrl: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&h=450&q=80",
    badge: "THOUGHT &amp; INQUIRY",
    title: "KNOWLEDGE EXCHANGE &amp; ANSWERS",
    subtitle: "Ask Inquisitive Questions, Share Wisdom &amp; Solve Common Mysteries",
    cta: "JOIN CONVERSATIONS",
    color1: "#8E2DE2",
    color2: "#4A00E0",
    accent: "#00F2FE",
    rightTitle: "THINKING COMMUNITY",
    rightSub: "Expert Solutions",
    rightTag: "OPEN DIALOGUE",
  },
  {
    module: "learning_hobbies_category",
    bgUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&h=450&q=80",
    badge: "MASTERCLASS ACADEMY",
    title: "CREATIVE WORKSHOPS &amp; HOBBIES",
    subtitle: "Skill Up with Step-by-Step Courses, Coding Tutorials &amp; Arts",
    cta: "START LEARNING NOW",
    color1: "#F953C6",
    color2: "#B91D73",
    accent: "#FFF200",
    rightTitle: "SKILL LABS",
    rightSub: "Video Masterclasses",
    rightTag: "CREATIVE GROWTH",
  },
  {
    module: "kid_vids_category",
    bgUrl: "https://images.unsplash.com/photo-1566140967404-b8b3932483f5?auto=format&fit=crop&w=1200&h=450&q=80",
    badge: "FAMILY SAFE &amp; FUN",
    title: "ANIMATION &amp; ADVENTURE PLANET",
    subtitle: "Joyful Animated Stories, Sing-Alongs &amp; Early Childhood Discovery",
    cta: "PLAY KIDS VIDEOS",
    color1: "#FF416C",
    color2: "#FF4B2B",
    accent: "#FFDF00",
    rightTitle: "KIDS PLANET",
    rightSub: "Safe &amp; Fun Cartoons",
    rightTag: "HAPPY LEARNING",
  },
  {
    module: "fan_star_category",
    bgUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&h=450&q=80",
    badge: "CELEBRITY &amp; VIRAL FANDOM",
    title: "RED CARPET &amp; FAN CELEBRATIONS",
    subtitle: "Catch Iconic VIP Moments, Fan Creations &amp; Viral Celebrity Feats",
    cta: "DISCOVER FAN STORIES",
    color1: "#F12711",
    color2: "#F5AF19",
    accent: "#00F2FE",
    rightTitle: "VIP SPOTLIGHT",
    rightSub: "Red Carpet Moments",
    rightTag: "FAN COMMUNITY",
  },
  {
    module: "cinematics_category",
    bgUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&h=450&q=80",
    badge: "DIRECTOR'S CUT",
    title: "PREMIERE CINEMA &amp; INDIE FILMS",
    subtitle: "Award-Winning Feature Trailers, Independent Films &amp; Masterpieces",
    cta: "STREAM PREMIERE FILMS",
    color1: "#141E30",
    color2: "#243B55",
    accent: "#E50914",
    rightTitle: "CINEMA GUILD",
    rightSub: "Feature Premieres",
    rightTag: "ORIGINAL FILMS",
  },
  {
    module: "gebc_category",
    bgUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&h=450&q=80",
    badge: "DIGITAL EXPRESSIONS",
    title: "EMOTION BADGES &amp; STICKER PACKS",
    subtitle: "Collect Colorful Reaction Badges, Stickers &amp; Community Tokens",
    cta: "COLLECT BADGES",
    color1: "#0BA360",
    color2: "#3CBA92",
    accent: "#FFD600",
    rightTitle: "EBIC REACTIONS",
    rightSub: "Collectible Badges",
    rightTag: "COMMUNITY TOKENS",
  },
  {
    module: "item_category",
    bgUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&h=450&q=80",
    badge: "GLOBAL COMMERCE BAZAAR",
    title: "CURATED MARKETPLACE &amp; PRODUCTS",
    subtitle: "Buy &amp; Sell Verified Goods Worldwide: Tech, Fashion, Design &amp; Luxury",
    cta: "EXPLORE MARKETPLACE",
    color1: "#FF8008",
    color2: "#FFC837",
    accent: "#1A2A6C",
    rightTitle: "MONDO BAZAAR",
    rightSub: "Curated Products",
    rightTag: "GLOBAL COMMERCE",
  },
];

async function generateBannerImage(item) {
  const width = 1600;
  const height = 450;

  let bgBuffer;
  try {
    const res = await fetch(item.bgUrl, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      bgBuffer = Buffer.from(await res.arrayBuffer());
    }
  } catch (e) {
    console.warn(`Failed fetching background for ${item.module}, using solid fallback:`, e.message);
  }

  const svgOverlay = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="overlayGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#08090E" stop-opacity="0.97" />
        <stop offset="42%" stop-color="#08090E" stop-opacity="0.88" />
        <stop offset="70%" stop-color="#08090E" stop-opacity="0.45" />
        <stop offset="100%" stop-color="#08090E" stop-opacity="0.15" />
      </linearGradient>
      <linearGradient id="btnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${item.color1}" />
        <stop offset="100%" stop-color="${item.color2}" />
      </linearGradient>
      <filter id="shadow">
        <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#000" flood-opacity="0.6" />
      </filter>
    </defs>

    <!-- Gradient covering left side -->
    <rect width="${width}" height="${height}" fill="url(#overlayGrad)" />

    <!-- Subtle accent glow top-left -->
    <circle cx="80" cy="50" r="220" fill="${item.accent}" opacity="0.12" />

    <!-- Top Badge -->
    <g transform="translate(80, 55)">
      <rect x="0" y="0" width="250" height="36" rx="18" fill="${item.color1}" fill-opacity="0.25" stroke="${item.accent}" stroke-width="1.5" />
      <circle cx="18" cy="18" r="5" fill="${item.accent}" />
      <text x="34" y="23" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="13" font-weight="800" letter-spacing="1.5">${item.badge}</text>
    </g>

    <!-- Main Headline -->
    <text x="80" y="160" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="44" font-weight="900" letter-spacing="-0.5" filter="url(#shadow)">
      ${item.title}
    </text>

    <!-- Subtitle -->
    <text x="80" y="210" fill="#CBD5E1" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="20" font-weight="400">
      ${item.subtitle}
    </text>

    <!-- CTA Button -->
    <g transform="translate(80, 260)" filter="url(#shadow)">
      <rect x="0" y="0" width="290" height="56" rx="28" fill="url(#btnGrad)" />
      <text x="145" y="35" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="16" font-weight="800" text-anchor="middle" letter-spacing="0.5">
        ${item.cta}  ➔
      </text>
    </g>

    <!-- Right Side Commercial Card -->
    <g transform="translate(1220, 95)" filter="url(#shadow)">
      <rect x="0" y="0" width="290" height="240" rx="20" fill="#0A0E1A" fill-opacity="0.75" stroke="#FFFFFF" stroke-opacity="0.18" stroke-width="1.5" />
      <text x="145" y="55" fill="${item.accent}" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="14" font-weight="800" text-anchor="middle" letter-spacing="2">OFFICIAL PROMOTION</text>
      <line x1="30" y1="80" x2="260" y2="80" stroke="#FFFFFF" stroke-opacity="0.15" stroke-width="1" />
      <text x="145" y="125" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="25" font-weight="800" text-anchor="middle">${item.rightTitle}</text>
      <text x="145" y="160" fill="#94A3B8" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="15" font-weight="500" text-anchor="middle">${item.rightSub}</text>
      <rect x="45" y="182" width="200" height="28" rx="14" fill="#FFFFFF" fill-opacity="0.12" />
      <text x="145" y="201" fill="#E2E8F0" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="12" font-weight="700" text-anchor="middle">${item.rightTag}</text>
    </g>
  </svg>`;

  let pipeline;
  if (bgBuffer) {
    pipeline = sharp(bgBuffer).resize(width, height, { fit: "cover", position: "right" });
  } else {
    pipeline = sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 15, g: 20, b: 35 },
      },
    });
  }

  const finalJpg = await pipeline
    .composite([{ input: Buffer.from(svgOverlay), blend: "over" }])
    .jpeg({ quality: 90 })
    .toBuffer();

  const filePath = path.join(SCRATCH_DIR, `banner_${item.module}.jpg`);
  fs.writeFileSync(filePath, finalJpg);
  return filePath;
}

async function uploadBanner(filePath, filename) {
  const buf = fs.readFileSync(filePath);
  const blob = new Blob([buf], { type: "image/jpeg" });
  const form = new FormData();
  form.append("file", blob, filename);

  const res = await fetch(`${LIVE_BASE_URL}/api/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Upload failed for ${filename} with status ${res.status}`);
  }

  const data = await res.json();
  const url = data.url || data.secure_url || (data.urls && data.urls[0]);
  return url.replace(/^http:\/\//, "https://");
}

async function main() {
  console.log("==========================================================");
  console.log("🎨 GENERATING & SEEDING 13 REAL GENERAL MODULE BANNERS");
  console.log("==========================================================");

  // 1. Generate and upload all 13 banners
  console.log("\n1. Generating and uploading 13 authentic commercial banners...");
  const uploadedBanners = [];

  for (const item of MODULE_BANNERS) {
    console.log(`  Processing ${item.module}...`);
    const filePath = await generateBannerImage(item);
    const uploadedUrl = await uploadBanner(filePath, `pro_banner_${item.module}.jpg`);
    console.log(`    ✔ Uploaded: ${uploadedUrl}`);

    uploadedBanners.push({
      module: item.module,
      imageUrl: uploadedUrl,
      title: item.title.replace(/&amp;/g, "&"),
    });
  }

  // 2. Clear old banner table
  console.log("\n2. Resetting banner table...");
  const delRes = await pool.query("DELETE FROM banner");
  console.log(`  Deleted ${delRes.rowCount} previous banner records.`);

  // 3. Insert exactly 1 banner per module
  console.log("\n3. Inserting 1 clean active banner per module (13 total)...");
  for (const b of uploadedBanners) {
    await pool.query(
      `INSERT INTO banner (
        image,
        user_id,
        banner_link,
        category_table,
        category_id,
        price,
        startdate,
        enddate,
        status,
        top_banner,
        paid_status,
        created_at,
        updated_at,
        transaction_id
      ) VALUES (
        $1,
        2,
        NULL,
        $2,
        NULL,
        '100',
        '2026-01-01',
        '2030-12-31',
        'active',
        true,
        true,
        NOW(),
        NOW(),
        $3
      )`,
      [b.imageUrl, b.module, `tx_pro_banner_${b.module}`]
    );
    console.log(`    ✔ Inserted 1 banner for [${b.module}]`);
  }

  // 4. Invalidate all caches
  console.log("\n4. Purging application caches...");
  try {
    await clearAllCache();
    console.log("  ✔ Cache purged successfully!");
  } catch (err) {
    console.warn("  Cache purge notice:", err.message);
  }

  // 5. Verify database counts
  console.log("\n==========================================================");
  console.log("📊 DATABASE & API VERIFICATION");
  console.log("==========================================================");

  const totalRes = await pool.query("SELECT COUNT(*)::int as count FROM banner");
  const activeRes = await pool.query("SELECT COUNT(*)::int as count FROM banner WHERE status = 'active'");
  const byModule = (await pool.query("SELECT category_table, COUNT(*)::int as count FROM banner GROUP BY category_table ORDER BY category_table")).rows;

  console.log(`Total banners in DB: ${totalRes.rows[0].count}`);
  console.log(`Active banners in DB: ${activeRes.rows[0].count}`);
  console.log("Banners per module table:", byModule);

  // 6. Test live getByModule endpoint for all 13 modules
  console.log("\nTesting live API /banner/getByModule for all 13 modules:");
  for (const item of MODULE_BANNERS) {
    try {
      const res = await fetch(`${LIVE_BASE_URL}/banner/getByModule?module=${item.module}`);
      const data = await res.json();
      const count = data.totalBanners ?? (data.banners?.length || 0);
      const img = data.banners?.[0]?.image || "none";
      console.log(`  [${item.module}]: HTTP ${res.status} | count = ${count} | image = ${img}`);
    } catch (e) {
      console.warn(`  [${item.module}] API error:`, e.message);
    }
  }

  console.log("\n🎉 ALL 13 MODULE BANNERS SUCCESSFULLY CONFIGURED!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
