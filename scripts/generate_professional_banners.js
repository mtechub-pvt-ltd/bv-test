import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import sharp from "sharp";
import pkg from "pg";
const { Pool } = pkg;

dotenv.config();

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3801";
const bannersDir = "/Users/user6/.gemini/antigravity-ide/brain/72b27b92-c930-4c90-844c-3fefdb5573b7/scratch/pro_banners";

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "user6",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "watchagocha-db",
  port: Number(process.env.DB_PORT) || 5432,
});

const bannerConfigs = [
  {
    module: "video_category",
    badge: "CREATOR STUDIO",
    title: "VIDEO MANIA ULTRA HD",
    subtitle: "Stream 4K Trending Short Clips & Creative Video Productions",
    cta: "WATCH TRENDING CLIPS",
    link: "https://wotchagotcha.com/video-mania",
    color1: "#7928CA",
    color2: "#FF0080",
    accent: "#00DFD8",
    price: 150
  },
  {
    module: "pic_category",
    badge: "FINE ART & TRAVEL",
    title: "PIC TOURS GLOBAL GALLERY",
    subtitle: "Explore Panoramic Landscapes, Urban Portraits & Scenic Captures",
    cta: "EXPLORE PHOTO TOURS",
    link: "https://wotchagotcha.com/pic-tours",
    color1: "#0070F3",
    color2: "#00DFD8",
    accent: "#7928CA",
    price: 120
  },
  {
    module: "news_category",
    badge: "24/7 GLOBAL DISPATCH",
    title: "ON-NEWS LIVE JOURNALISM",
    subtitle: "Real-Time Verified International Coverage, Business & World Affairs",
    cta: "READ BREAKING NEWS",
    link: "https://wotchagotcha.com/on-news",
    color1: "#D32F2F",
    color2: "#FF6F00",
    accent: "#FFD54F",
    price: 180
  },
  {
    module: "sports_category",
    badge: "ARENA & LEAGUES",
    title: "SPORT & SPORT CHAMPIONSHIP",
    subtitle: "Live Match Highlights, League Standings & Athletic Performances",
    cta: "WATCH MATCH HIGHLIGHTS",
    link: "https://wotchagotcha.com/sport-and-sport",
    color1: "#00C853",
    color2: "#0091EA",
    accent: "#FFD600",
    price: 160
  },
  {
    module: "disc_category",
    badge: "CIVIC DISCOURSE & ADVOCACY",
    title: "OPEN LETTERS PUBLIC FORUM",
    subtitle: "Signed Citizen Petitions, Policy Proposals & Global Community Voices",
    cta: "READ PUBLIC PETITIONS",
    link: "https://wotchagotcha.com/open-letters",
    color1: "#2E3192",
    color2: "#1BFFFF",
    accent: "#FF8008",
    price: 100
  },
  {
    module: "tv_progmax_category",
    badge: "GLOBAL SATELLITE NETWORK",
    title: "tvProgMax STREAMING NETWORK",
    subtitle: "Multilingual International Television Shows, News & Documentaries",
    cta: "STREAM BROADCASTS LIVE",
    link: "https://wotchagotcha.com/tv-progmax",
    color1: "#11998e",
    color2: "#38ef7d",
    accent: "#FF007F",
    price: 190
  },
  {
    module: "qafi_category",
    badge: "KNOWLEDGE & INQUIRY",
    title: "Q & A THOUGHT COMMUNITY",
    subtitle: "Ask Questions, Spark Intellectual Debates & Share Expert Solutions",
    cta: "JOIN THE DISCUSSION",
    link: "https://wotchagotcha.com/q-and-a",
    color1: "#8E2DE2",
    color2: "#4A00E0",
    accent: "#00F2FE",
    price: 110
  },
  {
    module: "learning_hobbies_category",
    badge: "MASTERCLASS ACADEMY",
    title: "LEARNING & HOBBIES",
    subtitle: "Accelerate Your Mastery with Industry Experts, Coding & Creative Arts",
    cta: "START LEARNING TODAY",
    link: "https://wotchagotcha.com/learning-and-hobbies",
    color1: "#F953C6",
    color2: "#B91D73",
    accent: "#FFF200",
    price: 140
  },
  {
    module: "kid_vids_category",
    badge: "FAMILY SAFE & FUN",
    title: "KID-VID ANIMATION PLANET",
    subtitle: "Joyful Animated Adventures, Sing-Alongs & Early Learning Crafts",
    cta: "PLAY KIDS VIDEOS",
    link: "https://wotchagotcha.com/kid-vids",
    color1: "#FF416C",
    color2: "#FF4B2B",
    accent: "#FFDF00",
    price: 130
  },
  {
    module: "fan_star_category",
    badge: "CELEBRITY & VIRAL FANDOM",
    title: "FAN-STAR ZONE RED CARPET",
    subtitle: "Exclusive VIP Moments, Backstage Clips & Fan Community Celebrations",
    cta: "DISCOVER FAN STORIES",
    link: "https://wotchagotcha.com/fan-star",
    color1: "#F12711",
    color2: "#F5AF19",
    accent: "#00F2FE",
    price: 175
  },
  {
    module: "cinematics_category",
    badge: "DIRECTOR'S CUT PREMIERE",
    title: "CINEMATIC WORLD REEL",
    subtitle: "Award-Winning Feature Trailers, Independent Films & Master Cinematography",
    cta: "STREAM PREMIERE FILMS",
    link: "https://wotchagotcha.com/cinematic",
    color1: "#141E30",
    color2: "#243B55",
    accent: "#E50914",
    price: 200
  },
  {
    module: "gebc_category",
    badge: "DIGITAL EXPRESSION",
    title: "EBIC BADGES & REACTION PACK",
    subtitle: "Vibrant Emotion Badges, Symbols & Community Interaction Stickers",
    cta: "COLLECT BADGES & STICKERS",
    link: "https://wotchagotcha.com/ebic",
    color1: "#0BA360",
    color2: "#3CBA92",
    accent: "#FFD600",
    price: 90
  },
  {
    module: "item_category",
    badge: "GLOBAL COMMERCE BAZAAR",
    title: "MONDO MARKETPLACE",
    subtitle: "Buy & Sell Verified Goods Worldwide: Tech, Fashion, Motors & Luxury",
    cta: "EXPLORE MARKETPLACE",
    link: "https://wotchagotcha.com/mondo-market",
    color1: "#FF8008",
    color2: "#FFC837",
    accent: "#1A2A6C",
    price: 220
  },
];

