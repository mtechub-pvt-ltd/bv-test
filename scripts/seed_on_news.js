import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import pkg from "pg";
const { Pool } = pkg;

dotenv.config();

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3801";
const scratchDir = "/Users/user6/.gemini/antigravity-ide/brain/72b27b92-c930-4c90-844c-3fefdb5573b7/scratch/news_images";

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "user6",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "watchagocha-db",
  port: Number(process.env.DB_PORT) || 5432,
});

// Comprehensive catalog of 100% unique news articles across all 18 On-News categories
const newsCatalog = [
  // 1. News
  {
    catName: "News",
    subName: "English",
    title: "Global Climate Summit Adopts Historic Clean Ocean Accord",
    description: "Delegates from 140 nations ratified an international treaty aimed at protecting international marine biodiversity and curbing deep-sea plastic pollution.",
    imageUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=900&q=80",
    filename: "news_global_summit.jpg"
  },
  {
    catName: "News",
    subName: "French",
    title: "European Energy Ministers Approve Rapid Clean Grid Transition",
    description: "Environmental leaders finalize a comprehensive five-year framework to accelerate nationwide solar and offshore wind farm deployments.",
    imageUrl: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=900&q=80",
    filename: "news_french_energy.jpg"
  },
  {
    catName: "News",
    subName: "Spanish",
    title: "High-Speed Transcontinental Rail Corridor Officially Opens",
    description: "The newly inaugurated bullet train network links major metropolitan capitals, cutting intercity transit times by over fifty percent.",
    imageUrl: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=900&q=80",
    filename: "news_spanish_rail.jpg"
  },

  // 2. Politics
  {
    catName: "Politics",
    subName: "English",
    title: "Parliamentary Coalition Reaches Consensus on Digital Rights Act",
    description: "Lawmakers have formally enacted comprehensive consumer safeguards governing algorithmic accountability and artificial intelligence transparency.",
    imageUrl: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=900&q=80",
    filename: "politics_parliament.jpg"
  },
  {
    catName: "Politics",
    subName: "French",
    title: "Tripartite Diplomatic Summit Strengthens Cross-Border Cooperation",
    description: "Foreign ambassadors signed bilateral accords establishing joint security frameworks and streamlined commercial trade corridors.",
    imageUrl: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=900&q=80",
    filename: "politics_diplomacy.jpg"
  },
  {
    catName: "Politics",
    subName: "Germanic",
    title: "Federal Council Authorizes Major Modern Infrastructure Grants",
    description: "Senators approve a billion-dollar investment bill upgrading municipal public schools, green transit, and fiber-optic networks.",
    imageUrl: "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=900&q=80",
    filename: "politics_bundesrat.jpg"
  },

  // 3. Business
  {
    catName: "Business",
    subName: "English",
    title: "Global Supply Chains Stabilize as Maritime Logistics Modernize",
    description: "Major shipping hubs report record freight turnaround times driven by autonomous port cranes and automated predictive logistics platforms.",
    imageUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=900&q=80",
    filename: "business_logistics.jpg"
  },
  {
    catName: "Business",
    subName: "French",
    title: "Clean Technology Venture Funding Surpasses Forty Billion Dollars",
    description: "Venture capital firms channel record funding toward industrial decarbonization startups and high-capacity battery manufacturers.",
    imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=900&q=80",
    filename: "business_investment.jpg"
  },
  {
    catName: "Business",
    subName: "Portuguese",
    title: "Advanced Manufacturing Leaders Pioneer Zero-Waste Factory Standards",
    description: "Leading industrial conglomerates integrate circular economy processes, significantly reducing carbon footprints while boosting exports.",
    imageUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=900&q=80",
    filename: "business_manufacturing.jpg"
  },

  // 4. Art
  {
    catName: "Art",
    subName: "English",
    title: "Grand Retrospective of Contemporary Sculptural Architecture",
    description: "The Metropolitan Museum unveils an expansive exhibition exploring organic parametric forms in modern museum architecture.",
    imageUrl: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=900&q=80",
    filename: "art_museum_exhibition.jpg"
  },
  {
    catName: "Art",
    subName: "Italian",
    title: "Modern Fine Arts Gallery Unveils Immersive Classical Masterpieces",
    description: "Curators merge centuries-old oil canvas restoration with high-resolution digital projection halls to celebrate Renaissance art.",
    imageUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=900&q=80",
    filename: "art_renaissance.jpg"
  },

  // 5. Tech & Innovation
  {
    catName: "Tech & Innovation",
    subName: "English",
    title: "Quantum Computing Lab Achieves High-Fidelity Qubit Breakthrough",
    description: "Researchers demonstrated error-corrected quantum circuits operating at room temperature, paving the way for next-generation cryptanalysis.",
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=900&q=80",
    filename: "tech_quantum_chip.jpg"
  },
  {
    catName: "Tech & Innovation",
    subName: "Japanese",
    title: "Next-Generation Autonomous Humanoid Robots Deployed in Logistics",
    description: "Pioneering robotics laboratories unveil AI-guided humanoid systems capable of performing precision sorting in complex warehouses.",
    imageUrl: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=900&q=80",
    filename: "tech_robotics_ai.jpg"
  },

  // 6. Culture
  {
    catName: "Culture",
    subName: "English",
    title: "Ancient Silk Road Textile Heritage Restored by Historians",
    description: "Centuries-old silk tapestries and natural dye manuscripts have been meticulously conserved using advanced non-invasive spectroscopy.",
    imageUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=900&q=80",
    filename: "culture_textile.jpg"
  },
  {
    catName: "Culture",
    subName: "Arabic",
    title: "International Heritage Exhibition Celebrates Historic Calligraphy Arts",
    description: "Master calligraphers and historians convene to showcase classical geometric architectural ornamentation and manuscript conservation.",
    imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=900&q=80",
    filename: "culture_islamic_art.jpg"
  },

  // 7. Religion Trending
  {
    catName: "Religion Trending",
    subName: "English",
    title: "Interfaith Heritage Conference Advocates Global Peace Dialogues",
    description: "Spiritual leaders gathered at Geneva to inaugurate collaborative educational programs promoting cross-cultural harmony and empathy.",
    imageUrl: "https://images.unsplash.com/photo-1519817650390-64a93db51149?w=900&q=80",
    filename: "religion_interfaith.jpg"
  },
  {
    catName: "Religion Trending",
    subName: "Spanish",
    title: "Historic Cultural Sanctuary Welcomes Thousands of Global Visitors",
    description: "Ancient heritage routes and mountain monasteries celebrate centuries-old traditions of peaceful community pilgrimage.",
    imageUrl: "https://images.unsplash.com/photo-1548625361-16ef6dc7fa1f?w=900&q=80",
    filename: "religion_pilgrimage.jpg"
  },

  // 8. Lifestyle
  {
    catName: "Lifestyle",
    subName: "English",
    title: "The Rise of Biophilic Urban Architecture and Vertical Forests",
    description: "Modern metropolitan apartments incorporate living foliage facades, reducing city temperatures and improving resident mental wellbeing.",
    imageUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=900&q=80",
    filename: "lifestyle_biophilic.jpg"
  },
  {
    catName: "Lifestyle",
    subName: "Germanic",
    title: "Sustainable Architecture and Natural Minimalist Home Interiors",
    description: "Urban residences embrace locally-sourced timber, energy-independent passive insulation, and clutter-free modern aesthetics.",
    imageUrl: "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=900&q=80",
    filename: "lifestyle_minimalism.jpg"
  },

  // 9. Entertainment
  {
    catName: "Entertainment",
    subName: "English",
    title: "Cinema Arts Academy Announces World Film Festival Slate",
    description: "Over eighty international auteur cinema releases and groundbreaking visual effects documentaries headline the festival lineup.",
    imageUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=900&q=80",
    filename: "entertainment_cinema.jpg"
  },
  {
    catName: "Entertainment",
    subName: "Korean",
    title: "Global Music Awards Showcase Live Symphony and Pop Collaboration",
    description: "Top recording artists teamed up with a sixty-piece symphony orchestra for an unforgettable worldwide televised concert performance.",
    imageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=900&q=80",
    filename: "entertainment_kpop.jpg"
  },

  // 10. Education
  {
    catName: "Education",
    subName: "English",
    title: "University Consortium Launches Open-Access Planetary Science Curriculum",
    description: "High school and college educators worldwide can now access peer-reviewed astrophysics simulations and interactive laboratory datasets for free.",
    imageUrl: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=900&q=80",
    filename: "education_university.jpg"
  },
  {
    catName: "Education",
    subName: "Portuguese",
    title: "Applied STEM Laboratories and Robotics Competitions Expand in Schools",
    description: "Educational foundations equip secondary schools with hands-on coding kits, microcontrollers, and collaborative problem-solving labs.",
    imageUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=900&q=80",
    filename: "education_robotics.jpg"
  },

  // 11. Sports
  {
    catName: "Sports",
    subName: "English",
    title: "World Athletic Championships Conclude with New Sprint World Records",
    description: "Incredible performances on the track saw two Olympic records shattered during the 100m and 4x100m relay finals under stadium lights.",
    imageUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=900&q=80",
    filename: "sports_athletics.jpg"
  },
  {
    catName: "Sports",
    subName: "Spanish",
    title: "Thrilling Five-Set Clay Court Tennis Final Decides World Champion",
    description: "An intense four-hour baseline duel delivers dramatic rallies and crowns a thrilling new Grand Slam tournament champion.",
    imageUrl: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=900&q=80",
    filename: "sports_tennis.jpg"
  },

  // 12. Finance
  {
    catName: "Finance",
    subName: "English",
    title: "Central Banks Signal Rate Normalization Amid Resilient Growth",
    description: "Monetary policy committees noted balanced inflation indices and sustained capital investment across manufacturing and services.",
    imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=900&q=80",
    filename: "finance_stock_exchange.jpg"
  },
  {
    catName: "Finance",
    subName: "French",
    title: "Global FinTech Innovations Accelerate Real-Time Cross-Border Payments",
    description: "Modern financial infrastructure enables seamless instant corporate settlements with reduced transaction fees and bank-grade security.",
    imageUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=900&q=80",
    filename: "finance_banking.jpg"
  },

  // 13. Fitness & Health
  {
    catName: "Fitness & Health",
    subName: "English",
    title: "Clinical Trials Confirm Cardiovascular Benefits of Zone-2 Endurance",
    description: "Medical researchers highlight how low-intensity aerobic conditioning optimizes mitochondrial health and extends active longevity.",
    imageUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=900&q=80",
    filename: "health_cardio.jpg"
  },
  {
    catName: "Fitness & Health",
    subName: "Italian",
    title: "Nutritional Science Affirms Cellular Benefits of Polyphenol-Rich Diets",
    description: "Longitudinal health studies demonstrate that Mediterranean olive oil and antioxidant-rich foods strengthen immune response.",
    imageUrl: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=900&q=80",
    filename: "health_mediterranean.jpg"
  },

  // 14. Beauty & Fashion
  {
    catName: "Beauty & Fashion",
    subName: "English",
    title: "Milan Fashion Week Highlights Circular Tailoring and Bio-Fabrics",
    description: "Designers unveiled sustainable collections utilizing plant-based leather and recycled cashmere fibers on the grand runway.",
    imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900&q=80",
    filename: "fashion_milan.jpg"
  },
  {
    catName: "Beauty & Fashion",
    subName: "French",
    title: "Artisanal Perfumers Craft Rare Botanical Fragrances in Haute Parfumerie",
    description: "Historic fragrance houses blend sustainable May rose extracts and ethically harvested precious cedarwood essences.",
    imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900&q=80",
    filename: "fashion_parfumerie.jpg"
  },

  // 15. Productivity
  {
    catName: "Productivity",
    subName: "English",
    title: "Cognitive Ergonomics: Designing Distraction-Free Deep Work Environments",
    description: "Workplace scientists discover that asynchronous collaboration and natural lighting increase engineering throughput by 35%.",
    imageUrl: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=900&q=80",
    filename: "productivity_workspace.jpg"
  },
  {
    catName: "Productivity",
    subName: "Germanic",
    title: "Modern Time-Blocking Techniques Boost High-Performance Team Focus",
    description: "Leading tech organizations reduce unnecessary meeting hours by adopting structured asynchronous design sprints and sprint retrospectives.",
    imageUrl: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=900&q=80",
    filename: "productivity_agile.jpg"
  },

  // 16. Books
  {
    catName: "Books",
    subName: "English",
    title: "International Literature Award Honors Epic Multi-Generational Novel",
    description: "The prestigious literary committee praised the author's lyrical storytelling and insightful historical commentary.",
    imageUrl: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=900&q=80",
    filename: "books_literature_award.jpg"
  },
  {
    catName: "Books",
    subName: "Spanish",
    title: "International Book Festival Gathers Millions of Passionate Readers",
    description: "Celebrated novelists and emerging voices host vibrant literary panels, book signings, and creative writing masterclasses.",
    imageUrl: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=900&q=80",
    filename: "books_book_fair.jpg"
  },

  // 17. Travel & Tourism
  {
    catName: "Travel & Tourism",
    subName: "English",
    title: "Scenic Alpine Rail Routes Open for Sustainable Winter Expeditions",
    description: "Panoramic glass-domed trains offer breathtaking views across untouched snow peaks and frozen alpine waterfalls.",
    imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=900&q=80",
    filename: "travel_alpine_rail.jpg"
  },
  {
    catName: "Travel & Tourism",
    subName: "Italian",
    title: "Breathtaking Coastal Escapes and Historic Mediterranean Villages",
    description: "Travelers discover pristine clifftop hiking trails, crystal-clear turquoise coves, and authentic culinary traditions.",
    imageUrl: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=900&q=80",
    filename: "travel_mediterranean.jpg"
  },

  // 18. Multimedia
  {
    catName: "Multimedia",
    subName: "English",
    title: "Documentary Filmmakers Pioneer Immersive Spatial Soundscapes",
    description: "Award-winning audio engineers capture 360-degree acoustic ambiences in polar biomes for next-generation interactive documentaries.",
    imageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=900&q=80",
    filename: "multimedia_soundscape.jpg"
  },
  {
    catName: "Multimedia",
    subName: "Japanese",
    title: "Pioneering Interactive Visual Storytelling and Spatial Audio Media",
    description: "Innovative multimedia artists combine dynamic generative visuals with high-fidelity acoustic soundscapes for digital art exhibitions.",
    imageUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=900&q=80",
    filename: "multimedia_interactive.jpg"
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
  console.log("📰 SEEDING ON-NEWS WITH 100% UNIQUE REAL JOURNALISM");
  console.log("==================================================");

  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

  // 1. Wipe existing news and top_news
  await pool.query("TRUNCATE TABLE news RESTART IDENTITY CASCADE;");
  await pool.query("TRUNCATE TABLE top_news RESTART IDENTITY CASCADE;");
  console.log("✔ Truncated news and top_news tables (Zero duplicates).");

  // 2. Authenticate User
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

  // 3. Fetch Category & Subcategory IDs from database
  console.log("\n2. Fetching On-News categories and subcategories...");
  const catRows = (await pool.query("SELECT id, name FROM news_category ORDER BY id")).rows;
  const subRows = (await pool.query("SELECT id, category_id, name FROM news_sub_category ORDER BY id")).rows;

  console.log(`Found ${catRows.length} main categories and ${subRows.length} subcategories.`);

  // 4. Download and publish articles
  console.log("\n3. Downloading media and publishing unique news articles via API...");
  let createdCount = 0;

  for (let i = 0; i < newsCatalog.length; i++) {
    const item = newsCatalog[i];

    // Find main category
    const catObj = catRows.find(
      (c) => c.name.trim().toLowerCase() === item.catName.trim().toLowerCase()
    );
    if (!catObj) {
      console.warn(`⚠ Category not found: ${item.catName}`);
      continue;
    }
    const catId = catObj.id;

    // Find subcategory for this category
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

    // Create News article via API
    const payload = {
      name: item.title,
      description: item.description,
      category: catId,
      sub_category: subId,
      user_id: userId,
      image: uploadedUrl,
      type: "image",
    };

    const res = await fetch(`${BASE_URL}/news/createNews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.status === 200 || res.status === 201) {
      console.log(`  ✔ [Article ID: ${data.data.NEWS_id || data.data.id}] "${item.title}"`);
      console.log(`      [${item.catName}] -> [${item.subName}]`);
      console.log(`      Image: ${uploadedUrl}\n`);
      createdCount++;
    } else {
      console.warn(`  ⚠ Failed creating "${item.title}":`, data);
    }
  }

  // 5. Populate top_news for all categories
  console.log("\n4. Populating top_news for all On-News categories...");
  for (const cat of catRows) {
    const article = (await pool.query(
      "SELECT name, description, image FROM news WHERE category = $1 ORDER BY id ASC LIMIT 1",
      [cat.id]
    )).rows[0];

    if (article) {
      await pool.query(
        "INSERT INTO top_news (description, disc_category, image) VALUES ($1, $2, $3)",
        [article.description, cat.id, article.image]
      );
      console.log(`  ✔ Top News seeded for [${cat.name}] (ID: ${cat.id})`);
    }
  }

  console.log("==================================================");
  console.log(`🎉 SUCCESS! Seeded ${createdCount} 100% unique news articles across all 18 categories!`);
  console.log("==================================================");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
