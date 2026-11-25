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

// Existing verified uploaded video sets on localhost:3801
const videoSets = [
  { video: `${BASE_URL}/fileUpload/21c26be5-df59-47f3-b1a1-ff66af67b76e-1787575321474.mp4`, thumbnail: `${BASE_URL}/fileUpload/fef00092-3ee4-48d1-a787-b8889c25b123-1787575321504.png` },
  { video: `${BASE_URL}/fileUpload/467d36b0-a5ea-47b2-8f4d-d25f90efeb5a-1787575321780.mp4`, thumbnail: `${BASE_URL}/fileUpload/e2fd54d2-62ba-46ff-8c7d-2438d99c456c-1787575322048.png` },
  { video: `${BASE_URL}/fileUpload/78913eeb-75c7-4726-ad80-1a1ba1c886d9-1787575322064.mp4`, thumbnail: `${BASE_URL}/fileUpload/43aff997-e683-42ea-939d-2c1e25c9ddff-1787575322082.png` },
  { video: `${BASE_URL}/fileUpload/505d0f90-222c-4221-b285-a92c2dc73c9f-1787575322269.mp4`, thumbnail: `${BASE_URL}/fileUpload/69fb0d4b-5258-49a1-bb50-eda3c9fcfde7-1787575322462.png` },
  { video: `${BASE_URL}/fileUpload/37715f3d-f835-4c71-8adb-4a57fb3042bb-1787575322612.mp4`, thumbnail: `${BASE_URL}/fileUpload/d1456692-0d82-46ad-932c-22c930e6c485-1787575322842.png` },
  { video: `${BASE_URL}/fileUpload/2e273f77-ad17-449d-843a-538cec1b3c41-1787575322850.mp4`, thumbnail: `${BASE_URL}/fileUpload/2351b720-dc4a-4ee5-8e87-0229e5e8f431-1787575322855.png` },
  { video: `${BASE_URL}/fileUpload/de97334c-546a-485d-8890-974418d5453e-1787575322868.mp4`, thumbnail: `${BASE_URL}/fileUpload/6b2075e0-d12d-475a-8743-0f8e4a1cf9e7-1787575322884.png` },
  { video: `${BASE_URL}/fileUpload/0476cc2c-7ed8-4577-bf5d-5e892311dedc-1787575322981.mp4`, thumbnail: `${BASE_URL}/fileUpload/5a9846ce-2576-424c-8b86-f0b74c995cd9-1787575323041.png` },
];

// Curated high-resolution uploaded images on localhost:3801
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

const batchInsert = async (client, queryText, valuesArray, chunkSize = 200) => {
  for (let i = 0; i < valuesArray.length; i += chunkSize) {
    const chunk = valuesArray.slice(i, i + chunkSize);
    const placeholders = chunk
      .map(
        (row, rIdx) =>
          `(${row.map((_, cIdx) => `$${rIdx * row.length + cIdx + 1}`).join(", ")})`
      )
      .join(", ");
    const flatValues = chunk.flat();
    await client.query(`${queryText} ${placeholders};`, flatValues);
  }
};

