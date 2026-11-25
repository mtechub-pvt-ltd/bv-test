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

// Curated catalog of 100% unique, thoughtful English Open Letters across all 21 categories
const lettersCatalog = [
  // 1. Politics
  {
    catName: "Politics",
    subName: "Public (General)",
    title: "An Appeal for Bipartisan Transparency in Public Policy Decisions",
    greetings: "To the Citizens and Legislative Representatives,",
    introduction: "In an era of rapid technological and societal transition, open democratic dialogue remains the bedrock of public trust.",
    body: "We urge lawmakers from all parties to mandate open-access audits of regulatory policymaking, ensure equitable town hall access for rural communities, and protect independent civic oversight.",
    formOfAppeal: "With commitment to civic democracy,",
    imageUrl: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=900&q=80",
    filename: "letter_politics.jpg"
  },

  // 2. Gouvernance
  {
    catName: "Gouvernance",
    subName: "Public (aux Autorités, Célébrités, Leaders)",
    title: "Advancing Municipal Accountability and Modern Digital City Services",
    greetings: "To the Metropolitan Council and City Mayors,",
    introduction: "Modern urban governance requires transparent data portals, accountable budgeting, and direct citizen feedback loops.",
    body: "By implementing accessible online permit systems, published municipal expense trackers, and community participatory budgeting, cities can rebuild civic faith and deliver efficient local governance.",
    formOfAppeal: "Respectfully submitted by urban advocacy partners,",
    imageUrl: "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=900&q=80",
    filename: "letter_governance.jpg"
  },

  // 3. Business & Finance
  {
    catName: "Business & Finance",
    subName: "Public (General)",
    title: "Fostering Ethical Entrepreneurship and Financial Inclusion for Small Enterprises",
    greetings: "To Commercial Lenders, Investors, and Chamber of Commerce Leaders,",
    introduction: "Small and medium enterprises represent over seventy percent of employment, yet face disproportionate barrier-to-capital headwinds.",
    body: "We call upon regional banking institutions to lower micro-lending collateral hurdles, simplify grant application protocols, and support sustainable community credit unions.",
    formOfAppeal: "In support of equitable commercial growth,",
    imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=900&q=80",
    filename: "letter_business.jpg"
  },

  // 4. Education
  {
    catName: "Education",
    subName: "Public (General)",
    title: "Guaranteeing Universal Access to Quality STEM & Arts Education in Public Schools",
    greetings: "To School District Trustees and Education Ministers,",
    introduction: "Every student, regardless of postal code, deserves modern learning tools, compassionate teachers, and well-equipped classrooms.",
    body: "Investing in hands-on science laboratories, digital literacy programs, and comprehensive arts curricula prepares the next generation of inventive problem solvers.",
    formOfAppeal: "Sincerely, on behalf of educators and parents,",
    imageUrl: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=900&q=80",
    filename: "letter_education.jpg"
  },

  // 5. War & Security
  {
    catName: "War & Security",
    subName: "Public (aux Autorités, Célébrités, Leaders)",
    title: "Urgent Call for Diplomatic De-escalation and Humanitarian Corridors",
    greetings: "To International Peace Envoys and Global Security Councils,",
    introduction: "The preservation of innocent civilian lives must remain the primary imperative above all geopolitical disputes.",
    body: "We implore all negotiating parties to establish unhindered humanitarian relief access, protect civilian infrastructure, and sustain continuous peaceful dialogue.",
    formOfAppeal: "With urgent humanitarian plea,",
    imageUrl: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=900&q=80",
    filename: "letter_security.jpg"
  },

  // 6. Science & Innovation
  {
    catName: "Science & Innovation",
    subName: "Public (General)",
    title: "Open Science Protocols: Unlocking Global Medical & Climate Research",
    greetings: "To Academic Research Institutions and Scientific Publishers,",
    introduction: "Knowledge accelerates human progress most effectively when shared openly across borders without restrictive paywalls.",
    body: "We advocate for universal open-access repositories for federally funded clinical trials, climate modeling datasets, and renewable material discoveries.",
    formOfAppeal: "Dedicated to the advancement of science,",
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=900&q=80",
    filename: "letter_science.jpg"
  },

  // 7. Art & Culture
  {
    catName: "Art & Culture",
    subName: "Public (General)",
    title: "Preserving Indigenous Crafts and Supporting Living Cultural Heritage",
    greetings: "To Cultural Heritage Custodians and Art Foundation Trustees,",
    introduction: "Traditional artistic practices embody centuries of community wisdom, identity, and storytelling.",
    body: "We urge municipal councils and private arts foundations to fund dedicated workshop spaces for traditional weavers, potters, and oral historians.",
    formOfAppeal: "With deep cultural reverence,",
    imageUrl: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=900&q=80",
    filename: "letter_art.jpg"
  },

  // 8. Beauty & Fashion
  {
    catName: "Beauty & Fashion",
    subName: "Public (General)",
    title: "A Manifesto for Fair Labor Practices and Circular Materials in Global Fashion",
    greetings: "To Apparel Brands, Textile Manufacturers, and Consumers,",
    introduction: "Fashion should celebrate human creativity without exploiting factory workers or polluting river ecosystems.",
    body: "We advocate for living wage certification across supply chains, full textile recycling integration, and an end to harmful synthetic micro-fiber pollution.",
    formOfAppeal: "In solidarity with sustainable fashion innovators,",
    imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900&q=80",
    filename: "letter_fashion.jpg"
  },

  // 9. Infrastructure Development
  {
    catName: "Infrastructure Development",
    subName: "Public (General)",
    title: "Modernizing Clean Public Transit and Resilient Bridges for Future Generations",
    greetings: "To Transportation Authorities and Infrastructure Planners,",
    introduction: "Reliable, accessible public transportation connects communities and significantly reduces urban carbon emissions.",
    body: "We propose accelerating electric bus fleet conversions, prioritizing pedestrian greenway networks, and retrofitting critical regional bridges against extreme weather events.",
    formOfAppeal: "Advocating for sustainable public works,",
    imageUrl: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=900&q=80",
    filename: "letter_infrastructure.jpg"
  },

  // 10. Multimedia
  {
    catName: "Multimedia",
    subName: "Public (General)",
    title: "Safeguarding Independent Journalism and Digital Creator Rights",
    greetings: "To Digital Media Platforms and Press Freedom Advocates,",
    introduction: "Independent reporters and documentary creators provide essential investigative scrutiny in our digital public square.",
    body: "Platforms must implement transparent algorithmic distribution, protect independent investigative reporters from digital censorship, and guarantee fair royalty compensation.",
    formOfAppeal: "With dedication to press freedom,",
    imageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=900&q=80",
    filename: "letter_multimedia.jpg"
  },

  // 11. Entertainment
  {
    catName: "Entertainment",
    subName: "Public (General)",
    title: "Championing Diversity and Human Creativity in Cinematic Arts",
    greetings: "To Studio Executives, Guild Members, and Film Enthusiasts,",
    introduction: "Stories presented on screen shape empathy, cultural understanding, and collective imagination.",
    body: "We champion equitable opportunities for underrepresented filmmakers, genuine writer room protections, and the preservation of historic independent theaters.",
    formOfAppeal: "Yours in creative storytelling,",
    imageUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=900&q=80",
    filename: "letter_entertainment.jpg"
  },

  // 12. Showbiz
  {
    catName: "Showbiz",
    subName: "Public (General)",
    title: "Protecting Young Talent and Mental Health Standards Across Entertainment",
    greetings: "To Casting Directors, Talent Agencies, and Performing Arts Guilds,",
    introduction: "Behind the glamour of the entertainment industry lies the need for rigorous duty-of-care protections for artists.",
    body: "We advocate for mandatory on-set wellness counselors, strict protections for minor performers, and healthy working hour limits during production.",
    formOfAppeal: "With commitment to artist wellbeing,",
    imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900&q=80",
    filename: "letter_showbiz.jpg"
  },

  // 13. Social Welfare
  {
    catName: "Social Welfare",
    subName: "Public (General)",
    title: "Expanding Affordable Community Housing and Nutrition Programs",
    greetings: "To Housing Directors and Community Welfare Organizations,",
    introduction: "Safe shelter and nutritious meals are fundamental human rights essential for thriving families.",
    body: "We urge regional leaders to expand community land trusts, build permanently affordable family residences, and eliminate local food desert disparities.",
    formOfAppeal: "In dedicated service to community dignity,",
    imageUrl: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=900&q=80",
    filename: "letter_welfare.jpg"
  },

  // 14. Project Management
  {
    catName: "Project Management",
    subName: "Public (General)",
    title: "Best Practices for Ethical, Transparent, and Sustainable Project Execution",
    greetings: "To Project Directors, Engineering Leads, and Operations Executives,",
    introduction: "Flawless project governance balances fiscal prudence with human-centric team sustainability.",
    body: "By implementing open milestone tracking, proactive risk mitigation frameworks, and sustainable resource procurement, organizations achieve enduring project success.",
    formOfAppeal: "With professional dedication,",
    imageUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=900&q=80",
    filename: "letter_pm.jpg"
  },

  // 15. Women Empowment
  {
    catName: "Women Empowment",
    subName: "Public (General)",
    title: "Breaking Systemic Barriers: Accelerating Women's Leadership in STEM & Governance",
    greetings: "To Global Leaders, Corporate Boards, and Civic Organizations,",
    introduction: "Equitable female participation in decision-making roles accelerates economic resilience and social justice.",
    body: "We call for equal pay transparency, dedicated venture funding for female-founded tech enterprises, and comprehensive maternal leadership support.",
    formOfAppeal: "In unwavering solidarity,",
    imageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=900&q=80",
    filename: "letter_women.jpg"
  },

  // 16. Fitness & Health
  {
    catName: "Fitness & Health",
    subName: "Public (General)",
    title: "Universal Access to Preventive Health Care and Mental Wellness Initiatives",
    greetings: "To Public Health Officials and Medical Care Providers,",
    introduction: "A healthy society begins with proactive wellness education, accessible recreation facilities, and compassionate mental health support.",
    body: "We urge municipal leaders to expand public outdoor fitness parks, fund school mental wellness counselors, and subsidize fresh agricultural produce for low-income families.",
    formOfAppeal: "For a healthier, vibrant tomorrow,",
    imageUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=900&q=80",
    filename: "letter_health.jpg"
  },

  // 17. Religion
  {
    catName: "Religion",
    subName: "Public (General)",
    title: "Nurturing Interfaith Harmony, Mutual Respect, and Collaborative Charity",
    greetings: "To Faith Communities and Spiritual Leaders Worldwide,",
    introduction: "Across diverse spiritual traditions, compassion, charity, and love for one's neighbor unite our shared humanity.",
    body: "We invite all faith communities to host joint charitable food drives, preserve historical sacred sites collaboratively, and champion mutual understanding.",
    formOfAppeal: "With prayers for peace and unity,",
    imageUrl: "https://images.unsplash.com/photo-1519817650390-64a93db51149?w=900&q=80",
    filename: "letter_religion.jpg"
  },

  // 18. Energy
  {
    catName: "Energy",
    subName: "Public (General)",
    title: "Accelerating the Clean Grid Transition: Solar, Wind, and Smart Storage",
    greetings: "To Energy Regulators, Utility Companies, and Green Innovators,",
    introduction: "Decarbonizing our energy grid is the defining economic and environmental opportunity of our century.",
    body: "We advocate for modernized distributed grid interconnects, accelerated community solar grants, and robust investment in long-duration thermal storage.",
    formOfAppeal: "Committed to clean renewable energy,",
    imageUrl: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=900&q=80",
    filename: "letter_energy.jpg"
  },

  // 19. Water
  {
    catName: "Water",
    subName: "Public (General)",
    title: "Securing Clean Drinking Water and Protecting Freshwater Aquifers",
    greetings: "To Water Resource Commissioners and Environmental Stewards,",
    introduction: "Access to clean, uncontaminated freshwater is an indispensable pillar of human survival and public health.",
    body: "We call for mandatory lead pipe replacements in all municipal systems, stringent penalties for industrial groundwater runoff, and advanced wetland restoration.",
    formOfAppeal: "In defense of our precious waters,",
    imageUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=900&q=80",
    filename: "letter_water.jpg"
  },

  // 20. Culture
  {
    catName: "Culture",
    subName: "Public (General)",
    title: "Safeguarding Cultural Pluralism and Multilingual Literature in Communities",
    greetings: "To Librarians, Cultural Ministries, and Community Center Directors,",
    introduction: "Cultural diversity enriches neighborhoods, fosters empathy, and sparks creative collaboration across generations.",
    body: "We propose expanding public library collections in heritage languages, funding community intercultural festivals, and archiving local neighborhood oral histories.",
    formOfAppeal: "Celebrating our diverse world,",
    imageUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=900&q=80",
    filename: "letter_culture.jpg"
  },

  // 21. Immigration
  {
    catName: "Immigration",
    subName: "Public (General)",
    title: "Dignified, Humane, and Efficient Pathways for Newcomers and Asylum Seekers",
    greetings: "To Immigration Officials and Human Rights Organizations,",
    introduction: "Welcoming newcomers with dignity and efficient legal processes strengthens our economies and enriches our civic fabric.",
    body: "We advocate for streamlined work authorization permits, professional credential recognition programs, and robust language integration classes.",
    formOfAppeal: "With compassion and respect for all newcomers,",
    imageUrl: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=900&q=80",
    filename: "letter_immigration.jpg"
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
  console.log("✉ SEEDING OPEN LETTERS ACROSS ALL 21 CATEGORIES");
  console.log("==================================================");

  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

  // 1. Authenticate User
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

  const userId = loginJson.user.id;
  console.log(`✔ Authenticated! User ID: ${userId}`);

  // 2. Ensure signature exists in DB for user
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
  console.log(`✔ User Signature ID: ${sigId}`);

  // 3. Clear existing post_letters table
  await pool.query("TRUNCATE TABLE post_letters RESTART IDENTITY CASCADE;");
  await pool.query("TRUNCATE TABLE post_letters_images RESTART IDENTITY CASCADE;");
  console.log("✔ Truncated post_letters and post_letters_images tables (Zero duplicates).");

  // 4. Fetch Category & Subcategory IDs from database
  console.log("\n2. Fetching Open Letters categories and subcategories...");
  const catRows = (await pool.query("SELECT id, name FROM disc_category ORDER BY id")).rows;
  const subRows = (await pool.query("SELECT id, category_id, name FROM disc_sub_category ORDER BY id")).rows;

  console.log(`Found ${catRows.length} main categories and ${subRows.length} subcategories.`);

  // 5. Download media and publish letters
  console.log("\n3. Downloading media and inserting unique Open Letters...");
  let createdCount = 0;

  for (let i = 0; i < lettersCatalog.length; i++) {
    const item = lettersCatalog[i];

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
        false, true
      ]
    );

    const letterId = insertRes.rows[0].id;

    // Insert image into post_letters_images
    await pool.query(
      "INSERT INTO post_letters_images (letter_id, image, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())",
      [letterId, uploadedUrl]
    );

    console.log(`  ✔ [Letter ID: ${letterId}] "${item.title}"`);
    console.log(`      [${item.catName}] -> [${item.subName}]`);
    console.log(`      Image: ${uploadedUrl}\n`);
    createdCount++;
  }

  console.log("==================================================");
  console.log(`🎉 SUCCESS! Seeded ${createdCount} 100% unique Open Letters across all 21 categories!`);
  console.log("==================================================");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
