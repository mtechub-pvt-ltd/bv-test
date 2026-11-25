import pool from "../db.config/index.js";
import { clearAllCache } from "../utils/cacheService.js";

async function seedBusinessAndSocial() {
  console.log("🚀 Seeding Videos, Top Videos, and Banners for Business & Social & Cultural Categories...");

  try {
    // 1. Fetch available media sets from existing videos
    const mediaQuery = await pool.query(
      `SELECT DISTINCT video, thumbnail 
       FROM xpi_videos 
       WHERE video IS NOT NULL AND video != '' AND thumbnail IS NOT NULL AND thumbnail != '' 
       LIMIT 40`
    );
    const mediaList = mediaQuery.rows;
    if (mediaList.length === 0) {
      throw new Error("No media found to clone from xpi_videos");
    }

    // 2. Fetch users
    const usersRes = await pool.query("SELECT id FROM users ORDER BY id ASC LIMIT 5");
    const userIds = usersRes.rows.map((u) => u.id);
    const defaultUserId = userIds[0] || 1;

    // 3. Update all existing top_video titles & descriptions to match their category names
    const allCats = await pool.query("SELECT id, name FROM video_category ORDER BY id ASC");
    for (const cat of allCats.rows) {
      const topExists = await pool.query(
        "SELECT id FROM top_video WHERE video_category = $1",
        [cat.id]
      );
      const media = mediaList[cat.id % mediaList.length];

      if (topExists.rows.length > 0) {
        await pool.query(
          `UPDATE top_video 
           SET name = $1, description = $2, updated_at = NOW() 
           WHERE video_category = $3`,
          [
            `Top Featured ${cat.name} Showcase`,
            `Trending premier showcase in ${cat.name}`,
            cat.id,
          ]
        );
      } else {
        await pool.query(
          `INSERT INTO top_video (name, description, video_category, video, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, NOW(), NOW())`,
          [
            `Top Featured ${cat.name} Showcase`,
            `Trending premier showcase in ${cat.name}`,
            cat.id,
            media.video,
          ]
        );
        console.log(`✔ Created top_video for Category ${cat.id}: "${cat.name}"`);
      }
    }

    // 4. Ensure banners exist for categories 20 and 21
    const bannerImage =
      "https://wocha-gocha.testing.mtechub.org/fileUpload/ea717f8a-6aa2-4d78-9c6d-ffd87fc495b3-1787810805053.png";

    for (const catId of [20, 21]) {
      const bannerCheck = await pool.query(
        "SELECT id FROM banner WHERE category_table = 'video_category' AND category_id = $1",
        [catId]
      );
      if (bannerCheck.rows.length === 0) {
        await pool.query(
          `INSERT INTO banner 
           (image, user_id, banner_link, category_table, category_id, price, startdate, enddate, status, top_banner, paid_status, created_at, updated_at, transaction_id) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW(), $12)`,
          [
            bannerImage,
            defaultUserId,
            "https://wotchagotcha.com/video-mania",
            "video_category",
            catId,
            "150",
            "2026-01-01",
            "2030-12-31",
            "active",
            true,
            true,
            `tx_pro_banner_video_category_${catId}`,
          ]
        );
        console.log(`✔ Created banner for video_category ID ${catId}`);
      }
    }

    // 5. Seed xpi_videos for categories 20 and 21
    const targetCats = [
      {
        id: 20,
        name: "Business",
        subDetails: {
          "Pi Vids": [
            "Quick Business Startup Pitch",
            "60-Second Market Analysis",
            "Executive Leadership Tip",
            "Venture Capital Quick Insight",
            "Corporate Strategy Teaser",
            "Sales Conversion Hack",
            "Stock Market Flash Update",
            "Entrepreneur Daily Focus",
            "Branding in 2 Minutes",
            "Productivity Minute for Leaders",
          ],
          "4 - 23": [
            "Complete Business Plan Blueprint",
            "Tech Startup Journey & Scaling Strategies",
            "Modern B2B Marketing Masterclass",
            "Financial Modeling & Revenue Forecasting",
            "Venture Capital Funding Masterclass",
            "E-Commerce Growth Strategies for 2026",
            "Leadership & Organizational Management",
            "Negotiation Tactics for Founders",
            "Customer Acquisition at Scale",
            "Angel Investing Fundamentals",
          ],
          "24 – 65": [
            "In-Depth Corporate Financial Audit",
            "Global Supply Chain & Logistics Deep Dive",
            "Enterprise SaaS Architecture & Monetization",
            "Mergers & Acquisitions Master Workshop",
            "Digital Transformation in Banking",
            "International Trade Policy Analysis",
            "Strategic Venture Capital Summit",
            "Real Estate Portfolio Management",
            "Sustainable Business Models Analysis",
            "Executive Leadership Roundtable",
          ],
          "66⁺": [
            "Global Economic Forum: Future of Commerce",
            "World Business Leadership Conference Keynote",
            "Comprehensive MBA Corporate Strategy Course",
            "Macroeconomics & Global Monetary Policy",
            "Silicon Valley Investor Series Full Session",
            "Enterprise Leadership & Scaling Summit",
            "Future of AI in Enterprise Business",
            "International Business Law & Governance",
            "Global Venture Capital Symposium",
            "Sustainable Business Summit Keynote",
          ],
          "Uncategorized": [
            "General Business Resources & Tools",
            "Workplace Culture & Remote Collaboration",
            "Small Business Essential Checklist",
            "Freelance to Agency Transformation",
            "Modern Office Productivity Overview",
            "Creative Business Ideation",
            "Business Networking Best Practices",
            "Startup Ecosystem Overview",
            "General Entrepreneurial Wisdom",
            "Corporate Communications Standard",
          ],
        },
      },
      {
        id: 21,
        name: "Social & Cultural",
        subDetails: {
          "Pi Vids": [
            "Cultural Festival Flash Moment",
            "Traditional Folk Dance Highlight",
            "Street Music & Heritage Spotlight",
            "Community Celebration Short",
            "Indigenous Art in 60 Seconds",
            "Language Heritage Quick Clip",
            "Historic Monument Flash Tour",
            "Traditional Craft Speed Showcase",
            "Global Harmony Snapshot",
            "Local Tradition Glimpse",
          ],
          "4 - 23": [
            "Living Cultural Traditions Around the World",
            "Community Voices & Cultural Heritage",
            "Art & Social Movements Through History",
            "Folklore, Myths, and Ancient Storytelling",
            "Exploring World Religions & Architecture",
            "Anthropology & Modern Society Interactions",
            "Youth Culture in Global Megacities",
            "Indigenous Communities & Preservation",
            "Music as a Cultural Bridge Across Nations",
            "Culinary Traditions and Cultural Heritage",
          ],
          "24 – 65": [
            "Comprehensive Cultural Anthropology Documentary",
            "Global Social Movements & Transformations",
            "World Heritage Sites: History & Preservation",
            "Traditional Music & Performing Arts Archives",
            "Sociology of Digital Communities in the 21st Century",
            "Indigenous Wisdom & Environmental Stewardship",
            "Language Preservation & Global Diversity",
            "Cross-Cultural Dialogue & Globalization",
            "The Evolution of Folk Traditions in Modern Times",
            "World Cultures and Civilization Origins",
          ],
          "66⁺": [
            "World Cultural Heritage Symposium",
            "Full-Length Global Civilization Master Series",
            "International Social Sciences Conference",
            "Preservation of Intangible Cultural Heritage Summit",
            "Global Human Geography & Migration Archive",
            "Cultural Diversity & Global Unity Symposium",
            "Oral Histories of Indigenous Nations Series",
            "World Traditions & Customs Grand Showcase",
            "Cross-Cultural Anthropology Master Lecture",
            "Global Humanities & Social Heritage Forum",
          ],
          "Uncategorized": [
            "General Cultural Resources & Archives",
            "Community Engagement & Social Initiatives",
            "Cultural Exchange Overview",
            "Local Traditions Compendium",
            "Social Development Case Studies",
            "Cross-Cultural Communication Basics",
            "General Heritage Collections",
            "Community Arts Showcase",
            "Global Perspectives Collection",
            "Cultural Exploration Miscellaneous",
          ],
        },
      },
    ];

    let totalCreated = 0;

    for (const cat of targetCats) {
      // Fetch subcategories for this category
      const subsRes = await pool.query(
        "SELECT id, name, index FROM video_sub_category WHERE category_id = $1 ORDER BY index ASC",
        [cat.id]
      );
      const subs = subsRes.rows;

      for (const sub of subs) {
        const titles = cat.subDetails[sub.name] || [
          `${cat.name} ${sub.name} Video 1`,
          `${cat.name} ${sub.name} Video 2`,
          `${cat.name} ${sub.name} Video 3`,
          `${cat.name} ${sub.name} Video 4`,
          `${cat.name} ${sub.name} Video 5`,
          `${cat.name} ${sub.name} Video 6`,
          `${cat.name} ${sub.name} Video 7`,
          `${cat.name} ${sub.name} Video 8`,
          `${cat.name} ${sub.name} Video 9`,
          `${cat.name} ${sub.name} Video 10`,
        ];

        for (let i = 0; i < titles.length; i++) {
          const media = mediaList[(cat.id * 10 + sub.id * 5 + i) % mediaList.length];
          const user_id = userIds[i % userIds.length] || defaultUserId;
          const title = titles[i];
          const desc = `Engaging video feature exploring ${title.toLowerCase()} in ${cat.name} (${sub.name}).`;

          await pool.query(
            `INSERT INTO xpi_videos 
             (user_id, name, description, video_category, sub_category, video, thumbnail, top, status, created_at, updated_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() - ($10 || ' hours')::interval, NOW() - ($10 || ' hours')::interval)`,
            [
              user_id,
              title,
              desc,
              cat.id,
              sub.id,
              media.video,
              media.thumbnail,
              false,
              "approved",
              i * 2 + 1,
            ]
          );
          totalCreated++;
        }
        console.log(`✔ Seeded ${titles.length} videos for Category "${cat.name}" -> Subcategory "${sub.name}" (ID: ${sub.id})`);
      }
    }

    clearAllCache();
    console.log(`\n🎉 Successfully created ${totalCreated} videos across Business and Social & Cultural!`);

    // Verify counts in DB
    const counts = await pool.query(
      `SELECT c.id, c.name, COUNT(v.id) as video_count 
       FROM video_category c 
       LEFT JOIN xpi_videos v ON c.id = v.video_category 
       GROUP BY c.id, c.name 
       ORDER BY c.index ASC`
    );
    console.log("\n📊 Final Video Counts Per Category:");
    console.table(counts.rows);

    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding videos:", err);
    process.exit(1);
  }
}

seedBusinessAndSocial();
