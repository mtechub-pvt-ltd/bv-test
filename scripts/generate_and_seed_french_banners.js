import fs from "fs";
import path from "path";
import sharp from "sharp";
import pool from "../db.config/index.js";
import { clearAllCache } from "../utils/cacheService.js";

const LIVE_BASE_URL = "https://wocha-gocha.testing.mtechub.org";
const SCRATCH_DIR = "./scripts/data/real_module_banners_fr";

if (!fs.existsSync(SCRATCH_DIR)) {
  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
}

const FRENCH_MODULE_BANNERS = [
  {
    module: "video_category",
    bgUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&h=450&q=80",
    badge: "PROJECTEUR CRÉATIF",
    title: "CLIPS COURTS ET HISTOIRES TENDANCES",
    subtitle: "Diffusez des courts-métrages 4K, des visuels artistiques et des récits originaux",
    cta: "VOIR LES CLIPS",
    color1: "#FF007A",
    color2: "#7928CA",
    accent: "#00DFD8",
    rightTitle: "STUDIO CRÉATIF",
    rightSub: "Clips Courts Ultra HD",
    rightTag: "STREAMING 100% GRATUIT",
  },
  {
    module: "pic_category",
    bgUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&h=450&q=80",
    badge: "BEAUX-ARTS &amp; VOYAGES",
    title: "EXPÉDITIONS PHOTOGRAPHIQUES MONDIALES",
    subtitle: "Explorez des paysages grandioses, la culture urbaine et les merveilles du monde",
    cta: "EXPLORER LES CIRCUITS",
    color1: "#0070F3",
    color2: "#00DFD8",
    accent: "#7928CA",
    rightTitle: "NATURE &amp; VOYAGE",
    rightSub: "Photographie Haute Définition",
    rightTag: "EXPLORER LES GALERIES",
  },
  {
    module: "news_category",
    bgUrl: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&h=450&q=80",
    badge: "COUVERTURE EN DIRECT 24/7",
    title: "ACTUALITÉS MONDIALES &amp; ANALYSES",
    subtitle: "Dépêches internationales en temps réel, marchés financiers et reportages exclusifs",
    cta: "LIRE LES ACTUALITÉS",
    color1: "#D32F2F",
    color2: "#FF6F00",
    accent: "#FFD54F",
    rightTitle: "DÉPÊCHES MONDIALES",
    rightSub: "Journalisme en Direct",
    rightTag: "RAPPORTS VÉRIFIÉS",
  },
  {
    module: "sports_category",
    bgUrl: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&h=450&q=80",
    badge: "LIGUE DES CHAMPIONS",
    title: "ACTIONS SPORTIVES &amp; TEMPS FORTS",
    subtitle: "Résultats en direct, classements des tournois et moments sportifs légendaires",
    cta: "VOIR LES TEMPS FORTS",
    color1: "#00C853",
    color2: "#0091EA",
    accent: "#FFD600",
    rightTitle: "LIGUES MONDIALES",
    rightSub: "Résumés de Matchs",
    rightTag: "COMPÉTITION MONDIALE",
  },
  {
    module: "disc_category",
    bgUrl: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&h=450&q=80",
    badge: "DÉBAT PUBLIC",
    title: "VOIX CITOYENNES &amp; PÉTITIONS OUVERTES",
    subtitle: "Signez des lettres ouvertes, défendez des causes et partagez vos idées citoyennes",
    cta: "LIRE LES LETTRES",
    color1: "#2E3192",
    color2: "#1BFFFF",
    accent: "#FF8008",
    rightTitle: "FORUM CITOYEN",
    rightSub: "Pétitions Mondiales",
    rightTag: "VOIX DU MONDE",
  },
  {
    module: "tv_progmax_category",
    bgUrl: "https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=1200&h=450&q=80",
    badge: "RÉSEAU SATELLITE &amp; CÂBLE",
    title: "ÉMISSIONS TÉLÉVISÉES INTERNATIONALES",
    subtitle: "Séries télévisées mondiales, journaux d'information et documentaires captivants",
    cta: "DIFFUSER EN DIRECT",
    color1: "#11998E",
    color2: "#38EF7D",
    accent: "#FF007F",
    rightTitle: "RÉSEAU MONDIAL",
    rightSub: "Diffusions Satellites",
    rightTag: "DIFFUSION 24/7",
  },
  {
    module: "qafi_category",
    bgUrl: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&h=450&q=80",
    badge: "RÉFLEXION &amp; QUESTIONNEMENT",
    title: "ÉCHANGE DE SAVOIR &amp; RÉPONSES",
    subtitle: "Posez des questions perspicaces, partagez votre sagesse et éclairez les débats",
    cta: "REJOINDRE LE DIALOGUE",
    color1: "#8E2DE2",
    color2: "#4A00E0",
    accent: "#00F2FE",
    rightTitle: "COMMUNAUTÉ DU SAVOIR",
    rightSub: "Solutions d'Experts",
    rightTag: "DIALOGUE OUVERT",
  },
  {
    module: "learning_hobbies_category",
    bgUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&h=450&q=80",
    badge: "ACADÉMIE MASTERCLASS",
    title: "ATELIERS CRÉATIFS &amp; PASSIONS",
    subtitle: "Développez vos talents grâce à des cours pratiques, programmation et artisanat",
    cta: "COMMENCER À APPRENDRE",
    color1: "#F953C6",
    color2: "#B91D73",
    accent: "#FFF200",
    rightTitle: "LABORATOIRE CRÉATIF",
    rightSub: "Masterclasses Vidéo",
    rightTag: "APPRENTISSAGE CONTINU",
  },
  {
    module: "kid_vids_category",
    bgUrl: "https://images.unsplash.com/photo-1566140967404-b8b3932483f5?auto=format&fit=crop&w=1200&h=450&q=80",
    badge: "SÉCURISÉ POUR ENFANTS &amp; FAMILLE",
    title: "PLANÈTE ANIMATION &amp; DÉCOUVERTE",
    subtitle: "Dessins animés joyeux, chansons d'éveil et aventures magiques pour les tout-petits",
    cta: "REGARDER EN FAMILLE",
    color1: "#FF416C",
    color2: "#FF4B2B",
    accent: "#FFDF00",
    rightTitle: "UNIVERS ENFANTS",
    rightSub: "Dessins Animés Sûrs",
    rightTag: "ÉVEIL JOYEUX",
  },
  {
    module: "fan_star_category",
    bgUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&h=450&q=80",
    badge: "UNIVERS DES STARS &amp; FANS",
    title: "TAPIS ROUGE &amp; ÉVÉNEMENTS VIP",
    subtitle: "Les plus grands moments des célébrités, créations de fans et coulisses exclusives",
    cta: "DÉCOUVRIR LES STARS",
    color1: "#F12711",
    color2: "#F5AF19",
    accent: "#00F2FE",
    rightTitle: "PROJECTEUR VIP",
    rightSub: "Moments Tapis Rouge",
    rightTag: "UNIVERS DES FANS",
  },
  {
    module: "cinematics_category",
    bgUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&h=450&q=80",
    badge: "SÉLECTION DU RÉALISATEUR",
    title: "CINÉMA PREMIÈRE &amp; FILMS D'AUTEUR",
    subtitle: "Bandes-annonces primées, œuvres indépendantes et chefs-d'œuvre du 7e art",
    cta: "VOIR LES FILMS",
    color1: "#141E30",
    color2: "#243B55",
    accent: "#E50914",
    rightTitle: "GUILDE DU CINÉMA",
    rightSub: "Premières Exclusives",
    rightTag: "FILMS ORIGINAUX",
  },
  {
    module: "gebc_category",
    bgUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&h=450&q=80",
    badge: "EXPRESSIONS NUMÉRIQUES",
    title: "BADGES D'ÉMOTION &amp; AUTOCOLLANTS",
    subtitle: "Collectionnez des emblèmes de réaction uniques, stickers et badges communautaires",
    cta: "COLLECTIONNER LES BADGES",
    color1: "#0BA360",
    color2: "#3CBA92",
    accent: "#FFD600",
    rightTitle: "RÉACTIONS EBIC",
    rightSub: "Badges de Collection",
    rightTag: "EMBLÈMES COMMUNAUTAIRES",
  },
  {
    module: "item_category",
    bgUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&h=450&q=80",
    badge: "MARCHÉ MONDIAL AUTHENTIQUE",
    title: "BOUTIQUE EN LIGNE &amp; PRODUITS RARES",
    subtitle: "Achetez et vendez des produits certifiés : High-tech, Mode, Déco et Créations",
    cta: "EXPLORER LE MARCHÉ",
    color1: "#FF8008",
    color2: "#FFC837",
    accent: "#1A2A6C",
    rightTitle: "BAZAR MONDO",
    rightSub: "Produits Sélectionnés",
    rightTag: "COMMERCE MONDIAL",
  },
];

