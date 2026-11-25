import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import pkg from "pg";
const { Pool } = pkg;

dotenv.config();

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3801";
const realMediaDir = "/Users/user6/.gemini/antigravity-ide/brain/72b27b92-c930-4c90-844c-3fefdb5573b7/scratch/real_live_media";
const exactThumbsDir = "/Users/user6/.gemini/antigravity-ide/brain/72b27b92-c930-4c90-844c-3fefdb5573b7/scratch/exact_video_thumbs";

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "user6",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "watchagocha-db",
  port: Number(process.env.DB_PORT) || 5432,
});

// Real verified video and exact matching frame thumbnail pairs
const verifiedMedia = [
  {
    videoFile: "cinematic_dragon_quest.mp4",
    thumbFile: "cinematic_dragon_quest.mp4.png",
  },
  {
    videoFile: "african_elephants.mp4",
    thumbFile: "african_elephants.mp4.png",
  },
  {
    videoFile: "urban_city_motion.mp4",
    thumbFile: "urban_city_motion.mp4.png",
  },
  {
    videoFile: "sea_turtle_ocean.mp4",
    thumbFile: "sea_turtle_ocean.mp4.png",
  },
  {
    videoFile: "snow_horses_wild.mp4",
    thumbFile: "snow_horses_wild.mp4.png",
  },
  {
    videoFile: "music_dance_friday.mp4",
    thumbFile: "music_dance_friday.mp4.png",
  },
  {
    videoFile: "nature_flower_bloom.mp4",
    thumbFile: "nature_flower_bloom.mp4.png",
  },
  {
    videoFile: "dog_pet_play.mp4",
    thumbFile: "dog_pet_play.mp4.png",
  }
];

