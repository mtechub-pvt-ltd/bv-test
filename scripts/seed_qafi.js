import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import pkg from "pg";
const { Pool } = pkg;

dotenv.config();

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3801";
const scratchDir = "/Users/user6/.gemini/antigravity-ide/brain/72b27b92-c930-4c90-844c-3fefdb5573b7/scratch/qafi_images";

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "user6",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "watchagocha-db",
  port: Number(process.env.DB_PORT) || 5432,
});

// Comprehensive, 100% unique English questions & discussions for Q & A module
const qafiCatalog = [
  // 1. Politics
  {
    catName: "Politics",
    subName: "English",
    question: "How can modern democratic nations best balance executive agility with legislative oversight during international economic crises?",
    imageUrl: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=900&q=80",
    filename: "qafi_politics_en.jpg"
  },
  {
    catName: "Politics",
    subName: "Uncategorized",
    question: "What are the most effective civic technologies to increase direct citizen participation in local municipal council decisions?",
    imageUrl: "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=900&q=80",
    filename: "qafi_politics_uncat.jpg"
  },

  // 2. Business
  {
    catName: "Business",
    subName: "English",
    question: "What strategies enable early-stage startups to achieve sustainable profitability without over-relying on continuous venture capital rounds?",
    imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=900&q=80",
    filename: "qafi_business_en.jpg"
  },
  {
    catName: "Business",
    subName: "Uncategorized",
    question: "How will circular supply chain models reshape consumer goods manufacturing and retail logistics over the next decade?",
    imageUrl: "https://images.unsplash.com/photo-1444653614773-995cb1ef902f?w=900&q=80",
    filename: "qafi_business_uncat.jpg"
  },

  // 3. Lifestyle
  {
    catName: "Lifestyle",
    subName: "English",
    question: "What daily micro-habits have the most profound long-term impact on personal cognitive focus and emotional balance?",
    imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=900&q=80",
    filename: "qafi_lifestyle_en.jpg"
  },
  {
    catName: "Lifestyle",
    subName: "Uncategorized",
    question: "How can urban apartment dwellers integrate biophilic design and natural light optimization into compact living spaces?",
    imageUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=900&q=80",
    filename: "qafi_lifestyle_uncat.jpg"
  },

  // 4. Entertainment
  {
    catName: "Entertainment",
    subName: "English",
    question: "How is the rise of interactive non-linear storytelling changing the traditional cinema and streaming series landscape?",
    imageUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=900&q=80",
    filename: "qafi_entertainment_en.jpg"
  },
  {
    catName: "Entertainment",
    subName: "Uncategorized",
    question: "What makes practical in-camera film effects endure with greater emotional resonance than pure digital CGI in modern blockbuster films?",
    imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900&q=80",
    filename: "qafi_entertainment_uncat.jpg"
  },

  // 5. Education
  {
    catName: "Education",
    subName: "English",
    question: "How can secondary schools restructure curricula to teach adaptive critical thinking alongside emerging automated AI tools?",
    imageUrl: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=900&q=80",
    filename: "qafi_education_en.jpg"
  },
  {
    catName: "Education",
    subName: "Uncategorized",
    question: "What are the proven benefits of project-based experiential learning over standardized rote memorization in STEM disciplines?",
    imageUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=900&q=80",
    filename: "qafi_education_uncat.jpg"
  },

  // 6. Sports
  {
    catName: "Sports",
    subName: "English",
    question: "How are wearable biometric sensors and predictive analytics revolutionizing elite athlete injury prevention and recovery protocols?",
    imageUrl: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=900&q=80",
    filename: "qafi_sports_en.jpg"
  },
  {
    catName: "Sports",
    subName: "Uncategorized",
    question: "What tactical shifts have transformed modern football pressing systems and goalkeeper distribution over the last five years?",
    imageUrl: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=900&q=80",
    filename: "qafi_sports_uncat.jpg"
  },

  // 7. Finance
  {
    catName: "Finance",
    subName: "English",
    question: "What portfolio diversification principles are most resilient against stagflationary macro environments and currency volatility?",
    imageUrl: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=900&q=80",
    filename: "qafi_finance_en.jpg"
  },
  {
    catName: "Finance",
    subName: "Uncategorized",
    question: "How will decentralized settlement layers and central bank digital currencies (CBDCs) interact in cross-border trade finance?",
    imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=900&q=80",
    filename: "qafi_finance_uncat.jpg"
  },

  // 8. Fitness & Health
  {
    catName: "Fitness & Health",
    subName: "English",
    question: "What is the optimal balance between progressive resistance strength training and cardiovascular zone-2 endurance for long-term healthspan?",
    imageUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=900&q=80",
    filename: "qafi_health_en.jpg"
  },
  {
    catName: "Fitness & Health",
    subName: "Uncategorized",
    question: "How does circadian rhythm light alignment and deep REM sleep architecture influence metabolic recovery and cellular autophagy?",
    imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=900&q=80",
    filename: "qafi_health_uncat.jpg"
  },

  // 9. Beauty & Fashion
  {
    catName: "Beauty & Fashion",
    subName: "English",
    question: "How can luxury fashion houses reconcile rapid capsule collection cycles with genuine zero-waste circularity and durable craftsmanship?",
    imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900&q=80",
    filename: "qafi_fashion_en.jpg"
  },
  {
    catName: "Beauty & Fashion",
    subName: "Uncategorized",
    question: "What breakthrough bio-fabricated materials (e.g. mycelium leather and algae dyes) show the greatest commercial scalability?",
    imageUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=900&q=80",
    filename: "qafi_fashion_uncat.jpg"
  },

  // 10. Art
  {
    catName: "Art",
    subName: "English",
    question: "How does the physical materiality of oil on canvas evoke a tactile psychological resonance that digital displays cannot reproduce?",
    imageUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=900&q=80",
    filename: "qafi_art_en.jpg"
  },
  {
    catName: "Art",
    subName: "Uncategorized",
    question: "What role do independent community printmaking and ceramic cooperatives play in counterbalancing mass-produced digital aesthetics?",
    imageUrl: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=900&q=80",
    filename: "qafi_art_uncat.jpg"
  },

  // 11. Travel & Tourism
  {
    catName: "Travel & Tourism",
    subName: "English",
    question: "How can popular heritage travel destinations implement regenerative tourism models that directly enrich local resident ecosystems?",
    imageUrl: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=900&q=80",
    filename: "qafi_travel_en.jpg"
  },
  {
    catName: "Travel & Tourism",
    subName: "Uncategorized",
    question: "What are the most scenic and culturally immersive long-distance train routes across continental Europe and Asia?",
    imageUrl: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=900&q=80",
    filename: "qafi_travel_uncat.jpg"
  },

  // 12. Gaming
  {
    catName: "Gaming",
    subName: "English",
    question: "How will real-time physics engines and neural rendering transform open-world worldbuilding and emergent environmental gameplay?",
    imageUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=900&q=80",
    filename: "qafi_gaming_en.jpg"
  },
  {
    catName: "Gaming",
    subName: "Uncategorized",
    question: "What design philosophies distinguish memorable boss battle encounter pacing in classic action-adventure titles?",
    imageUrl: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=900&q=80",
    filename: "qafi_gaming_uncat.jpg"
  },

  // 13. Multimedia
  {
    catName: "Multimedia",
    subName: "English",
    question: "How does spatial audio sound design in binaural podcasting and immersive media elevate listener emotional immersion?",
    imageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=900&q=80",
    filename: "qafi_multimedia_en.jpg"
  },
  {
    catName: "Multimedia",
    subName: "Uncategorized",
    question: "What color grading palettes and lighting ratios establish distinct atmospheric tone in neo-noir visual storytelling?",
    imageUrl: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=900&q=80",
    filename: "qafi_multimedia_uncat.jpg"
  },

  // 14. Science
  {
    catName: "Science",
    subName: "English",
    question: "What are the most promising breakthroughs in solid-state battery electrolytes and long-duration grid energy storage chemistry?",
    imageUrl: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=900&q=80",
    filename: "qafi_science_en.jpg"
  },
  {
    catName: "Science",
    subName: "Uncategorized",
    question: "How do deep-sea hydrothermal vent organisms survive extreme barometric pressures and what can they teach us about extraterrestrial life?",
    imageUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=900&q=80",
    filename: "qafi_science_uncat.jpg"
  },

  // 15. Tech & Innovation
  {
    catName: "Tech & Innovation",
    subName: "English",
    question: "What architectural paradigms are required to scale quantum error correction for practical fault-tolerant commercial computing?",
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=900&q=80",
    filename: "qafi_tech_en.jpg"
  },
  {
    catName: "Tech & Innovation",
    subName: "Uncategorized",
    question: "How can decentralized identity protocols give consumers sovereign cryptographic control over their personal data footprints?",
    imageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=900&q=80",
    filename: "qafi_tech_uncat.jpg"
  },

  // 16. Culture
  {
    catName: "Culture",
    subName: "English",
    question: "How do traditional culinary fermentation rituals bridge generational culinary heritage with contemporary gut-microbiome science?",
    imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=900&q=80",
    filename: "qafi_culture_en.jpg"
  },
  {
    catName: "Culture",
    subName: "Uncategorized",
    question: "In what ways do indigenous linguistic idioms shape cultural perception of time, spatial navigation, and ecological community relations?",
    imageUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=900&q=80",
    filename: "qafi_culture_uncat.jpg"
  },

  // 17. Religion
  {
    catName: "Religion",
    subName: "English",
    question: "How do historical contemplative meditation and silent prayer traditions across world faiths inform modern secular mindfulness?",
    imageUrl: "https://images.unsplash.com/photo-1519817650390-64a93db51149?w=900&q=80",
    filename: "qafi_religion_en.jpg"
  },
  {
    catName: "Religion",
    subName: "Uncategorized",
    question: "What universal ethical imperatives regarding environmental stewardship and compassion for the vulnerable unite world religions?",
    imageUrl: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=900&q=80",
    filename: "qafi_religion_uncat.jpg"
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

async function main() {
  console.log("==================================================");
  console.log("❓ SEEDING Q & A (QAFI) ACROSS ALL 17 CATEGORIES & SUBCATEGORIES");
  console.log("==================================================");

  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

  // 1. Ensure Uncategorized subcategory exists in qafi_sub_category for each category
  const cats = (await pool.query("SELECT id, name FROM qafi_category ORDER BY id")).rows;
  for (const c of cats) {
    const existing = await pool.query(
      "SELECT id FROM qafi_sub_category WHERE category_id = $1 AND name = $2",
      [c.id, "Uncategorized"]
    );
    if (existing.rows.length === 0) {
      const inserted = await pool.query(
        'INSERT INTO qafi_sub_category (category_id, name, french_name, "index", created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id',
        [c.id, "Uncategorized", "Non classé", 99]
      );
      console.log(`✔ Added [Uncategorized] subcategory to [${c.name}] (ID: ${c.id}) => Sub ID: ${inserted.rows[0].id}`);
    }
  }

  // 2. Clear existing qafi table
  await pool.query("TRUNCATE TABLE qafi RESTART IDENTITY CASCADE;");
  console.log("✔ Truncated QAFI table (Zero duplicates).");

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

  // 4. Fetch Category & Subcategory IDs from database
  console.log("\n2. Fetching Q & A categories and subcategories...");
  const catRows = (await pool.query("SELECT id, name FROM qafi_category ORDER BY id")).rows;
  const subRows = (await pool.query("SELECT id, category_id, name FROM qafi_sub_category ORDER BY id")).rows;

  console.log(`Found ${catRows.length} main categories and ${subRows.length} subcategories.`);

  // 5. Download media and publish questions
  console.log("\n3. Downloading media and inserting unique Q & A entries...");
  let createdCount = 0;

  for (let i = 0; i < qafiCatalog.length; i++) {
    const item = qafiCatalog[i];

    // Find main category
    const catObj = catRows.find(
      (c) => c.name.trim().toLowerCase() === item.catName.trim().toLowerCase()
    );
    if (!catObj) {
      console.warn(`⚠ Category not found: ${item.catName}`);
      continue;
    }
    const catId = catObj.id;

    // Find subcategory
    const subObj = subRows.find(
      (s) => s.category_id === catId && s.name.trim().toLowerCase() === item.subName.trim().toLowerCase()
    );
    const subId = subObj ? subObj.id : (subRows.find((s) => s.category_id === catId)?.id || 1);

    // Download image if not cached
    const localImagePath = path.join(scratchDir, item.filename);
    if (!fs.existsSync(localImagePath) || fs.statSync(localImagePath).size === 0) {
      console.log(`  ⬇ Downloading: ${item.filename}...`);
      let imgBuf;
      try {
        const imgRes = await fetch(item.imageUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
        if (imgRes.ok) imgBuf = Buffer.from(await imgRes.arrayBuffer());
      } catch (e) {}

      if (!imgBuf || imgBuf.length === 0) {
        const fallbackUrl = `https://picsum.photos/seed/${encodeURIComponent(item.filename)}/900/600`;
        const fbRes = await fetch(fallbackUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
        imgBuf = Buffer.from(await fbRes.arrayBuffer());
      }
      fs.writeFileSync(localImagePath, imgBuf);
    }

    // Upload via API
    const uploadedUrl = await uploadFileViaApi(localImagePath, item.filename);

    // Create QAFI post via API
    const payload = {
      description: item.question,
      category: catId,
      sub_category: subId,
      user_id: userId,
      image: uploadedUrl,
      type: "image",
    };

    const res = await fetch(`${BASE_URL}/qafi/createQafi`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.status === 200 || res.status === 201) {
      console.log(`  ✔ [QAFI ID: ${data.data?.qafi_id || data.data?.id}] "${item.question.slice(0, 65)}..."`);
      console.log(`      [${item.catName}] -> [${item.subName}]`);
      console.log(`      Image: ${uploadedUrl}\n`);
      createdCount++;
    } else {
      console.warn(`  ⚠ Failed creating QAFI:`, data);
    }
  }

  console.log("==================================================");
  console.log(`🎉 SUCCESS! Seeded ${createdCount} 100% unique Q & A questions across all 17 categories and subcategories!`);
  console.log("==================================================");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
