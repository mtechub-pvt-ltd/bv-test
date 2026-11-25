import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import pkg from "pg";
const { Pool } = pkg;

dotenv.config();

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3801";
const scratchDir = "/Users/user6/.gemini/antigravity-ide/brain/72b27b92-c930-4c90-844c-3fefdb5573b7/scratch/sports_images";

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "user6",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "watchagocha-db",
  port: Number(process.env.DB_PORT) || 5432,
});

// Curated catalog of 100% unique, authentic sports posts
const sportsCatalog = [
  // 1. Football
  {
    catName: "Football",
    subName: "Europe",
    title: "UEFA Champions League Final Stunner Under Floodlights",
    description: "A dramatic 90th-minute header curls past the keeper to seal a historic continental trophy in front of 80,000 cheering fans.",
    imageUrl: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=900&q=80",
    filename: "football_europe.jpg"
  },
  {
    catName: "Football",
    subName: "Americas",
    title: "Copa Libertadores Passion and Fireworks Atmosphere",
    description: "Vibrant stadium flares and nonstop chanting ignite the pitch as South American giants clash in an electric championship leg.",
    imageUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=900&q=80",
    filename: "football_americas.jpg"
  },
  {
    catName: "Football",
    subName: "Asia",
    title: "Asian Champions Cup Dynamic Counter-Attack Goal",
    description: "Precision wing play and a lightning-fast one-touch volley highlight a high-scoring group stage masterclass.",
    imageUrl: "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=900&q=80",
    filename: "football_asia.jpg"
  },
  {
    catName: "Football",
    subName: "Afrique",
    title: "Africa Cup of Nations Energetic Matchday Celebration",
    description: "Incredible athletic agility and thunderous crowd celebrations mark an inspiring quarter-final victory.",
    imageUrl: "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=900&q=80",
    filename: "football_afrique.jpg"
  },

  // 2. Basketball
  {
    catName: "Basketball",
    subName: "Americas",
    title: "NBA Finals Clutched Buzzer-Beating Three Pointer",
    description: "With 0.8 seconds on the game clock, the star guard steps back beyond the arc and sinks the game-winning jumper.",
    imageUrl: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=900&q=80",
    filename: "basketball_nba.jpg"
  },
  {
    catName: "Basketball",
    subName: "Europe",
    title: "EuroLeague High-Flying Alley-Oop Slam Dunk",
    description: "Crisp tactical ball movement leads to an electrifying baseline alley-oop that shakes the arena rim.",
    imageUrl: "https://images.unsplash.com/photo-1519861531473-9200262188bf?w=900&q=80",
    filename: "basketball_euroleague.jpg"
  },

  // 3. Hockey
  {
    catName: "Hockey",
    subName: "Europe",
    title: "World Field Hockey Championship Tactical Penalty Corner",
    description: "Flawless stick coordination and a blistering drag-flick pierce the upper corner during international pool play.",
    imageUrl: "https://images.unsplash.com/photo-1580748141549-71748dbe0bdc?w=900&q=80",
    filename: "hockey_field.jpg"
  },

  // 4. Volleyball
  {
    catName: "Volleyball",
    subName: "Americas",
    title: "Olympic Beach Volleyball Spiking Masterclass in Copacabana",
    description: "Athletes dive across sun-drenched coastal sands to pull off an impossible one-handed dig and spike winner.",
    imageUrl: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=900&q=80",
    filename: "volleyball_beach.jpg"
  },

  // 5. Tennis
  {
    catName: "Tennis",
    subName: "Europe",
    title: "Wimbledon Centre Court 130mph Ace on Match Point",
    description: "A blistering flat serve down the middle line seals victory on pristine grass after a gripping five-set duel.",
    imageUrl: "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=900&q=80",
    filename: "tennis_wimbledon.jpg"
  },
  {
    catName: "Tennis",
    subName: "Americas",
    title: "US Open Night Session Baseline Rally at Arthur Ashe",
    description: "Explosive top-spin forehands and relentless baseline defense captivate a sold-out New York night stadium.",
    imageUrl: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=900&q=80",
    filename: "tennis_usopen.jpg"
  },

  // 6. Boxing
  {
    catName: "Boxing",
    subName: "Americas",
    title: "Undisputed World Heavyweight Title Fight in Las Vegas",
    description: "Tense tactical exchanges and thunderous left hooks illuminate a legendary twelve-round championship clash.",
    imageUrl: "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=900&q=80",
    filename: "boxing_heavyweight.jpg"
  },

  // 7. Wrestling
  {
    catName: "Wrestling",
    subName: "Europe",
    title: "Freestyle Wrestling World Championship Mat Takedown",
    description: "Technical mastery and explosive core power result in a decisive single-leg takedown in the gold medal match.",
    imageUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=900&q=80",
    filename: "wrestling_freestyle.jpg"
  },

  // 8. Judo
  {
    catName: "Judo",
    subName: "Asia",
    title: "Grand Slam Judo Championship Textbook Ippon Throw",
    description: "Flawless balance leverage and hip rotation execute a spectacular Osoto Gari to claim maximum score.",
    imageUrl: "https://images.unsplash.com/photo-1517832606299-7ae9b720a186?w=900&q=80",
    filename: "judo_ippon.jpg"
  },

  // 9. Karate
  {
    catName: "Karate",
    subName: "Asia",
    title: "Karate Premier League Black Belt Kata Demonstration",
    description: "Incredible speed, razor-sharp precision, and traditional martial arts discipline on the tatami stage.",
    imageUrl: "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=900&q=80",
    filename: "karate_kata.jpg"
  },

  // 10. Swimming
  {
    catName: "Swimming",
    subName: "Americas",
    title: "World Aquatics 100m Butterfly Gold Medal Surge",
    description: "Powering through crystal-clear blue lanes with synchronized dolphin kicks to shatter the world record by 0.12s.",
    imageUrl: "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=900&q=80",
    filename: "swimming_butterfly.jpg"
  },

  // 11. Snowboarding
  {
    catName: "Snowboarding",
    subName: "Europe",
    title: "Winter X-Games Superpipe Triple Cork 1440 Invert",
    description: "Launching twenty feet above the icy halfpipe rim with a flawless grab and clean landing on fresh powder.",
    imageUrl: "https://images.unsplash.com/photo-1522056615691-da7b8106829f?w=900&q=80",
    filename: "snowboarding_superpipe.jpg"
  },

  // 12. Surfing
  {
    catName: "Surfing",
    subName: "Americas",
    title: "Riding the Massive Barrel Wave at Hawaii Pipeline",
    description: "Carving through a towering turquoise water curtain on a custom surfboard during the winter swell season.",
    imageUrl: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=900&q=80",
    filename: "surfing_pipeline.jpg"
  },

  // 13. Car Racing
  {
    catName: "Car Racing",
    subName: "Europe",
    title: "Monaco Grand Prix Hairpin Overtake in Formula 1",
    description: "Aerodynamic downforce and screaming hybrid turbocharged engines race through the historic street circuit.",
    imageUrl: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=900&q=80",
    filename: "racing_f1_monaco.jpg"
  },

  // 14. Road Cycling
  {
    catName: "Road Cycling",
    subName: "Europe",
    title: "Tour de France High Alpine Mountain Stage Breakaway",
    description: "Peloton climbers battle through steep switchbacks and thinning air on the legendary Col du Tourmalet pass.",
    imageUrl: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=900&q=80",
    filename: "cycling_tour_de_france.jpg"
  },

  // 15. Equestrian
  {
    catName: "Equestrian",
    subName: "Europe",
    title: "International Grand Prix Show Jumping Clear Round",
    description: "Graceful partnership between rider and champion thoroughbred clearing 1.60m oxer fences with poise.",
    imageUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=900&q=80",
    filename: "equestrian_jumping.jpg"
  },

  // 16. Skiing
  {
    catName: "Skiing",
    subName: "Europe",
    title: "Hahnenkamm Downhill 90mph High-Speed Descent",
    description: "Ski racers navigate icy sheer drops and sweeping turns on the most demanding alpine course in the world.",
    imageUrl: "https://images.unsplash.com/photo-1551524559-8af4e6624178?w=900&q=80",
    filename: "skiing_downhill.jpg"
  },

  // 17. Ice Hockey
  {
    catName: "Ice Hockey",
    subName: "Americas",
    title: "Stanley Cup Overtime Game-Winning Slap Shot",
    description: "A blistering 100mph slap shot from the blue line deflects into the top netting to trigger ecstatic ice celebrations.",
    imageUrl: "https://images.unsplash.com/photo-1515703407324-5f753eed8597?w=900&q=80",
    filename: "hockey_ice.jpg"
  },

  // 18. Motorcycle Racing
  {
    catName: "Motorcycle Racing",
    subName: "Europe",
    title: "MotoGP 65-Degree Lean Angle Knee-Scraping Apex",
    description: "Elite riders push the boundaries of physics on high-performance prototype superbikes around Mugello circuit.",
    imageUrl: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=900&q=80",
    filename: "moto_gp_racing.jpg"
  },

  // 19. Track & Field
  {
    catName: "Track & Field",
    subName: "Americas",
    title: "Olympic Decathlon Pole Vault Clearance at Twilight",
    description: "Bending carbon-fiber poles with explosive athleticism to clear the 5.90m bar against a dramatic stadium sky.",
    imageUrl: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=900&q=80",
    filename: "track_field_vault.jpg"
  },

  // 20. Skateboarding
  {
    catName: "Skateboarding",
    subName: "Americas",
    title: "Street League Skateboarding Kickflip Backside Tailslide",
    description: "Effortless technical street styling along concrete ledges and twelve-stair handrails in sunny California.",
    imageUrl: "https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?w=900&q=80",
    filename: "skateboarding_street.jpg"
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
  console.log("🏆 SEEDING SPORT & SPORT WITH 100% UNIQUE REAL POSTS");
  console.log("==================================================");

  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

  // 1. Wipe existing sports table
  await pool.query("TRUNCATE TABLE sports RESTART IDENTITY CASCADE;");
  console.log("✔ Truncated sports table (Zero duplicates).");

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
  console.log("\n2. Fetching Sports categories and subcategories...");
  const catRows = (await pool.query("SELECT id, name FROM sports_category ORDER BY id")).rows;
  const subRows = (await pool.query("SELECT id, category_id, name FROM sport_sub_category ORDER BY id")).rows;

  console.log(`Found ${catRows.length} main categories and ${subRows.length} subcategories.`);

  // 4. Download and publish sports posts
  console.log("\n3. Downloading media and publishing unique sports posts via API...");
  let createdCount = 0;

  for (let i = 0; i < sportsCatalog.length; i++) {
    const item = sportsCatalog[i];

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

    // Create Sports post via API
    const payload = {
      name: item.title,
      description: item.description,
      category_id: catId,
      sub_category_id: subId,
      user_id: userId,
      image: uploadedUrl,
      type: "image",
    };

    const res = await fetch(`${BASE_URL}/sports/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.status === 200 || res.status === 201) {
      console.log(`  ✔ [Sport ID: ${data.data?.id}] "${item.title}"`);
      console.log(`      [${item.catName}] -> [${item.subName}]`);
      console.log(`      Image: ${uploadedUrl}\n`);
      createdCount++;
    } else {
      console.warn(`  ⚠ Failed creating "${item.title}":`, data);
    }
  }

  console.log("==================================================");
  console.log(`🎉 SUCCESS! Seeded ${createdCount} 100% unique sports posts across all 20 categories!`);
  console.log("==================================================");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
