import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import pkg from "pg";
const { Pool } = pkg;

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "user6",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "watchagocha-db",
  port: Number(process.env.DB_PORT) || 5432,
});

// Rich, module-specific categories and subcategories
const moduleCategoryData = {
  "Mondo Market": {
    cat: "item_category",
    sub: "item_sub_category",
    data: [
      {
        name: "Electronics & Tech",
        french_name: "Électronique et technologie",
        subs: [
          { name: "Smartphones & Tablets", french_name: "Smartphones et tablettes" },
          { name: "Laptops & Computers", french_name: "Ordinateurs portables et PC" },
          { name: "Audio & Headphones", french_name: "Audio et casques" },
          { name: "Cameras & Photography", french_name: "Appareils photo et photographie" },
          { name: "Gaming & Consoles", french_name: "Jeux vidéo et consoles" },
        ],
      },
      {
        name: "Vehicles & Automotive",
        french_name: "Véhicules et automobile",
        subs: [
          { name: "Cars & SUVs", french_name: "Voitures et VUS" },
          { name: "Motorcycles & Scooters", french_name: "Motos et scooters" },
          { name: "Auto Parts & Accessories", french_name: "Pièces auto et accessoires" },
          { name: "Commercial & Trucks", french_name: "Véhicules commerciaux et camions" },
        ],
      },
      {
        name: "Real Estate & Housing",
        french_name: "Immobilier et logement",
        subs: [
          { name: "Apartments for Rent", french_name: "Appartements à louer" },
          { name: "Houses for Sale", french_name: "Maisons à vendre" },
          { name: "Commercial Properties", french_name: "Locaux commerciaux" },
          { name: "Land & Plots", french_name: "Terrains et parcelles" },
        ],
      },
      {
        name: "Home & Garden",
        french_name: "Maison et jardin",
        subs: [
          { name: "Furniture & Decor", french_name: "Meubles et décoration" },
          { name: "Kitchen & Dining", french_name: "Cuisine et salle à manger" },
          { name: "Garden & Outdoor", french_name: "Jardin et extérieur" },
          { name: "Tools & Home Improvement", french_name: "Outils et bricolage" },
        ],
      },
      {
        name: "Fashion & Beauty",
        french_name: "Mode et beauté",
        subs: [
          { name: "Men's Clothing", french_name: "Vêtements pour hommes" },
          { name: "Women's Clothing", french_name: "Vêtements pour femmes" },
          { name: "Shoes & Footwear", french_name: "Chaussures" },
          { name: "Jewelry & Watches", french_name: "Bijoux et montres" },
          { name: "Health & Beauty Care", french_name: "Soins de santé et beauté" },
        ],
      },
      {
        name: "Jobs & Services",
        french_name: "Emplois et services",
        subs: [
          { name: "Tech & IT Services", french_name: "Services technologiques et informatiques" },
          { name: "Professional Services", french_name: "Services professionnels" },
          { name: "Trade & Craft Services", french_name: "Métiers et artisanat" },
          { name: "Tutoring & Lessons", french_name: "Tutorat et cours particuliers" },
        ],
      },
    ],
  },
  "Pic Tours": {
    cat: "pic_category",
    sub: "pic_sub_category",
    data: [
      {
        name: "Nature & Landscapes",
        french_name: "Nature et paysages",
        subs: [
          { name: "Mountains & Valleys", french_name: "Montagnes et vallées" },
          { name: "Oceans, Lakes & Rivers", french_name: "Océans, lacs et rivières" },
          { name: "Forests & Woodlands", french_name: "Forêts et bois" },
          { name: "Sunsets & Sunrises", french_name: "Couchers et levers de soleil" },
        ],
      },
      {
        name: "Architecture & Cities",
        french_name: "Architecture et villes",
        subs: [
          { name: "Skylines & Cityscapes", french_name: "Panoramas urbains" },
          { name: "Historic & Ancient Monuments", french_name: "Monuments historiques et antiques" },
          { name: "Modern Architecture", french_name: "Architecture moderne" },
          { name: "Bridges & Streets", french_name: "Ponts et rues" },
        ],
      },
      {
        name: "Wildlife & Nature",
        french_name: "Faune et nature sauvage",
        subs: [
          { name: "African Safari", french_name: "Safari africain" },
          { name: "Marine Life & Deep Sea", french_name: "Vie marine et grands fonds" },
          { name: "Birds & Aviary", french_name: "Oiseaux et volières" },
        ],
      },
      {
        name: "Travel & Culture",
        french_name: "Voyages et culture",
        subs: [
          { name: "Local Festivals & Traditions", french_name: "Festivals locaux et traditions" },
          { name: "Street Photography", french_name: "Photographie de rue" },
          { name: "Cuisine & Culinary Journeys", french_name: "Cuisine et voyages culinaires" },
        ],
      },
    ],
  },
  "Video Mania": {
    cat: "video_category",
    sub: "video_sub_category",
    data: [
      {
        name: "Entertainment & Comedy",
        french_name: "Divertissement et comédie",
        subs: [
          { name: "Comedy Sketches", french_name: "Sketches humoristiques" },
          { name: "Pranks & Fun", french_name: "Farces et divertissements" },
          { name: "Stand-Up Comedy", french_name: "Stand-up comédie" },
        ],
      },
      {
        name: "Music & Performing Arts",
        french_name: "Musique et arts de la scène",
        subs: [
          { name: "Live Concerts", french_name: "Concerts en direct" },
          { name: "Music Videos", french_name: "Clips musicaux" },
          { name: "Acoustic & Covers", french_name: "Acoustique et reprises" },
        ],
      },
      {
        name: "Gaming & Esports",
        french_name: "Jeux vidéo et e-sport",
        subs: [
          { name: "Gameplay Highlights", french_name: "Temps forts de jeu" },
          { name: "Game Reviews & Walkthroughs", french_name: "Critiques et guides de jeu" },
          { name: "Esports Tournaments", french_name: "Tournois e-sport" },
        ],
      },
      {
        name: "Vlogs & Lifestyle",
        french_name: "Vlogs et mode de vie",
        subs: [
          { name: "Daily Vlogs", french_name: "Vlogs quotidiens" },
          { name: "Travel Diaries", french_name: "Carnets de voyage" },
          { name: "Fitness & Wellness", french_name: "Fitness et bien-être" },
        ],
      },
    ],
  },
  "Apps": {
    cat: "app_category",
    sub: "app_sub_category",
    data: [
      {
        name: "Productivity & Business",
        french_name: "Productivité et entreprise",
        subs: [
          { name: "Task & Project Management", french_name: "Gestion des tâches et projets" },
          { name: "Note Taking & Documents", french_name: "Prise de notes et documents" },
          { name: "Finance & Budgeting", french_name: "Finance et budget" },
        ],
      },
      {
        name: "Utilities & Tools",
        french_name: "Utilitaires et outils",
        subs: [
          { name: "Calculators & Converters", french_name: "Calculatrices et convertisseurs" },
          { name: "File Management & Storage", french_name: "Gestion de fichiers et stockage" },
          { name: "Security & Antivirus", french_name: "Sécurité et antivirus" },
        ],
      },
      {
        name: "Social & Communication",
        french_name: "Réseaux sociaux et communication",
        subs: [
          { name: "Instant Messaging", french_name: "Messagerie instantanée" },
          { name: "Voice & Video Calling", french_name: "Appels vocaux et vidéo" },
          { name: "Community Networks", french_name: "Réseaux communautaires" },
        ],
      },
    ],
  },
  "Open Letters / Disc": {
    cat: "disc_category",
    sub: "disc_sub_category",
    data: [
      {
        name: "Public Grievances & Inquiries",
        french_name: "Doléances et demandes publiques",
        subs: [
          { name: "Public", french_name: "Public" },
          { name: "Authorities", french_name: "Autorités" },
          { name: "Leaders", french_name: "Leaders" },
          { name: "Celebrities", french_name: "Célébrités" },
        ],
      },
      {
        name: "Community & Civic Affairs",
        french_name: "Affaires communautaires et civiques",
        subs: [
          { name: "Local Governance", french_name: "Gouvernance locale" },
          { name: "Environmental Concerns", french_name: "Préoccupations environnementales" },
          { name: "Education & Schools", french_name: "Éducation et écoles" },
        ],
      },
    ],
  },
  "Cinematics": {
    cat: "cinematics_category",
    sub: "cinematics_sub_category",
    data: [
      {
        name: "Feature Films & Cinema",
        french_name: "Longs métrages et cinéma",
        subs: [
          { name: "Action & Adventure", french_name: "Action et aventure" },
          { name: "Drama & Romance", french_name: "Drame et romance" },
          { name: "Sci-Fi & Fantasy", french_name: "Science-fiction et fantastique" },
          { name: "Thriller & Mystery", french_name: "Thriller et mystère" },
        ],
      },
      {
        name: "Short Films & Indie",
        french_name: "Courts métrages et cinéma indépendant",
        subs: [
          { name: "Animated Shorts", french_name: "Courts métrages d'animation" },
          { name: "Documentary Shorts", french_name: "Courts métrages documentaires" },
          { name: "Experimental Cinema", french_name: "Cinéma expérimental" },
        ],
      },
    ],
  },
  "Fan Star": {
    cat: "fan_star_category",
    sub: "fan_star_sub_category",
    data: [
      {
        name: "Celebrities & Icons",
        french_name: "Célébrités et icônes",
        subs: [
          { name: "Movie Stars", french_name: "Stars de cinéma" },
          { name: "Music Icons", french_name: "Icônes de la musique" },
          { name: "Sports Celebrities", french_name: "Célébrités sportives" },
        ],
      },
      {
        name: "Influencers & Creators",
        french_name: "Influenceurs et créateurs",
        subs: [
          { name: "Digital Creators", french_name: "Créateurs numériques" },
          { name: "Streamers & Podcasters", french_name: "Streameurs et podcasteurs" },
        ],
      },
    ],
  },
  "Kid Vids": {
    cat: "kid_vids_category",
    sub: "kid_vids_sub_category",
    data: [
      {
        name: "Cartoons & Animations",
        french_name: "Dessins animés et animations",
        subs: [
          { name: "Nursery Rhymes & Songs", french_name: "Comptines et chansons" },
          { name: "Fairy Tales & Stories", french_name: "Contes de fées et histoires" },
          { name: "Superhero Cartoons", french_name: "Dessins animés de super-héros" },
        ],
      },
      {
        name: "Educational & Learning",
        french_name: "Éducatif et apprentissage",
        subs: [
          { name: "ABC & 123 Learning", french_name: "Apprentissage de l'alphabet et des chiffres" },
          { name: "Science for Kids", french_name: "Sciences pour enfants" },
          { name: "Arts & Crafts for Kids", french_name: "Bricolage et arts plastiques pour enfants" },
        ],
      },
    ],
  },
  "Learning Hobbies": {
    cat: "learning_hobbies_category",
    sub: "learning_hobbies_sub_category",
    data: [
      {
        name: "Cooking & Baking",
        french_name: "Cuisine et pâtisserie",
        subs: [
          { name: "Baking & Desserts", french_name: "Pâtisserie et desserts" },
          { name: "Quick & Easy Recipes", french_name: "Recettes rapides et faciles" },
          { name: "World Cuisine", french_name: "Cuisines du monde" },
        ],
      },
      {
        name: "Crafts & DIY",
        french_name: "Bricolage et DIY",
        subs: [
          { name: "Woodworking & Carpentry", french_name: "Travail du bois et menuiserie" },
          { name: "Knitting & Sewing", french_name: "Tricot et couture" },
          { name: "Gardening & Plant Care", french_name: "Jardinage et soins des plantes" },
        ],
      },
      {
        name: "Music & Instruments",
        french_name: "Musique et instruments",
        subs: [
          { name: "Guitar Lessons", french_name: "Cours de guitare" },
          { name: "Piano & Keyboards", french_name: "Piano et claviers" },
          { name: "Vocal Training", french_name: "Formation vocale" },
        ],
      },
    ],
  },
  "Sports": {
    cat: "sports_category",
    sub: "sport_sub_category",
    data: [
      {
        name: "Team Sports",
        french_name: "Sports d'équipe",
        subs: [
          { name: "Football / Soccer", french_name: "Football" },
          { name: "Basketball", french_name: "Basketball" },
          { name: "Cricket", french_name: "Cricket" },
          { name: "Rugby & American Football", french_name: "Rugby et football américain" },
        ],
      },
      {
        name: "Individual & Racquet Sports",
        french_name: "Sports individuels et de raquette",
        subs: [
          { name: "Tennis & Padel", french_name: "Tennis et padel" },
          { name: "Badminton & Table Tennis", french_name: "Badminton et tennis de table" },
          { name: "Golf", french_name: "Golf" },
          { name: "Athletics & Running", french_name: "Athlétisme et course à pied" },
        ],
      },
      {
        name: "Combat & Extreme Sports",
        french_name: "Sports de combat et extrêmes",
        subs: [
          { name: "Boxing & MMA", french_name: "Boxe et MMA" },
          { name: "Motorsports & Racing", french_name: "Sports mécaniques et course" },
          { name: "Extreme & Action Sports", french_name: "Sports extrêmes et d'action" },
        ],
      },
    ],
  },
  "Tv Progmax": {
    cat: "tv_progmax_category",
    sub: "tv_progmax_sub_category",
    data: [
      {
        name: "TV Series & Drama",
        french_name: "Séries télévisées et drames",
        subs: [
          { name: "Crime & Investigation", french_name: "Crime et enquête" },
          { name: "Comedy & Sitcoms", french_name: "Comédie et sitcoms" },
          { name: "Sci-Fi & Fantasy TV", french_name: "Séries SF et fantastique" },
        ],
      },
      {
        name: "Reality & Talk Shows",
        french_name: "Télé-réalité et talk-shows",
        subs: [
          { name: "Talk Shows & Interviews", french_name: "Talk-shows et interviews" },
          { name: "Talent & Game Shows", french_name: "Jeux et concours de talents" },
        ],
      },
    ],
  },
  "GEBC": {
    cat: "gebc_category",
    sub: "gebc_sub_category",
    data: [
      {
        name: "Global Business & Economy",
        french_name: "Économie et affaires mondiales",
        subs: [
          { name: "Stock Markets & Trading", french_name: "Marchés boursiers et trading" },
          { name: "Crypto & Blockchain", french_name: "Cryptomonnaie et blockchain" },
          { name: "Startups & Venture Capital", french_name: "Startups et capital-risque" },
        ],
      },
      {
        name: "Trade & Commerce",
        french_name: "Commerce international",
        subs: [
          { name: "Import & Export", french_name: "Importation et exportation" },
          { name: "Supply Chain & Logistics", french_name: "Chaîne d'approvisionnement et logistique" },
        ],
      },
    ],
  },
  "News": {
    cat: "news_category",
    sub: "news_sub_category",
    data: [
      {
        name: "World & Politics",
        french_name: "Monde et politique",
        subs: [
          { name: "International Affairs", french_name: "Affaires internationales" },
          { name: "Elections & Governance", french_name: "Élections et gouvernance" },
          { name: "Diplomacy & Treaties", french_name: "Diplomatie et traités" },
        ],
      },
      {
        name: "Science & Technology",
        french_name: "Science et technologie",
        subs: [
          { name: "AI & Innovation", french_name: "IA et innovation" },
          { name: "Space & Astronomy", french_name: "Espace et astronomie" },
          { name: "Climate & Energy", french_name: "Climat et énergie" },
        ],
      },
      {
        name: "Culture & Society",
        french_name: "Culture et société",
        subs: [
          { name: "Arts & Entertainment News", french_name: "Actualités arts et spectacles" },
          { name: "Social Trends & Insights", french_name: "Tendances sociales et société" },
        ],
      },
    ],
  },
  "QAFI": {
    cat: "qafi_category",
    sub: "qafi_sub_category",
    data: [
      {
        name: "Questions & Insights",
        french_name: "Questions et réflexions",
        subs: [
          { name: "General Knowledge", french_name: "Culture générale" },
          { name: "Science & Philosophy", french_name: "Science et philosophie" },
          { name: "Current Events Q&A", french_name: "Questions-réponses d'actualité" },
        ],
      },
      {
        name: "Opinions & Perspectives",
        french_name: "Opinions et perspectives",
        subs: [
          { name: "Cultural Perspectives", french_name: "Perspectives culturelles" },
          { name: "Future Trends & Debates", french_name: "Tendances futures et débats" },
        ],
      },
    ],
  },
};