function escapeXml(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildBannerSvg(item) {
  const badge = escapeXml(item.badge);
  const title = escapeXml(item.title);
  const subtitle = escapeXml(item.subtitle);
  const cta = escapeXml(item.cta);

  return `<svg width="1600" height="450" viewBox="0 0 1600 450" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${item.color1}" />
      <stop offset="60%" stop-color="${item.color2}" />
      <stop offset="100%" stop-color="#0A0A0E" />
    </linearGradient>
    <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${item.accent}" stop-opacity="0.9" />
      <stop offset="100%" stop-color="${item.color2}" stop-opacity="0" />
    </linearGradient>
    <filter id="dropShadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000" flood-opacity="0.45" />
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="1600" height="450" fill="url(#bgGrad)" />

  <!-- Modern Geometric Decorative Elements -->
  <circle cx="1450" cy="50" r="320" fill="${item.accent}" opacity="0.12" />
  <circle cx="1500" cy="380" r="220" fill="#FFFFFF" opacity="0.06" />
  <polygon points="1200,0 1600,0 1600,450 1350,450" fill="#000000" opacity="0.25" />
  <line x1="1200" y1="0" x2="1350" y2="450" stroke="${item.accent}" stroke-width="2" opacity="0.4" />
  
  <!-- Subtle Grid lines -->
  <path d="M0 100 H1600 M0 200 H1600 M0 300 H1600 M0 400 H1600" stroke="#FFFFFF" stroke-width="1" opacity="0.04" />
  <path d="M200 0 V450 M400 0 V450 M600 0 V450 M800 0 V450 M1000 0 V450 M1200 0 V450 M1400 0 V450" stroke="#FFFFFF" stroke-width="1" opacity="0.04" />

  <!-- Top Badge / Pill -->
  <g transform="translate(100, 65)">
    <rect x="0" y="0" width="340" height="40" rx="20" fill="#000000" fill-opacity="0.4" stroke="${item.accent}" stroke-width="1.5" />
    <circle cx="22" cy="20" r="6" fill="${item.accent}" />
    <text x="38" y="26" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="14" font-weight="700" letter-spacing="2">${badge}</text>
  </g>

  <!-- Main Headline Title -->
  <text x="100" y="180" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="48" font-weight="900" letter-spacing="-1" filter="url(#dropShadow)">
    ${title}
  </text>

  <!-- Subtitle -->
  <text x="100" y="235" fill="#E2E8F0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="22" font-weight="400">
    ${subtitle}
  </text>

  <!-- Call to Action Button -->
  <g transform="translate(100, 295)" filter="url(#dropShadow)">
    <rect x="0" y="0" width="360" height="64" rx="32" fill="${item.accent}" />
    <text x="180" y="40" fill="#000000" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="17" font-weight="800" text-anchor="middle" letter-spacing="1">
      ${cta}  ➔
    </text>
  </g>

  <!-- Right Side Decorative Graphic Badge -->
  <g transform="translate(1180, 110)" filter="url(#dropShadow)">
    <rect x="0" y="0" width="320" height="230" rx="24" fill="#000000" fill-opacity="0.45" stroke="#FFFFFF" stroke-opacity="0.2" stroke-width="2" />
    <text x="160" y="60" fill="${item.accent}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="16" font-weight="800" text-anchor="middle" letter-spacing="2">OFFICIAL PROMOTION</text>
    <line x1="40" y1="85" x2="280" y2="85" stroke="#FFFFFF" stroke-opacity="0.2" stroke-width="1" />
    <text x="160" y="130" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="28" font-weight="800" text-anchor="middle">WOTCHA GOTCHA</text>
    <text x="160" y="165" fill="#94A3B8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="16" font-weight="500" text-anchor="middle">VERIFIED PARTNER</text>
    <rect x="60" y="185" width="200" height="28" rx="14" fill="#FFFFFF" fill-opacity="0.1" />
    <text x="160" y="204" fill="#E2E8F0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="13" font-weight="600" text-anchor="middle">100% EXCLUSIVE CONTENT</text>
  </g>
</svg>`;
}

async function uploadFileViaApi(filePath, filename) {
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: "image/png" });
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
  console.log("🎨 GENERATING PROFESSIONAL MARKETING BILLBOARD BANNERS");
  console.log("==================================================");

  if (!fs.existsSync(bannersDir)) fs.mkdirSync(bannersDir, { recursive: true });

  const userId = 2; // umarwebdeveloper920@gmail.com

  // 1. Wipe existing banner table
  await pool.query("TRUNCATE TABLE banner RESTART IDENTITY CASCADE;");

  let totalSeeded = 0;

  for (let i = 0; i < bannerConfigs.length; i++) {
    const item = bannerConfigs[i];
    const filename = `pro_banner_${item.module}.png`;
    const localPngPath = path.join(bannersDir, filename);

    const svgString = buildBannerSvg(item);
    await sharp(Buffer.from(svgString)).png().toFile(localPngPath);

    const uploadedUrl = await uploadFileViaApi(localPngPath, filename);

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
          TRUE, TRUE, $7, NOW(), NOW()
        )`,
        [uploadedUrl, item.link, item.module, catId, item.price, userId, `tx_pro_banner_${item.module}_${catId}`]
      );
      totalSeeded++;
    }

    console.log(`  ✔ [${item.module}] -> "${item.title}"`);
    console.log(`      Banner URL: ${uploadedUrl}`);
    console.log(`      Categories Seeded: ${catRows.length}\n`);
  }

  console.log("==================================================");
  console.log(`🎉 SUCCESS! Seeded ${totalSeeded} stunning professional marketing billboard banners across all modules!`);
  console.log("==================================================");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