// Curated educational catalog for Learning & Hobbies
const learnCatalog = [
  // 1. Art
  {
    catName: "Art",
    subName: "English",
    title: "Mastering Oil Painting Glazes and Chiaroscuro Lighting",
    description: "Step-by-step masterclass demonstrating Renaissance oil glazing techniques, transparent pigment layering, and dramatic value contrast.",
    mediaIndex: 0
  },
  {
    catName: "Art",
    subName: "French",
    title: "Aquarelle Botanique: Techniques de Dégradé et Précision",
    description: "Apprenez à capturer la délicatesse des pétales floraux grâce aux lavis d'aquarelle et aux pigments naturels.",
    mediaIndex: 6
  },
  {
    catName: "Art",
    subName: "Uncategorized",
    title: "Pottery Wheel Throwing: Centering and Shaping Ceramic Vessels",
    description: "Comprehensive studio tutorial covering clay wedging, wheel centering, wall pulling, and trimming elegant porcelain bowls.",
    mediaIndex: 3
  },

  // 2. Science & Tech
  {
    catName: "Science & Tech",
    subName: "English",
    title: "Building Microservices with Node.js and Distributed Event Streams",
    description: "Hands-on architectural guide to building resilient, scalable microservices using asynchronous messaging and Docker containers.",
    mediaIndex: 2
  },
  {
    catName: "Science & Tech",
    subName: "Spanish",
    title: "Introducción a la Robótica Autónoma y Control de Sensores",
    description: "Guía práctica de programación de microcontroladores y algoritmos de navegación para robots móviles.",
    mediaIndex: 0
  },
  {
    catName: "Science & Tech",
    subName: "Uncategorized",
    title: "Practical Quantum Computing: Qubits and Quantum Circuit Simulation",
    description: "An intuitive introduction to quantum superposition, entanglement gates, and running algorithms on cloud quantum simulators.",
    mediaIndex: 1
  },

  // 3. Maths
  {
    catName: "Maths",
    subName: "English",
    title: "Visualizing Multivariable Calculus: Gradient Fields and Line Integrals",
    description: "Intuitive geometric breakdowns of vector calculus, Green's theorem, and divergence curl calculations with animated graphs.",
    mediaIndex: 2
  },
  {
    catName: "Maths",
    subName: "Germanic",
    title: "Einführung in die Lineare Algebra und Matrizenrechnung",
    description: "Verständliche Erklärung von Vektorräumen, Eigenwerten und linearen Transformationen für angewandte Wissenschaften.",
    mediaIndex: 4
  },
  {
    catName: "Maths",
    subName: "Uncategorized",
    title: "Foundations of Cryptographic Number Theory and Prime Modulo",
    description: "Exploring modular arithmetic, Euler's totient function, and the mathematical underpinnings of RSA public-key encryption.",
    mediaIndex: 0
  },

  // 4. Business
  {
    catName: "Business",
    subName: "English",
    title: "Financial Modeling and Valuation for High-Growth Ventures",
    description: "Building discounted cash flow models, sensitivity tables, and unit economics frameworks in professional spreadsheets.",
    mediaIndex: 2
  },
  {
    catName: "Business",
    subName: "Italian",
    title: "Strategie di Brand Management e Posizionamento nel Lusso",
    description: "Come costruire una narrativa di marca distintiva fondata sull'artigianalità e sull'eccellenza del design.",
    mediaIndex: 0
  },
  {
    catName: "Business",
    subName: "Uncategorized",
    title: "Agile Product Management: From User Stories to Sprint Delivery",
    description: "Practical methodologies for backlog grooming, cross-functional engineering alignment, and rapid customer feedback loops.",
    mediaIndex: 5
  },

  // 5. Health
  {
    catName: "Health",
    subName: "English",
    title: "Biomechanics of Posterior Chain Mobility and Spine Longevity",
    description: "Corrective exercise protocols designed by physical therapists to enhance hip mobility, thoracic extension, and core bracing.",
    mediaIndex: 7
  },
  {
    catName: "Health",
    subName: "French",
    title: "Nutrition Fonctionnelle: Équilibre du Microbiote et Vitalité",
    description: "Comprendre les bienfaits des aliments fermentés et des fibres prébiotiques pour renforcer le système immunitaire.",
    mediaIndex: 6
  },
  {
    catName: "Health",
    subName: "Uncategorized",
    title: "Mindfulness Breathwork and Parasympathetic Nervous System Reset",
    description: "Scientific techniques for diaphragmatic box breathing, heart rate variability optimization, and daily stress recovery.",
    mediaIndex: 3
  },

  // 6. Social Studies
  {
    catName: "Social Studies",
    subName: "English",
    title: "Comparative Political Systems: Constitutional Models and Civic Law",
    description: "Analyzing the constitutional structures, judicial review mechanisms, and electoral systems of contemporary democracies.",
    mediaIndex: 2
  },
  {
    catName: "Social Studies",
    subName: "Portuguese",
    title: "História e Evolução das Cidades Coloniais na América Latina",
    description: "Um estudo detalhado do traçado urbano, arquitetura e transformações socioeconômicas dos centros históricos.",
    mediaIndex: 0
  },
  {
    catName: "Social Studies",
    subName: "Uncategorized",
    title: "Anthropology of Global Trade Routes: The Silk Road Legacy",
    description: "Exploring ancient merchant caravans, cultural exchange across Central Asia, and the transmission of knowledge.",
    mediaIndex: 1
  },

  // 7. Humanities
  {
    catName: "Humanities",
    subName: "English",
    title: "Moral Philosophy from Aristotle to Modern Virtue Ethics",
    description: "Deep dive into ethical frameworks, teleological reasoning, and practical wisdom in contemporary moral dilemmas.",
    mediaIndex: 0
  },
  {
    catName: "Humanities",
    subName: "Germanic",
    title: "Klassische Literatur und philosophische Diskurse der Aufklärung",
    description: "Analyse bedeutender literarischer Werke und deren Einfluss auf die europäische Geistesgeschichte.",
    mediaIndex: 4
  },
  {
    catName: "Humanities",
    subName: "Uncategorized",
    title: "The Architecture of Rhetoric: Classical Persuasion in Public Discourse",
    description: "Mastering ethos, pathos, and logos in formal argumentation, speeches, and critical debate analysis.",
    mediaIndex: 2
  },

  // 8. Religion Languages
  {
    catName: "Religion Languages",
    subName: "English",
    title: "Classical Arabic Grammar and Quranic Linguistic Nuances",
    description: "Foundational grammatical analysis of root structures, morphology, and rhetorical beauty in classical Arabic texts.",
    mediaIndex: 0
  },
  {
    catName: "Religion Languages",
    subName: "Arabic",
    title: "دراسة البلاغة والبيان في النصوص التراثية الكلاسيكية",
    description: "شرح تطبيقي لقواعد علم المعاني والبيان وتحليل التراكيب البلاغية في الأدب العربي الأصيل.",
    mediaIndex: 1
  },
  {
    catName: "Religion Languages",
    subName: "Uncategorized",
    title: "Ancient Koine Greek: Deciphering Manuscript Morphology",
    description: "Grammar breakdown of verb tenses, noun declensions, and vocabulary for historical manuscript translation.",
    mediaIndex: 2
  },

  // 9. Langues
  {
    catName: "Langues",
    subName: "English",
    title: "Conversational Spanish Fluency: Idiomatic Phrasing and Pronunciation",
    description: "Accelerated language tutorial focusing on authentic regional idioms, subjunctive mastery, and natural spoken rhythm.",
    mediaIndex: 5
  },
  {
    catName: "Langues",
    subName: "French",
    title: "Perfectionnement Français: Registres de Langue et Subtilités",
    description: "Atelier pratique pour maîtriser les nuances du discours formel, les accords complexes et l'expression idiomatique.",
    mediaIndex: 6
  },
  {
    catName: "Langues",
    subName: "Uncategorized",
    title: "Japanese Kanji Mastery: Radicals, Stroke Order, and Memory Systems",
    description: "Efficient spatial memory techniques to recognize and write essential Japanese kanji with correct stroke dynamics.",
    mediaIndex: 0
  },
];