async function checkColumnExists(tableName, columnName) {
  const res = await pool.query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [tableName, columnName]
  );
  return res.rows.length > 0;
}

async function wipeAndResetDatabase() {
  const client = await pool.connect();
  try {
    console.log("==================================================");
    console.log("🧹 1. CLEARING ALL DATA FROM LOCAL DATABASE...");
    console.log("==================================================");

    const tablesRes = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);

    const tables = tablesRes.rows.map((r) => `"${r.tablename}"`);
    if (tables.length > 0) {
      console.log(`Found ${tables.length} tables to truncate.`);
      await client.query(`TRUNCATE TABLE ${tables.join(", ")} RESTART IDENTITY CASCADE;`);
      console.log("✔ All tables successfully truncated & identities reset.");
    }

    console.log("\n⚙ 2. RE-INITIALIZING SCHEMA (init.sql & migrations)...");
    const initSqlPath = path.resolve("./model/init.sql");
    if (fs.existsSync(initSqlPath)) {
      const initSql = fs.readFileSync(initSqlPath, "utf-8");
      await client.query(initSql);
      console.log("✔ init.sql applied cleanly.");
    }

    console.log("\n👤 3. CREATING DEFAULT USERS...");
    const hashedPassword = await bcrypt.hash("admin123", 10);
    const adminRes = await client.query(
      `INSERT INTO users (username, email, password, role, verified, is_deleted, block, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING id;`,
      ["Admin", "admin@gmail.com", hashedPassword, "admin", true, false, false]
    );
    const adminId = adminRes.rows[0].id;
    console.log(`✔ Admin user created: admin@gmail.com / admin123 (ID: ${adminId})`);

    const userPassword = await bcrypt.hash("user123", 10);
    const userRes = await client.query(
      `INSERT INTO users (username, email, password, role, verified, is_deleted, block, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING id;`,
      ["Test User", "user@gmail.com", userPassword, "user", true, false, false]
    );
    console.log(`✔ Regular test user created: user@gmail.com / user123 (ID: ${userRes.rows[0].id})`);

    console.log("\n🌱 4. SEEDING FRESH CATEGORIES & SUB-CATEGORIES ACROSS ALL 14 MODULES...");

    for (const [moduleName, modInfo] of Object.entries(moduleCategoryData)) {
      const { cat: catTable, sub: subTable, data } = modInfo;
      console.log(`\n  ▶ Seeding ${moduleName} (Tables: ${catTable}, ${subTable})...`);

      const hasCatIndex = await checkColumnExists(catTable, "index");
      const hasCatUserId = await checkColumnExists(catTable, "user_id");
      const hasSubIndex = await checkColumnExists(subTable, "index");

      for (let i = 0; i < data.length; i++) {
        const cat = data[i];
        let catInsertSql = "";
        let catArgs = [];

        if (hasCatUserId && hasCatIndex) {
          catInsertSql = `INSERT INTO "${catTable}" (user_id, name, french_name, "index") VALUES ($1, $2, $3, $4) RETURNING id`;
          catArgs = [adminId, cat.name, cat.french_name, i];
        } else if (hasCatUserId) {
          catInsertSql = `INSERT INTO "${catTable}" (user_id, name, french_name) VALUES ($1, $2, $3) RETURNING id`;
          catArgs = [adminId, cat.name, cat.french_name];
        } else if (hasCatIndex) {
          catInsertSql = `INSERT INTO "${catTable}" (name, french_name, "index") VALUES ($1, $2, $3) RETURNING id`;
          catArgs = [cat.name, cat.french_name, i];
        } else {
          catInsertSql = `INSERT INTO "${catTable}" (name, french_name) VALUES ($1, $2) RETURNING id`;
          catArgs = [cat.name, cat.french_name];
        }

        const catRes = await client.query(catInsertSql, catArgs);
        const catId = catRes.rows[0].id;

        if (cat.subs && cat.subs.length > 0) {
          for (let j = 0; j < cat.subs.length; j++) {
            const sub = cat.subs[j];
            let subInsertSql = "";
            let subArgs = [];

            if (hasSubIndex) {
              subInsertSql = `INSERT INTO "${subTable}" (category_id, name, french_name, "index") VALUES ($1, $2, $3, $4)`;
              subArgs = [catId, sub.name, sub.french_name, j];
            } else {
              subInsertSql = `INSERT INTO "${subTable}" (category_id, name, french_name) VALUES ($1, $2, $3)`;
              subArgs = [catId, sub.name, sub.french_name];
            }

            await client.query(subInsertSql, subArgs);
          }
        }
      }
      console.log(`    ✔ ${moduleName}: Seeded ${data.length} categories.`);
    }

    console.log("\n==================================================");
    console.log("🎉 DATABASE RESET & SEEDING COMPLETED SUCCESSFULLY!");
    console.log("==================================================");
    process.exit(0);
  } catch (error) {
    console.error("❌ Reset & Seeding Failed:", error);
    process.exit(1);
  } finally {
    client.release();
  }
}

wipeAndResetDatabase();