async function generateFrenchBannerImage(item) {
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
      <rect x="0" y="0" width="280" height="36" rx="18" fill="${item.color1}" fill-opacity="0.25" stroke="${item.accent}" stroke-width="1.5" />
      <circle cx="18" cy="18" r="5" fill="${item.accent}" />
      <text x="34" y="23" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="13" font-weight="800" letter-spacing="1.5">${item.badge}</text>
    </g>

    <!-- Main Headline -->
    <text x="80" y="160" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="42" font-weight="900" letter-spacing="-0.5" filter="url(#shadow)">
      ${item.title}
    </text>

    <!-- Subtitle -->
    <text x="80" y="210" fill="#CBD5E1" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="20" font-weight="400">
      ${item.subtitle}
    </text>

    <!-- CTA Button -->
    <g transform="translate(80, 260)" filter="url(#shadow)">
      <rect x="0" y="0" width="310" height="56" rx="28" fill="url(#btnGrad)" />
      <text x="155" y="35" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="16" font-weight="800" text-anchor="middle" letter-spacing="0.5">
        ${item.cta}  ➔
      </text>
    </g>

    <!-- Right Side Commercial Card -->
    <g transform="translate(1220, 95)" filter="url(#shadow)">
      <rect x="0" y="0" width="290" height="240" rx="20" fill="#0A0E1A" fill-opacity="0.75" stroke="#FFFFFF" stroke-opacity="0.18" stroke-width="1.5" />
      <text x="145" y="55" fill="${item.accent}" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="14" font-weight="800" text-anchor="middle" letter-spacing="2">PROMOTION OFFICIELLE</text>
      <line x1="30" y1="80" x2="260" y2="80" stroke="#FFFFFF" stroke-opacity="0.15" stroke-width="1" />
      <text x="145" y="125" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="22" font-weight="800" text-anchor="middle">${item.rightTitle}</text>
      <text x="145" y="160" fill="#94A3B8" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="14" font-weight="500" text-anchor="middle">${item.rightSub}</text>
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

  const filePath = path.join(SCRATCH_DIR, `banner_fr_${item.module}.jpg`);
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
  console.log("🇫🇷 GENERATING & UPLOADING 13 FRENCH BANNERS TO LIVE SERVER");
  console.log("==========================================================");

  for (const item of FRENCH_MODULE_BANNERS) {
    console.log(`\nGenerating French banner for ${item.module}...`);
    const filePath = await generateFrenchBannerImage(item);
    const uploadedUrl = await uploadBanner(filePath, `pro_banner_fr_${item.module}.jpg`);
    console.log(`  ✔ Uploaded to live server: ${uploadedUrl}`);

    // Update the banner table's french_image column
    const res = await pool.query(
      "UPDATE banner SET french_image = $1, updated_at = NOW() WHERE category_table = $2 RETURNING id, category_table",
      [uploadedUrl, item.module]
    );

    if (res.rowCount > 0) {
      console.log(`  ✔ Updated DB banner id=${res.rows[0].id} (${item.module}) with french_image`);
    } else {
      console.warn(`  ⚠ No banner row found with category_table='${item.module}'!`);
    }
  }

  console.log("\n==========================================================");
  console.log("🔍 VERIFYING FRENCH BANNERS IN DATABASE");
  console.log("==========================================================");
  const checkRes = await pool.query(
    "SELECT category_table, image, french_image FROM banner ORDER BY category_table"
  );
  for (const row of checkRes.rows) {
    const head = await fetch(row.french_image, { method: "HEAD" });
    console.log(`  [${head.status} ${head.statusText}] ${row.category_table} -> ${row.french_image}`);
  }

  console.log("\nFlushing cache...");
  await clearAllCache();

  console.log("\n🎉 ALL 13 FRENCH BANNERS GENERATED, UPLOADED & ACTIVATED ON LIVE SERVER!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
