import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import pkg from "pg";
const { Pool } = pkg;

dotenv.config();

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3801";

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "user6",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "watchagocha-db",
  port: Number(process.env.DB_PORT) || 5432,
});

const photoPool = [
  `${BASE_URL}/fileUpload/7d700882-14ed-414d-bb78-9e985bcca4f0-1787576309179.jpg`,
  `${BASE_URL}/fileUpload/8da32a3f-d15c-484b-96d4-50ac127b085c-1787576309901.jpg`,
  `${BASE_URL}/fileUpload/9b2bfcba-dcc6-43f9-87dd-ab6fcc4443d6-1787576310855.jpg`,
  `${BASE_URL}/fileUpload/b7213c02-b520-4614-bdf3-5629441266f0-1787576311748.jpg`,
  `${BASE_URL}/fileUpload/e903046c-507d-43ab-b245-8f806b991232-1787576312627.jpg`,
  `${BASE_URL}/fileUpload/cdfdb5db-a1d6-4f54-9d36-d73bb6f57b2b-1787576313376.jpg`,
  `${BASE_URL}/fileUpload/f0eee8f4-a02a-479d-8e29-8e769c3b0898-1787576314260.jpg`,
  `${BASE_URL}/fileUpload/9cdab18d-83b5-42a6-80df-b9610e5431f8-1787576315055.jpg`,
  `${BASE_URL}/fileUpload/391e8252-bd7c-4043-a763-bc9586de1813-1787576315808.jpg`,
  `${BASE_URL}/fileUpload/e18dfee8-b757-4f39-93eb-f977cba86d40-1787576316466.jpg`,
  `${BASE_URL}/fileUpload/e0a1f8e4-f92c-4ae5-bcb5-108bdd2780cf-1787576317306.jpg`,
  `${BASE_URL}/fileUpload/99031503-e072-40f8-a60f-7438162b83a5-1787576317659.jpg`,
];

async function main() {
  console.log("==================================================");
  console.log("📰 ADDING UNCATEGORIZED TO ON-NEWS & SEEDING 6 RECORDS PER CATEGORY");
  console.log("==================================================");

  const userId = 2; // umarwebdeveloper920@gmail.com
  const client = await pool.connect();

  try {
    const newsCats = (await client.query("SELECT id, name FROM news_category ORDER BY id")).rows;
    console.log(`Found ${newsCats.length} main categories in news_category.`);

    let addedSubs = 0;
    let seededRecords = 0;

    for (const cat of newsCats) {
      // 1. Ensure Uncategorized subcategory exists
      let uncatSub = (
        await client.query(
          "SELECT id FROM news_sub_category WHERE category_id = $1 AND name ILIKE '%uncategorized%'",
          [cat.id]
        )
      ).rows[0];

      if (!uncatSub) {
        const insSub = await client.query(
          'INSERT INTO news_sub_category (category_id, name, french_name, "index", created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id',
          [cat.id, "Uncategorized", "Non classé", 99]
        );
        uncatSub = insSub.rows[0];
        addedSubs++;
      }

      // 2. Ensure at least 6 records exist for this Uncategorized subcategory
      const existingCount = Number(
        (
          await client.query(
            "SELECT count(*) FROM news WHERE category = $1 AND sub_category = $2",
            [cat.id, uncatSub.id]
          )
        ).rows[0].count
      );

      const toAdd = Math.max(0, 6 - existingCount);
      for (let r = 1; r <= toAdd; r++) {
        const photo = photoPool[(cat.id * 6 + r) % photoPool.length];
        const title = `${cat.name} General Dispatch: Uncategorized Special Feature #${r}`;
        const desc = `Investigative editorial news coverage highlighting cross-sector developments and civic insights in ${cat.name}.`;

        await client.query(
          `INSERT INTO news (
            user_id, name, description, category, sub_category,
            image, type, status, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, 'image', 'approved', NOW() - ($7 || ' minutes')::interval, NOW() - ($7 || ' minutes')::interval
          )`,
          [userId, title, desc, cat.id, uncatSub.id, photo, (50 - r)]
        );
        seededRecords++;
      }
    }

    console.log(`✔ Added ${addedSubs} 'Uncategorized' subcategories to news_sub_category.`);
    console.log(`✔ Seeded ${seededRecords} news articles against Uncategorized subcategories across all 18 categories.`);

  } finally {
    client.release();
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
