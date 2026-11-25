import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import pkg from "pg";
const { Pool } = pkg;

dotenv.config();

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3801";
const scratchDir = "/Users/user6/.gemini/antigravity-ide/brain/72b27b92-c930-4c90-844c-3fefdb5573b7/scratch/letter_images";

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "user6",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "watchagocha-db",
  port: Number(process.env.DB_PORT) || 5432,
});

// Comprehensive catalog of 100% unique Open Letters including Uncategorized subcategory
const uncatLetters = [
  // 1. Politics
  {
    catName: "Politics",
    subName: "Uncategorized",
    title: "Civic Petition for Equitable Youth Voting Access and Civic Literacy",
    greetings: "To the National Electoral Commission and Youth Civic Groups,",
    introduction: "Empowering young citizens with early civic education and accessible polling locations ensures the vitality of our representative democracy.",
    body: "We call for automatic high-school voter pre-registration, weekend election voting hours, and non-partisan educational guides distributed across digital platforms.",
    formOfAppeal: "In civic solidarity,",
    imageUrl: "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=900&q=80",
    filename: "letter_politics_uncat.jpg"
  },

  // 2. Gouvernance
  {
    catName: "Gouvernance",
    subName: "Uncategorized",
    title: "Proposal for Open Data Standards in Municipal Procurement Contracts",
    greetings: "To City Controllers, Auditors, and Public Watchdogs,",
    introduction: "Public trust in governmental purchasing requires complete visibility into bidding processes and contractor performance metrics.",
    body: "We advocate for standardized digital procurement dashboards where every public tender, contract modification, and disbursement is publicly viewable in real-time.",
    formOfAppeal: "Respectfully yours in good governance,",
    imageUrl: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=900&q=80",
    filename: "letter_governance_uncat.jpg"
  },

  // 3. Business & Finance
  {
    catName: "Business & Finance",
    subName: "Uncategorized",
    title: "Community Banking Initiative: Expanding Micro-Grants for Local Main Street Shops",
    greetings: "To Regional Bankers, Credit Unions, and Business Alliances,",
    introduction: "Independent neighborhood merchants create vibrant community hubs and preserve distinct local character.",
    body: "We propose the creation of dedicated municipal revolving loan funds offering zero-interest capital for storefront renovations and sustainable local inventory sourcing.",
    formOfAppeal: "With dedication to vibrant local economies,",
    imageUrl: "https://images.unsplash.com/photo-1444653614773-995cb1ef902f?w=900&q=80",
    filename: "letter_business_uncat.jpg"
  },

  // 4. Education
  {
    catName: "Education",
    subName: "Uncategorized",
    title: "Call for Universal Mental Health Support and Reduced Class Sizes in K-12",
    greetings: "To State Boards of Education and Teachers' Associations,",
    introduction: "Student wellbeing and academic achievement flourish when educators can provide individualized attention in supportive classroom environments.",
    body: "We urge school boards to maintain a maximum student-to-counselor ratio of 250:1 and establish dedicated quiet wellness spaces in every school building.",
    formOfAppeal: "Sincerely, on behalf of dedicated teachers,",
    imageUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=900&q=80",
    filename: "letter_education_uncat.jpg"
  },

  // 5. War & Security
  {
    catName: "War & Security",
    subName: "Uncategorized",
    title: "Global Appeal for Non-Proliferation and Protection of Civilian Energy Infrastructure",
    greetings: "To Delegates of the Disarmament Committee,",
    introduction: "Protecting vital power grids, water treatment stations, and hospitals from international conflict is a fundamental moral imperative.",
    body: "We urge all sovereign nations to sign binding international protocols designating civil power and water distribution systems as neutral protected zones.",
    formOfAppeal: "With urgent appeal for global peace,",
    imageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=900&q=80",
    filename: "letter_security_uncat.jpg"
  },

  // 6. Science & Innovation
  {
    catName: "Science & Innovation",
    subName: "Uncategorized",
    title: "Ethical AI Frameworks: Establishing Public Oversight on Autonomous Systems",
    greetings: "To Artificial Intelligence Labs and Tech Policy Ethicists,",
    introduction: "As machine learning systems influence lending, healthcare, and employment, transparent algorithm safety must be rigorously guaranteed.",
    body: "We recommend independent bias benchmarking for public-facing neural models, clear watermarking for synthetic media, and mandatory human-in-the-loop review.",
    formOfAppeal: "Advocating for ethical technological advancement,",
    imageUrl: "https://images.unsplash.com/photo-1507146426996-ef05306b995a?w=900&q=80",
    filename: "letter_science_uncat.jpg"
  },

  // 7. Art & Culture
  {
    catName: "Art & Culture",
    subName: "Uncategorized",
    title: "Funding Community Mural Projects and Public Performance Plazas",
    greetings: "To Arts Councils and Urban Cultural Commissioners,",
    introduction: "Public art transforms mundane streetscapes into vibrant open-air galleries that celebrate local history and neighborhood pride.",
    body: "We advocate allocating one percent of all municipal infrastructure development budgets toward commissioned local murals and free acoustic bandstands.",
    formOfAppeal: "With artistic passion and civic gratitude,",
    imageUrl: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=900&q=80",
    filename: "letter_art_uncat.jpg"
  },

  // 8. Beauty & Fashion
  {
    catName: "Beauty & Fashion",
    subName: "Uncategorized",
    title: "Eliminating Toxic Synthetic Chemicals in Cosmetic Formulations",
    greetings: "To Cosmetic Formulators and Consumer Safety Regulators,",
    introduction: "Beauty and self-care products should nourish consumers without relying on bio-accumulative microplastics or harsh industrial parabens.",
    body: "We call for mandatory full ingredient transparency labels, independent botanical certification, and safe biodegradable packaging standards.",
    formOfAppeal: "Yours in sustainable wellness,",
    imageUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=900&q=80",
    filename: "letter_fashion_uncat.jpg"
  },

  // 9. Infrastructure Development
  {
    catName: "Infrastructure Development",
    subName: "Uncategorized",
    title: "Prioritizing Dedicated Protected Bike Highways Across Metropolitan Regions",
    greetings: "To Urban Mobility Planners and Department of Transportation Directors,",
    introduction: "Safe, barrier-protected micro-mobility infrastructure decreases vehicular gridlock, cuts carbon emissions, and saves commuter lives.",
    body: "We propose constructing continuous grade-separated cycle tracks connecting residential suburbs directly with downtown employment and university campuses.",
    formOfAppeal: "In support of green urban transit,",
    imageUrl: "https://images.unsplash.com/photo-1508974239320-0a029497e820?w=900&q=80",
    filename: "letter_infrastructure_uncat.jpg"
  },

  // 10. Multimedia
  {
    catName: "Multimedia",
    subName: "Uncategorized",
    title: "Protecting Public Broadcasting and Community Radio Stations",
    greetings: "To Telecommunications Regulators and Community Media Allies,",
    introduction: "Local community radio stations and public access media deliver vital emergency broadcasting and hyper-local cultural programming.",
    body: "We urge legislators to protect public frequency spectrum allocations and provide steady digital modernization grants for independent community stations.",
    formOfAppeal: "In defense of community voice,",
    imageUrl: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=900&q=80",
    filename: "letter_multimedia_uncat.jpg"
  },

  // 11. Entertainment
  {
    catName: "Entertainment",
    subName: "Uncategorized",
    title: "Preserving Historic Performing Arts Theaters and Live Music Venues",
    greetings: "To Historic Preservation Societies and City Cultural Planners,",
    introduction: "Historic art deco theaters and intimate acoustic concert halls are the irreplaceable heartbeats of our cultural nightlife.",
    body: "We call for property tax relief covenants for independent historic music halls and emergency restoration grants for aging performance venues.",
    formOfAppeal: "With reverence for live music and theater,",
    imageUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=900&q=80",
    filename: "letter_entertainment_uncat.jpg"
  },

  // 12. Showbiz
  {
    catName: "Showbiz",
    subName: "Uncategorized",
    title: "Establishing Clear Guidelines for Digital Likeness and Synthetic Voices in Production",
    greetings: "To Screen Actors, Voice Artists, and Digital Production Studios,",
    introduction: "Technological cloning of vocal timbres and visual likenesses must respect the fundamental rights and consent of human artists.",
    body: "We advocate for explicit, unbundled contractual consent agreements and fair compensation models whenever digital replicas of performers are utilized.",
    formOfAppeal: "Standing with creative artists everywhere,",
    imageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=900&q=80",
    filename: "letter_showbiz_uncat.jpg"
  },

  // 13. Social Welfare
  {
    catName: "Social Welfare",
    subName: "Uncategorized",
    title: "Expanding Senior Companion Programs and Intergenerational Activity Centers",
    greetings: "To Eldercare Coordinators and Civic Community Leaders,",
    introduction: "Combating social isolation among aging citizens enriches the social fabric and preserves precious wisdom for younger generations.",
    body: "We propose establishing neighborhood intergenerational centers where retired volunteers mentor youth in literacy, music, and vocational crafts.",
    formOfAppeal: "With deep compassion for our elders,",
    imageUrl: "https://images.unsplash.com/photo-1516307365426-bea591f05011?w=900&q=80",
    filename: "letter_welfare_uncat.jpg"
  },

  // 14. Project Management
  {
    catName: "Project Management",
    subName: "Uncategorized",
    title: "Standardizing Environmental Impact Reviews in Commercial Construction Projects",
    greetings: "To Civil Engineers, Architecture Leads, and General Contractors,",
    introduction: "Responsible project management integrates ecological lifecycle analysis from initial blueprint conception to final ribbon cutting.",
    body: "We advocate for recycled steel sourcing thresholds, on-site greywater retention systems, and low-VOC interior building specifications.",
    formOfAppeal: "Dedicated to sustainable construction engineering,",
    imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=900&q=80",
    filename: "letter_pm_uncat.jpg"
  },

  // 15. Women Empowment
  {
    catName: "Women Empowment",
    subName: "Uncategorized",
    title: "Expanding Free Vocational Coding and Engineering Bootcamps for Women",
    greetings: "To Technology Foundations and Corporate CSR Directors,",
    introduction: "Equipping women with cutting-edge software development and data science skills unlocks transformative economic independence.",
    body: "We call for funded scholarships covering full tuition, childcare stipends, and dedicated executive mentorship pairings for female career switchers.",
    formOfAppeal: "Empowering future leaders together,",
    imageUrl: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=900&q=80",
    filename: "letter_women_uncat.jpg"
  },

  // 16. Fitness & Health
  {
    catName: "Fitness & Health",
    subName: "Uncategorized",
    title: "Mandating Nutritional Transparency and Whole Foods in Workplace Cafeterias",
    greetings: "To Corporate HR Directors and Wellness Coordinators,",
    introduction: "Nourishing employees with wholesome, unprocessed meal options boosts cognitive sharpness, daily mood, and long-term vitality.",
    body: "We recommend corporate campuses introduce subsidized organic salad bars, electrolyte hydration stations, and healthy cooking seminars.",
    formOfAppeal: "In pursuit of holistic vitality,",
    imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=900&q=80",
    filename: "letter_health_uncat.jpg"
  },

  // 17. Religion
  {
    catName: "Religion",
    subName: "Uncategorized",
    title: "Protecting Sacred Natural Sites, Ancient Groves, and Pilgrimage Footpaths",
    greetings: "To Conservation Agencies and Spiritual Heritage Stewards,",
    introduction: "Ancient forests, mountain peaks, and sacred natural springs hold profound spiritual significance across world cultures.",
    body: "We urge environmental ministries to designate historical spiritual ecosystems as protected cultural landscapes free from industrial extraction.",
    formOfAppeal: "With sacred reverence for nature,",
    imageUrl: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=900&q=80",
    filename: "letter_religion_uncat.jpg"
  },

  // 18. Energy
  {
    catName: "Energy",
    subName: "Uncategorized",
    title: "Expanding Rooftop Solar Subsidies and Battery Storage for Multi-Family Homes",
    greetings: "To Clean Energy Commissions and Housing Developers,",
    introduction: "Solar energy benefits should reach apartment renters and condominium owners through shared virtual net metering.",
    body: "We advocate for streamlined community solar tax credits, standardized grid interconnection waivers, and shared neighborhood battery banks.",
    formOfAppeal: "Powering an equitable clean future,",
    imageUrl: "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=900&q=80",
    filename: "letter_energy_uncat.jpg"
  },

  // 19. Water
  {
    catName: "Water",
    subName: "Uncategorized",
    title: "Revitalizing Urban River Corridors into Living Public Ecological Parks",
    greetings: "To Watershed Protection Councils and Landscape Architects,",
    introduction: "Restoring natural riverbanks and wetlands filters runoff pollutants while providing cooling recreational greenways for city dwellers.",
    body: "We propose removing concrete culverts where feasible, planting native riparian vegetation, and building floating bio-filtration wetland islands.",
    formOfAppeal: "For clean, thriving waterways,",
    imageUrl: "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=900&q=80",
    filename: "letter_water_uncat.jpg"
  },

  // 20. Culture
  {
    catName: "Culture",
    subName: "Uncategorized",
    title: "Establishing Neighborhood Artisan Incubators and Tool-Sharing Libraries",
    greetings: "To Community Development Corporations and Craft Guilds,",
    introduction: "Hands-on making, repair culture, and craftsmanship strengthen local economies and reduce wasteful consumption.",
    body: "We recommend converting unused municipal spaces into community woodworking shops, ceramics studios, and lending libraries for home repair tools.",
    formOfAppeal: "Building stronger community bonds,",
    imageUrl: "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=900&q=80",
    filename: "letter_culture_uncat.jpg"
  },

  // 21. Immigration
  {
    catName: "Immigration",
    subName: "Uncategorized",
    title: "Creating Community Mentorship Networks for Newcomer Entrepreneur Families",
    greetings: "To Small Business Associations and Resettlement Agencies,",
    introduction: "Immigrant-founded businesses revitalize commercial corridors, create jobs, and foster rich cultural bridges in neighborhoods.",
    body: "We propose establishing bilingual business mentorship pairings, streamlined licensing assistance, and community micro-grants for newly arrived entrepreneurs.",
    formOfAppeal: "With warm welcome and mutual support,",
    imageUrl: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=900&q=80",
    filename: "letter_immigration_uncat.jpg"
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
  console.log("✉ ENSURING UNCATEGORIZED IN OPEN LETTERS & SEEDING UNIQUE DATA");
  console.log("==================================================");

  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

  // 1. Ensure Uncategorized subcategory exists in disc_sub_category for each category
  const cats = (await pool.query("SELECT id, name FROM disc_category ORDER BY id")).rows;
  for (const c of cats) {
    const existing = await pool.query(
      "SELECT id FROM disc_sub_category WHERE category_id = $1 AND name = $2",
      [c.id, "Uncategorized"]
    );
    if (existing.rows.length === 0) {
      const inserted = await pool.query(
        'INSERT INTO disc_sub_category (category_id, name, french_name, "index", created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id',
        [c.id, "Uncategorized", "Uncategorized", 4]
      );
      console.log(`✔ Added [Uncategorized] subcategory to [${c.name}] (ID: ${c.id}) => Sub ID: ${inserted.rows[0].id}`);
    }
  }

  // 2. Fetch User & Signature
  const userId = 2;
  let sigId;
  const sigRes = await pool.query("SELECT id FROM signature WHERE user_id = $1 LIMIT 1", [userId]);
  if (sigRes.rows.length > 0) {
    sigId = sigRes.rows[0].id;
  } else {
    const newSig = await pool.query(
      "INSERT INTO signature (user_id, image, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING id",
      [userId, `${BASE_URL}/fileUpload/default_sig.png`]
    );
    sigId = newSig.rows[0].id;
  }

  // 3. Fetch Subcategory Map
  const subRows = (await pool.query("SELECT id, category_id, name FROM disc_sub_category ORDER BY id")).rows;

  // 4. Download media and insert Uncategorized Open Letters
  console.log("\nDownloading media and inserting unique Uncategorized Open Letters...");
  let createdCount = 0;

  for (let i = 0; i < uncatLetters.length; i++) {
    const item = uncatLetters[i];

    // Find main category
    const catObj = cats.find(
      (c) => c.name.trim().toLowerCase() === item.catName.trim().toLowerCase()
    );
    if (!catObj) continue;
    const catId = catObj.id;

    // Find subcategory
    const subObj = subRows.find(
      (s) => s.category_id === catId && s.name.trim().toLowerCase() === "uncategorized"
    );
    if (!subObj) continue;
    const subId = subObj.id;

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

    // Insert directly into post_letters
    const insertRes = await pool.query(
      `INSERT INTO post_letters (
        user_id, post_type, receiver_type, disc_category, disc_sub_category,
        name, address, email, contact_no, subject_place, post_date,
        greetings, introduction, body, form_of_appeal, signature_id,
        paid_status, top_letter, top_added_date, status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, CURRENT_DATE,
        $11, $12, $13, $14, $15,
        $16, $17, NOW(), 'approved', NOW(), NOW()
      ) RETURNING id`,
      [
        userId, "public", "general", catId, subId,
        item.title, "Civic Center Boulevard", "contact@wotchagotcha.com", "+1-800-555-0199", "Global Forum",
        item.greetings, item.introduction, item.body, item.formOfAppeal, sigId,
        false, false
      ]
    );

    const letterId = insertRes.rows[0].id;

    // Insert image into post_letters_images
    await pool.query(
      "INSERT INTO post_letters_images (letter_id, image, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())",
      [letterId, uploadedUrl]
    );

    console.log(`  ✔ [Letter ID: ${letterId}] "${item.title}"`);
    console.log(`      [${item.catName}] -> [Uncategorized]`);
    console.log(`      Image: ${uploadedUrl}\n`);
    createdCount++;
  }

  console.log("==================================================");
  console.log(`🎉 SUCCESS! Seeded ${createdCount} 100% unique Uncategorized Open Letters across all 21 categories!`);
  console.log("==================================================");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