async function main() {
  console.log("==================================================");
  console.log("🚀 SEEDING 6 RECORDS PER SUBCATEGORY ACROSS ALL 13 MODULES");
  console.log("==================================================");

  const userId = 2; // umarwebdeveloper920@gmail.com
  const client = await pool.connect();

  try {
    // Signature check for Open Letters
    let sigId;
    const sigRes = await client.query("SELECT id FROM signature WHERE user_id = $1 LIMIT 1", [userId]);
    if (sigRes.rows.length > 0) sigId = sigRes.rows[0].id;
    else {
      const newSig = await client.query("INSERT INTO signature (user_id, image, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING id", [userId, `${BASE_URL}/fileUpload/default_sig.png`]);
      sigId = newSig.rows[0].id;
    }

    // ----------------------------------------------------
    // 1. VIDEO MANIA (76 subcategories -> 456 records)
    // ----------------------------------------------------
    console.log("\n1. Seeding Video Mania (6 records per subcategory)...");
    await client.query("TRUNCATE TABLE xpi_videos RESTART IDENTITY CASCADE;");
    await client.query("TRUNCATE TABLE top_video RESTART IDENTITY CASCADE;");
    const xpiCats = (await client.query("SELECT id, name FROM video_category ORDER BY id")).rows;
    const xpiSubs = (await client.query("SELECT id, category_id, name FROM video_sub_category ORDER BY id")).rows;

    const xpiRows = [];
    let xpiCounter = 0;
    for (const sub of xpiSubs) {
      const cat = xpiCats.find((c) => c.id === sub.category_id) || { name: "Video" };
      for (let r = 1; r <= 6; r++) {
        xpiCounter++;
        const media = videoSets[(sub.id * 6 + r) % videoSets.length];
        const title = `${cat.name} ${sub.name}: Dynamic Visual Feature #${r}`;
        const desc = `Ultra HD video production showcasing authentic movement and creative moments in ${cat.name} (${sub.name}).`;
        xpiRows.push([
          userId,
          title,
          desc,
          sub.category_id,
          sub.id,
          media.video,
          media.thumbnail,
          "approved",
          new Date(Date.now() - (460 - xpiCounter) * 60000),
          new Date(Date.now() - (460 - xpiCounter) * 60000),
        ]);
      }
    }
    await batchInsert(
      client,
      "INSERT INTO xpi_videos (user_id, name, description, video_category, sub_category, video, thumbnail, status, created_at, updated_at) VALUES",
      xpiRows
    );

    // Seed top video for each category
    for (const cat of xpiCats) {
      const media = videoSets[cat.id % videoSets.length];
      await client.query(
        "INSERT INTO top_video (name, description, video_category, video, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())",
        [`Top Featured ${cat.name} Showcase`, `Trending premier showcase in ${cat.name}`, cat.id, media.video]
      );
    }
    console.log(`✔ Video Mania: ${xpiRows.length} records across ${xpiSubs.length} subcategories.`);

    // ----------------------------------------------------
    // 2. PIC TOURS (76 subcategories -> 456 records)
    // ----------------------------------------------------
    console.log("\n2. Seeding Pic Tours (6 records per subcategory)...");
    await client.query("TRUNCATE TABLE pic_tours RESTART IDENTITY CASCADE;");
    await client.query("TRUNCATE TABLE top_tours RESTART IDENTITY CASCADE;");
    const picCats = (await client.query("SELECT id, name FROM pic_category ORDER BY id")).rows;
    const picSubs = (await client.query("SELECT id, category_id, name FROM pic_sub_category ORDER BY id")).rows;

    const picRows = [];
    let picCounter = 0;
    for (const sub of picSubs) {
      const cat = picCats.find((c) => c.id === sub.category_id) || { name: "Pic" };
      for (let r = 1; r <= 6; r++) {
        picCounter++;
        const photo = photoPool[(sub.id * 6 + r) % photoPool.length];
        const title = `${cat.name} ${sub.name}: Fine Art Photographic Capture #${r}`;
        const desc = `Award-winning landscape and portrait photography celebrating ${cat.name} in the ${sub.name} tour style.`;
        picRows.push([
          userId,
          title,
          desc,
          sub.category_id,
          sub.id,
          photo,
          "approved",
          new Date(Date.now() - (460 - picCounter) * 60000),
          new Date(Date.now() - (460 - picCounter) * 60000),
        ]);
      }
    }
    await batchInsert(
      client,
      "INSERT INTO pic_tours (user_id, name, description, pic_category, sub_category, image, status, created_at, updated_at) VALUES",
      picRows
    );

    for (const cat of picCats) {
      const photo = photoPool[cat.id % photoPool.length];
      await client.query(
        "INSERT INTO top_tours (name, description, pic_category, image, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())",
        [`Top ${cat.name} Photographic Tour`, `Premier scenic capture in ${cat.name}`, cat.id, photo]
      );
    }
    console.log(`✔ Pic Tours: ${picRows.length} records across ${picSubs.length} subcategories.`);

    // ----------------------------------------------------
    // 3. ON-NEWS (450 subcategories -> 2,700 records)
    // ----------------------------------------------------
    console.log("\n3. Seeding On-News (6 records per subcategory)...");
    await client.query("TRUNCATE TABLE news RESTART IDENTITY CASCADE;");
    await client.query("TRUNCATE TABLE top_news RESTART IDENTITY CASCADE;");
    const newsCats = (await client.query("SELECT id, name FROM news_category ORDER BY id")).rows;
    const newsSubs = (await client.query("SELECT id, category_id, name FROM news_sub_category ORDER BY id")).rows;

    const newsRows = [];
    let newsCounter = 0;
    for (const sub of newsSubs) {
      const cat = newsCats.find((c) => c.id === sub.category_id) || { name: "News" };
      for (let r = 1; r <= 6; r++) {
        newsCounter++;
        const photo = photoPool[(sub.id * 6 + r) % photoPool.length];
        const title = `${cat.name} ${sub.name}: In-Depth Special Dispatch #${r}`;
        const desc = `Investigative reporting on critical developments and economic reforms impacting ${cat.name} across ${sub.name}.`;
        newsRows.push([
          userId,
          title,
          desc,
          sub.category_id,
          sub.id,
          photo,
          "image",
          "approved",
          new Date(Date.now() - (2710 - newsCounter) * 20000),
          new Date(Date.now() - (2710 - newsCounter) * 20000),
        ]);
      }
    }
    await batchInsert(
      client,
      "INSERT INTO news (user_id, name, description, category, sub_category, image, type, status, created_at, updated_at) VALUES",
      newsRows
    );

    for (const cat of newsCats) {
      const photo = photoPool[cat.id % photoPool.length];
      await client.query(
        "INSERT INTO top_news (description, disc_category, image, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())",
        [`Leading headline report on ${cat.name}`, cat.id, photo]
      );
    }
    console.log(`✔ On-News: ${newsRows.length} records across ${newsSubs.length} subcategories.`);

    // ----------------------------------------------------
    // 4. SPORT & SPORT (100 subcategories -> 600 records)
    // ----------------------------------------------------
    console.log("\n4. Seeding Sport & Sport (6 records per subcategory)...");
    await client.query("TRUNCATE TABLE sports RESTART IDENTITY CASCADE;");
    const sportCats = (await client.query("SELECT id, name FROM sports_category ORDER BY id")).rows;
    const sportSubs = (await client.query("SELECT id, category_id, name FROM sport_sub_category ORDER BY id")).rows;

    const sportRows = [];
    let sportCounter = 0;
    for (const sub of sportSubs) {
      const cat = sportCats.find((c) => c.id === sub.category_id) || { name: "Sports" };
      for (let r = 1; r <= 6; r++) {
        sportCounter++;
        const photo = photoPool[(sub.id * 6 + r) % photoPool.length];
        const title = `${cat.name} ${sub.name}: Championship Tournament Round #${r}`;
        const desc = `Intense athletic match and tactical masterclass in ${cat.name} featuring ${sub.name} top competitors.`;
        sportRows.push([
          userId,
          title,
          desc,
          sub.category_id,
          sub.id,
          photo,
          "image",
          new Date(Date.now() - (610 - sportCounter) * 60000),
          new Date(Date.now() - (610 - sportCounter) * 60000),
        ]);
      }
    }
    await batchInsert(
      client,
      "INSERT INTO sports (user_id, name, description, category_id, sub_category_id, image, type, created_at, updated_at) VALUES",
      sportRows
    );
    console.log(`✔ Sport & Sport: ${sportRows.length} records across ${sportSubs.length} subcategories.`);

    // ----------------------------------------------------
    // 5. OPEN LETTERS (105 subcategories -> 630 records)
    // ----------------------------------------------------
    console.log("\n5. Seeding Open Letters (6 records per subcategory)...");
    await client.query("TRUNCATE TABLE post_letters RESTART IDENTITY CASCADE;");
    await client.query("TRUNCATE TABLE post_letters_images RESTART IDENTITY CASCADE;");
    const discCats = (await client.query("SELECT id, name FROM disc_category ORDER BY id")).rows;
    const discSubs = (await client.query("SELECT id, category_id, name FROM disc_sub_category ORDER BY id")).rows;

    let letterCounter = 0;
    for (const sub of discSubs) {
      const cat = discCats.find((c) => c.id === sub.category_id) || { name: "Civic" };
      for (let r = 1; r <= 6; r++) {
        letterCounter++;
        const photo = photoPool[(sub.id * 6 + r) % photoPool.length];
        const title = `Civic Reform Appeal on ${cat.name} (${sub.name}) #${r}`;
        const greetings = `To the Public Servants and Delegates for ${cat.name},`;
        const intro = `Expressing citizen recommendations regarding sustainable advancement in ${cat.name} (${sub.name}).`;
        const body = `We advocate for enhanced institutional accountability, equitable resource distribution, and inclusive public stakeholder consultation across all civic initiatives. Our shared objective remains the sustainable empowerment of community members, ensuring transparent governance and impactful progress for current and future generations.`;
        const appeal = `Submitted in the shared interest of community prosperity,`;

        const ins = await client.query(
          `INSERT INTO post_letters (
            user_id, post_type, receiver_type, disc_category, disc_sub_category,
            name, address, email, contact_no, subject_place, post_date,
            greetings, introduction, body, form_of_appeal, signature_id,
            paid_status, top_letter, top_added_date, status, created_at, updated_at
          ) VALUES (
            $1, 'public', 'general', $2, $3,
            $4, 'Civic Boulevard Plaza', 'contact@wotchagotcha.com', '+1-800-555-0199', 'Global Forum', CURRENT_DATE,
            $5, $6, $7, $8, $9,
            false, $10, NOW(), 'approved', NOW() - ($11 || ' minutes')::interval, NOW() - ($11 || ' minutes')::interval
          ) RETURNING id`,
          [userId, sub.category_id, sub.id, title, greetings, intro, body, appeal, sigId, (r === 1), (650 - letterCounter)]
        );
        const letterId = ins.rows[0].id;
        await client.query(
          "INSERT INTO post_letters_images (letter_id, image, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())",
          [letterId, photo]
        );
      }
    }
    console.log(`✔ Open Letters: ${letterCounter} records across ${discSubs.length} subcategories.`);

    // ----------------------------------------------------
    // 6. TV PROGMAX (100 subcategories -> 600 records)
    // ----------------------------------------------------
    console.log("\n6. Seeding tvProgMax (6 records per subcategory)...");
    await client.query("TRUNCATE TABLE tv_progmax_videos RESTART IDENTITY CASCADE;");
    const tvCats = (await client.query("SELECT id, name FROM tv_progmax_category ORDER BY id")).rows;
    const tvSubs = (await client.query("SELECT id, category_id, name FROM tv_progmax_sub_category ORDER BY id")).rows;

    const tvRows = [];
    let tvCounter = 0;
    for (const sub of tvSubs) {
      const cat = tvCats.find((c) => c.id === sub.category_id) || { name: "TV" };
      for (let r = 1; r <= 6; r++) {
        tvCounter++;
        const media = videoSets[(sub.id * 6 + r) % videoSets.length];
        const title = `${cat.name} ${sub.name}: Broadcast Edition #${r}`;
        const desc = `Live television broadcast featuring interviews, breaking headlines, and series segments in ${cat.name}.`;
        tvRows.push([
          userId,
          title,
          desc,
          sub.category_id,
          sub.id,
          media.video,
          media.thumbnail,
          "approved",
          new Date(Date.now() - (610 - tvCounter) * 60000),
          new Date(Date.now() - (610 - tvCounter) * 60000),
        ]);
      }
    }
    await batchInsert(
      client,
      "INSERT INTO tv_progmax_videos (user_id, name, description, category_id, sub_category_id, video, thumbnail, status, created_at, updated_at) VALUES",
      tvRows
    );
    console.log(`✔ tvProgMax: ${tvRows.length} records across ${tvSubs.length} subcategories.`);

    // ----------------------------------------------------
    // 7. Q & A (442 subcategories -> 2,652 records)
    // ----------------------------------------------------
    console.log("\n7. Seeding Q & A (6 records per subcategory)...");
    await client.query("TRUNCATE TABLE qafi RESTART IDENTITY CASCADE;");
    const qafiCats = (await client.query("SELECT id, name FROM qafi_category ORDER BY id")).rows;
    const qafiSubs = (await client.query("SELECT id, category_id, name FROM qafi_sub_category ORDER BY id")).rows;

    const qafiRows = [];
    let qafiCounter = 0;
    for (const sub of qafiSubs) {
      const cat = qafiCats.find((c) => c.id === sub.category_id) || { name: "Q&A" };
      for (let r = 1; r <= 6; r++) {
        qafiCounter++;
        const photo = photoPool[(sub.id * 6 + r) % photoPool.length];
        const question = `What are the most impactful strategies and future milestones in ${cat.name} for ${sub.name} (Discussion Inquiry #${r})?`;
        qafiRows.push([
          userId,
          question,
          sub.category_id,
          sub.id,
          photo,
          "image",
          new Date(Date.now() - (2660 - qafiCounter) * 20000),
          new Date(Date.now() - (2660 - qafiCounter) * 20000),
        ]);
      }
    }
    await batchInsert(
      client,
      "INSERT INTO qafi (user_id, description, category, sub_category, image, type, created_at, updated_at) VALUES",
      qafiRows
    );
    console.log(`✔ Q & A: ${qafiRows.length} records across ${qafiSubs.length} subcategories.`);

    // ----------------------------------------------------
    // 8. LEARNING & HOBBIES (234 subcategories -> 1,404 records)
    // ----------------------------------------------------
    console.log("\n8. Seeding Learning & Hobbies (6 records per subcategory)...");
    await client.query("TRUNCATE TABLE learning_hobbies_videos RESTART IDENTITY CASCADE;");
    const learnCats = (await client.query("SELECT id, name FROM learning_hobbies_category ORDER BY id")).rows;
    const learnSubs = (await client.query("SELECT id, category_id, name FROM learning_hobbies_sub_category ORDER BY id")).rows;

    const learnRows = [];
    let learnCounter = 0;
    for (const sub of learnSubs) {
      const cat = learnCats.find((c) => c.id === sub.category_id) || { name: "Masterclass" };
      for (let r = 1; r <= 6; r++) {
        learnCounter++;
        const media = videoSets[(sub.id * 6 + r) % videoSets.length];
        const title = `${cat.name} ${sub.name}: Structured Tutorial Session #${r}`;
        const desc = `Educational masterclass course providing deep practical guidance in ${cat.name} (${sub.name}).`;
        learnRows.push([
          userId,
          title,
          desc,
          sub.category_id,
          sub.id,
          media.video,
          media.thumbnail,
          "approved",
          new Date(Date.now() - (1410 - learnCounter) * 30000),
          new Date(Date.now() - (1410 - learnCounter) * 30000),
        ]);
      }
    }
    await batchInsert(
      client,
      "INSERT INTO learning_hobbies_videos (user_id, name, description, category_id, sub_category_id, video, thumbnail, status, created_at, updated_at) VALUES",
      learnRows
    );
    console.log(`✔ Learning & Hobbies: ${learnRows.length} records across ${learnSubs.length} subcategories.`);

    // ----------------------------------------------------
    // 9. KID-VID (28 subcategories -> 168 records)
    // ----------------------------------------------------
    console.log("\n9. Seeding Kid-Vid (6 records per subcategory)...");
    await client.query("TRUNCATE TABLE kid_vids_videos RESTART IDENTITY CASCADE;");
    const kidCats = (await client.query("SELECT id, name FROM kid_vids_category ORDER BY id")).rows;
    const kidSubs = (await client.query("SELECT id, category_id, name FROM kid_vids_sub_category ORDER BY id")).rows;

    const kidRows = [];
    let kidCounter = 0;
    for (const sub of kidSubs) {
      const cat = kidCats.find((c) => c.id === sub.category_id) || { name: "KidVid" };
      for (let r = 1; r <= 6; r++) {
        kidCounter++;
        const media = videoSets[(sub.id * 6 + r) % videoSets.length];
        const title = `${cat.name} ${sub.name}: Cheerful Kids Storytime #${r}`;
        const desc = `Delightful family-friendly animated children's video in ${cat.name} (${sub.name}).`;
        kidRows.push([
          userId,
          title,
          desc,
          sub.category_id,
          sub.id,
          media.video,
          media.thumbnail,
          "approved",
          new Date(Date.now() - (175 - kidCounter) * 60000),
          new Date(Date.now() - (175 - kidCounter) * 60000),
        ]);
      }
    }
    await batchInsert(
      client,
      "INSERT INTO kid_vids_videos (user_id, name, description, category_id, sub_category_id, video, thumbnail, status, created_at, updated_at) VALUES",
      kidRows
    );
    console.log(`✔ Kid-Vid: ${kidRows.length} records across ${kidSubs.length} subcategories.`);

    // ----------------------------------------------------
    // 10. FAN-STAR ZONE (32 subcategories -> 192 records)
    // ----------------------------------------------------
    console.log("\n10. Seeding Fan-Star Zone (6 records per subcategory)...");
    await client.query("TRUNCATE TABLE fan_star_videos RESTART IDENTITY CASCADE;");
    const fanCats = (await client.query("SELECT id, name FROM fan_star_category ORDER BY id")).rows;
    const fanSubs = (await client.query("SELECT id, category_id, name FROM fan_star_sub_category ORDER BY id")).rows;

    const fanRows = [];
    let fanCounter = 0;
    for (const sub of fanSubs) {
      const cat = fanCats.find((c) => c.id === sub.category_id) || { name: "FanStar" };
      for (let r = 1; r <= 6; r++) {
        fanCounter++;
        const media = videoSets[(sub.id * 6 + r) % videoSets.length];
        const title = `${cat.name} ${sub.name}: Viral Celebrity Spotlight #${r}`;
        const desc = `Top-trending fan community showcase and celebrity highlights in ${cat.name} (${sub.name}).`;
        fanRows.push([
          userId,
          title,
          desc,
          sub.category_id,
          sub.id,
          media.video,
          media.thumbnail,
          "video",
          "approved",
          new Date(Date.now() - (200 - fanCounter) * 60000),
          new Date(Date.now() - (200 - fanCounter) * 60000),
        ]);
      }
    }
    await batchInsert(
      client,
      "INSERT INTO fan_star_videos (user_id, name, description, category_id, sub_category_id, video, thumbnail, type, status, created_at, updated_at) VALUES",
      fanRows
    );
    console.log(`✔ Fan-Star Zone: ${fanRows.length} records across ${fanSubs.length} subcategories.`);

    // ----------------------------------------------------
    // 11. CINEMATIC (50 subcategories -> 300 records)
    // ----------------------------------------------------
    console.log("\n11. Seeding Cinematic (6 records per subcategory)...");
    await client.query("TRUNCATE TABLE cinematics_videos RESTART IDENTITY CASCADE;");
    const cineCats = (await client.query("SELECT id, name FROM cinematics_category ORDER BY id")).rows;
    const cineSubs = (await client.query("SELECT id, category_id, name FROM cinematics_sub_category ORDER BY id")).rows;

    const cineRows = [];
    let cineCounter = 0;
    for (const sub of cineSubs) {
      const cat = cineCats.find((c) => c.id === sub.category_id) || { name: "Cinema" };
      for (let r = 1; r <= 6; r++) {
        cineCounter++;
        const media = videoSets[(sub.id * 6 + r) % videoSets.length];
        const title = `${cat.name} ${sub.name}: Feature Film Premiere #${r}`;
        const desc = `Master cinematic film feature in the ${cat.name} genre with premier direction and sound design.`;
        cineRows.push([
          userId,
          title,
          desc,
          sub.category_id,
          sub.id,
          media.video,
          media.thumbnail,
          "approved",
          new Date(Date.now() - (310 - cineCounter) * 60000),
          new Date(Date.now() - (310 - cineCounter) * 60000),
        ]);
      }
    }
    await batchInsert(
      client,
      "INSERT INTO cinematics_videos (user_id, name, description, category_id, sub_category_id, video, thumbnail, status, created_at, updated_at) VALUES",
      cineRows
    );
    console.log(`✔ Cinematic: ${cineRows.length} records across ${cineSubs.length} subcategories.`);

    // ----------------------------------------------------
    // 12. EBIC (45 subcategories -> 270 records)
    // ----------------------------------------------------
    console.log("\n12. Seeding EBIC (6 records per subcategory)...");
    await client.query("TRUNCATE TABLE gebc RESTART IDENTITY CASCADE;");
    await client.query("TRUNCATE TABLE top_gebc RESTART IDENTITY CASCADE;");
    const gebcCats = (await client.query("SELECT id, name FROM gebc_category ORDER BY id")).rows;
    const gebcSubs = (await client.query("SELECT id, category_id, name FROM gebc_sub_category ORDER BY id")).rows;

    const gebcRows = [];
    let gebcCounter = 0;
    for (const sub of gebcSubs) {
      const cat = gebcCats.find((c) => c.id === sub.category_id) || { name: "EBIC" };
      for (let r = 1; r <= 6; r++) {
        gebcCounter++;
        const photo = photoPool[(sub.id * 6 + r) % photoPool.length];
        const name = `${cat.name} ${sub.name} Emblem #${r}`;
        const desc = `Expressive ${cat.name} (${sub.name}) emotion badge and symbol celebrating human connectivity.`;
        gebcRows.push([
          userId,
          name,
          desc,
          sub.category_id,
          sub.id,
          photo,
          "approved",
          new Date(Date.now() - (280 - gebcCounter) * 60000),
          new Date(Date.now() - (280 - gebcCounter) * 60000),
        ]);
      }
    }
    await batchInsert(
      client,
      "INSERT INTO gebc (user_id, name, description, category, sub_category, image, status, created_at, updated_at) VALUES",
      gebcRows
    );

    for (const cat of gebcCats) {
      const photo = photoPool[cat.id % photoPool.length];
      await client.query(
        "INSERT INTO top_gebc (description, disc_category, image, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())",
        [`Top ${cat.name} Emblem Pack`, cat.id, photo]
      );
    }
    console.log(`✔ EBIC: ${gebcRows.length} records across ${gebcSubs.length} subcategories.`);

    // ----------------------------------------------------
    // 13. MONDO MARKET (20 subcategories -> 120 records)
    // ----------------------------------------------------
    console.log("\n13. Seeding Mondo Market (6 records per subcategory)...");
    await client.query("TRUNCATE TABLE item RESTART IDENTITY CASCADE;");
    await client.query("TRUNCATE TABLE item_images RESTART IDENTITY CASCADE;");
    const marketCats = (await client.query("SELECT id, name FROM item_category ORDER BY id")).rows;
    const marketSubs = (await client.query("SELECT id, category_id, name FROM item_sub_category ORDER BY id")).rows;

    const conditions = ["new", "used_Like_new", "used_Good", "used_Fair"];
    const citiesByRegion = {
      Europe: [{ city: "London", country: "United Kingdom", code: "GB", region: "europe" }, { city: "Paris", country: "France", code: "FR", region: "europe" }, { city: "Berlin", country: "Germany", code: "DE", region: "europe" }, { city: "Rome", country: "Italy", code: "IT", region: "europe" }],
      Africa: [{ city: "Nairobi", country: "Kenya", code: "KE", region: "africa" }, { city: "Cape Town", country: "South Africa", code: "ZA", region: "africa" }, { city: "Cairo", country: "Egypt", code: "EG", region: "africa" }],
      Americas: [{ city: "New York", country: "United States", code: "US", region: "americas" }, { city: "Toronto", country: "Canada", code: "CA", region: "americas" }, { city: "São Paulo", country: "Brazil", code: "BR", region: "americas" }],
      Asia: [{ city: "Tokyo", country: "Japan", code: "JP", region: "asia" }, { city: "Seoul", country: "South Korea", code: "KR", region: "asia" }, { city: "Singapore", country: "Singapore", code: "SG", region: "asia" }],
      "Middle-East": [{ city: "Dubai", country: "United Arab Emirates", code: "AE", region: "middle-east" }, { city: "Doha", country: "Qatar", code: "QA", region: "middle-east" }, { city: "Riyadh", country: "Saudi Arabia", code: "SA", region: "middle-east" }]
    };

    let marketCounter = 0;
    for (const sub of marketSubs) {
      const cat = marketCats.find((c) => c.id === sub.category_id) || { name: "Market" };
      const locList = citiesByRegion[cat.name] || [{ city: "Global City", country: "Global", code: "GL", region: "global" }];

      for (let r = 1; r <= 6; r++) {
        marketCounter++;
        const loc = locList[(sub.id + r) % locList.length];
        const photo = photoPool[(sub.id * 6 + r) % photoPool.length];
        const cond = conditions[(r - 1) % conditions.length];
        const price = String(80 * r + (sub.id * 25));
        const title = `${cat.name} ${sub.name}: Premium Merchant Item #${r}`;
        const desc = `Authentic verified listing offering high-quality ${sub.name} goods in ${loc.city}, ${loc.country}.`;

        const ins = await client.query(
          `INSERT INTO item (
            user_id, item_category, sub_category, title, description,
            price, condition, location, city, state, region,
            country, country_code, top_post, top_added_date, paid_status,
            status, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10, $11,
            $12, $13, $14, NOW(), true,
            'approved', NOW() - ($15 || ' minutes')::interval, NOW() - ($15 || ' minutes')::interval
          ) RETURNING id`,
          [
            userId, sub.category_id, sub.id, title, desc,
            price, cond, loc.city, loc.city, loc.city, loc.region,
            loc.country, loc.code, (r === 1), (130 - marketCounter)
          ]
        );
        const itemId = ins.rows[0].id;
        await client.query(
          "INSERT INTO item_images (item_id, image, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())",
          [itemId, photo]
        );
      }
    }
    console.log(`✔ Mondo Market: ${marketCounter} records across ${marketSubs.length} subcategories.`);

    console.log("\n==================================================");
    console.log("🎉 ALL 13 MODULES POPULATED WITH 6 RECORDS PER SUBCATEGORY!");
    console.log("==================================================");
  } finally {
    client.release();
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