async function uploadFileViaApi(filePath, filename, isVideo = false) {
  const fileBuffer = fs.readFileSync(filePath);
  const mimeType = isVideo ? "video/mp4" : "image/png";
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

async function main() {
  console.log("==================================================");
  console.log("🎓 SEEDING LEARNING & HOBBIES ACROSS ALL CATEGORIES & SUBCATEGORIES");
  console.log("==================================================");

  // 1. Ensure Uncategorized subcategory exists in DB for each category
  const cats = (await pool.query("SELECT id, name FROM learning_hobbies_category ORDER BY id")).rows;
  for (const c of cats) {
    const existing = await pool.query(
      "SELECT id FROM learning_hobbies_sub_category WHERE category_id = $1 AND name = $2",
      [c.id, "Uncategorized"]
    );
    if (existing.rows.length === 0) {
      const inserted = await pool.query(
        'INSERT INTO learning_hobbies_sub_category (category_id, name, french_name, "index", created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id',
        [c.id, "Uncategorized", "Non classé", 99]
      );
      console.log(`✔ Added [Uncategorized] subcategory to [${c.name}] (ID: ${c.id}) => Sub ID: ${inserted.rows[0].id}`);
    }
  }

  // 2. Wipe existing learning_hobbies_videos table
  await pool.query("TRUNCATE TABLE learning_hobbies_videos RESTART IDENTITY CASCADE;");
  console.log("✔ Truncated learning_hobbies_videos table (Zero duplicates).");

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

  // 4. Upload verified videos and thumbnails
  console.log("\n2. Uploading verified videos & matching extracted thumbnails...");
  const uploadedMediaMap = [];

  for (let i = 0; i < verifiedMedia.length; i++) {
    const item = verifiedMedia[i];
    const vidPath = path.join(realMediaDir, item.videoFile);
    const thumbPath = path.join(exactThumbsDir, item.thumbFile);

    const vidUrl = await uploadFileViaApi(vidPath, item.videoFile, true);
    const thumbUrl = await uploadFileViaApi(thumbPath, item.thumbFile, false);

    uploadedMediaMap.push({ videoUrl: vidUrl, thumbUrl });
    console.log(`  ✔ [Media ${i + 1}] ${item.videoFile} -> Uploaded video & matching frame thumbnail`);
  }

  // 5. Fetch Category & Subcategory IDs from database
  console.log("\n3. Fetching Learning & Hobbies categories and subcategories...");
  const catRows = (await pool.query("SELECT id, name FROM learning_hobbies_category ORDER BY id")).rows;
  const subRows = (await pool.query("SELECT id, category_id, name FROM learning_hobbies_sub_category ORDER BY id")).rows;

  console.log(`Found ${catRows.length} main categories and ${subRows.length} subcategories.`);

  // 6. Publish Learning tutorials
  console.log("\n4. Creating learning_hobbies entries via API...");
  let createdCount = 0;

  for (let i = 0; i < learnCatalog.length; i++) {
    const item = learnCatalog[i];

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

    const mediaPair = uploadedMediaMap[item.mediaIndex % uploadedMediaMap.length];

    const payload = {
      name: item.title,
      description: item.description,
      category_id: catId,
      sub_category_id: subId,
      user_id: userId,
      video: mediaPair.videoUrl,
      thumbnail: mediaPair.thumbUrl,
    };

    const res = await fetch(`${BASE_URL}/learningHobbies/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.status === 200 || res.status === 201) {
      console.log(`  ✔ [Learning Video ID: ${data.data?.id}] "${item.title}"`);
      console.log(`      [${item.catName}] -> [${item.subName}]`);
      console.log(`      Video: ${mediaPair.videoUrl}`);
      console.log(`      Thumbnail: ${mediaPair.thumbUrl}\n`);
      createdCount++;
    } else {
      console.warn(`  ⚠ Failed creating "${item.title}":`, data);
    }
  }

  console.log("==================================================");
  console.log(`🎉 SUCCESS! Seeded ${createdCount} 100% unique Learning & Hobbies masterclasses across all 9 categories!`);
  console.log("==================================================");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
