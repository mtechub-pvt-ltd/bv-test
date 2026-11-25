import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import pkg from "pg";
const { Pool } = pkg;

dotenv.config();

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3801";
const realMediaDir = "/Users/user6/.gemini/antigravity-ide/brain/72b27b92-c930-4c90-844c-3fefdb5573b7/scratch/real_live_media";
const exactThumbsDir = "/Users/user6/.gemini/antigravity-ide/brain/72b27b92-c930-4c90-844c-3fefdb5573b7/scratch/exact_video_thumbs";
const scratchDir = "/Users/user6/.gemini/antigravity-ide/brain/72b27b92-c930-4c90-844c-3fefdb5573b7/scratch/bulk_media";

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "user6",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "watchagocha-db",
  port: Number(process.env.DB_PORT) || 5432,
});

const verifiedVideos = [
  { videoFile: "cinematic_dragon_quest.mp4", thumbFile: "cinematic_dragon_quest.mp4.png" },
  { videoFile: "african_elephants.mp4", thumbFile: "african_elephants.mp4.png" },
  { videoFile: "urban_city_motion.mp4", thumbFile: "urban_city_motion.mp4.png" },
  { videoFile: "sea_turtle_ocean.mp4", thumbFile: "sea_turtle_ocean.mp4.png" },
  { videoFile: "snow_horses_wild.mp4", thumbFile: "snow_horses_wild.mp4.png" },
  { videoFile: "music_dance_friday.mp4", thumbFile: "music_dance_friday.mp4.png" },
  { videoFile: "nature_flower_bloom.mp4", thumbFile: "nature_flower_bloom.mp4.png" },
  { videoFile: "dog_pet_play.mp4", thumbFile: "dog_pet_play.mp4.png" }
];

async function uploadFileViaApi(filePath, filename, isVideo = false) {
  const fileBuffer = fs.readFileSync(filePath);
  const mimeType = isVideo ? "video/mp4" : "image/jpeg";
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

// Global photo pool across different domains
const photoPool = [
  "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=900&q=80",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=900&q=80",
  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=900&q=80",
  "https://images.unsplash.com/photo-1518770660439-4636190af475?w=900&q=80",
  "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=900&q=80",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900&q=80",
  "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=900&q=80",
  "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=900&q=80",
  "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=900&q=80",
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900&q=80",
  "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=900&q=80",
  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=900&q=80",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=900&q=80",
  "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=900&q=80",
  "https://images.unsplash.com/photo-1519817650390-64a93db51149?w=900&q=80",
  "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=900&q=80",
  "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=900&q=80",
  "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=900&q=80",
  "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=900&q=80",
  "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=900&q=80",
  "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=900&q=80",
  "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=900&q=80",
  "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=900&q=80",
  "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=900&q=80",
  "https://images.unsplash.com/photo-1522056615691-da7b8106829f?w=900&q=80",
  "https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=900&q=80",
  "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=900&q=80",
  "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=900&q=80",
  "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=900&q=80",
  "https://images.unsplash.com/photo-1551524559-8af4e6624178?w=900&q=80",
  "https://images.unsplash.com/photo-1515703407324-5f753eed8597?w=900&q=80",
  "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=900&q=80",
  "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=900&q=80",
  "https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?w=900&q=80"
];

async function prepareUploadedAssets() {
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

  // 1. Upload Video Sets
  console.log("Preparing video assets...");
  const uploadedVideos = [];
  for (let i = 0; i < verifiedVideos.length; i++) {
    const v = verifiedVideos[i];
    const vidPath = path.join(realMediaDir, v.videoFile);
    const thumbPath = path.join(exactThumbsDir, v.thumbFile);

    const vidUrl = await uploadFileViaApi(vidPath, v.videoFile, true);
    const thumbUrl = await uploadFileViaApi(thumbPath, v.thumbFile, false);
    uploadedVideos.push({ videoUrl: vidUrl, thumbUrl });
  }

  // 2. Upload Photo Sets
  console.log("Preparing photo assets...");
  const uploadedPhotos = [];
  for (let i = 0; i < photoPool.length; i++) {
    const filename = `bulk_photo_${i + 1}.jpg`;
    const localPath = path.join(scratchDir, filename);

    if (!fs.existsSync(localPath) || fs.statSync(localPath).size === 0) {
      let buf;
      try {
        const res = await fetch(photoPool[i], { headers: { "User-Agent": "Mozilla/5.0" } });
        if (res.ok) buf = Buffer.from(await res.arrayBuffer());
      } catch (e) {}
      if (!buf || buf.length === 0) {
        const fb = `https://picsum.photos/seed/photo_${i}/900/600`;
        const fbRes = await fetch(fb);
        buf = Buffer.from(await fbRes.arrayBuffer());
      }
      fs.writeFileSync(localPath, buf);
    }
    const photoUrl = await uploadFileViaApi(localPath, filename, false);
    uploadedPhotos.push(photoUrl);
  }

  return { uploadedVideos, uploadedPhotos };
}

async function main() {
  console.log("==================================================");
  console.log("🌟 SEEDING 10 RECORDS PER CATEGORY ACROSS ALL 13 MODULES");
  console.log("==================================================");

  const userId = 2; // umarwebdeveloper920@gmail.com
  const { uploadedVideos, uploadedPhotos } = await prepareUploadedAssets();

  // Signature check for Open Letters
  let sigId;
  const sigRes = await pool.query("SELECT id FROM signature WHERE user_id = $1 LIMIT 1", [userId]);
  if (sigRes.rows.length > 0) sigId = sigRes.rows[0].id;
  else {
    const newSig = await pool.query("INSERT INTO signature (user_id, image, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING id", [userId, `${BASE_URL}/fileUpload/default_sig.png`]);
    sigId = newSig.rows[0].id;
  }

  // ----------------------------------------------------
  // 1. VIDEO MANIA (19 categories -> 10 records each = 190)
  // ----------------------------------------------------
  console.log("\n1. Seeding Video Mania (10 records per category)...");
  await pool.query("TRUNCATE TABLE xpi_videos RESTART IDENTITY CASCADE;");
  await pool.query("TRUNCATE TABLE top_video RESTART IDENTITY CASCADE;");
  const xpiCats = (await pool.query("SELECT id, name FROM video_category ORDER BY id")).rows;
  const xpiSubs = (await pool.query("SELECT id, category_id, name FROM video_sub_category ORDER BY id")).rows;

  let xpiCount = 0;
  for (const c of xpiCats) {
    const subs = xpiSubs.filter((s) => s.category_id === c.id);
    for (let i = 1; i <= 10; i++) {
      const subObj = subs[(i - 1) % subs.length] || { id: 1, name: "General" };
      const mediaPair = uploadedVideos[(c.id * 10 + i) % uploadedVideos.length];
      const title = `${c.name} High Definition Dynamic Video Chronicle #${i}`;
      const desc = `Engaging short-form digital media production in category ${c.name} highlighting genuine footage and motion capture.`;

      const ins = await pool.query(
        `INSERT INTO xpi_videos (user_id, name, description, video_category, sub_category, video, thumbnail, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'approved', NOW() - ($8 || ' minutes')::interval, NOW() - ($8 || ' minutes')::interval) RETURNING id`,
        [userId, title, desc, c.id, subObj.id, mediaPair.videoUrl, mediaPair.thumbUrl, (300 - xpiCount)]
      );
      xpiCount++;
      if (i === 1) {
        await pool.query(
          "INSERT INTO top_video (name, description, video_category, video, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())",
          [title, desc, c.id, mediaPair.videoUrl]
        );
      }
    }
  }
  console.log(`✔ Video Mania: ${xpiCount} records across ${xpiCats.length} categories.`);

  // ----------------------------------------------------
  // 2. PIC TOURS (19 categories -> 10 records each = 190)
  // ----------------------------------------------------
  console.log("\n2. Seeding Pic Tours (10 records per category)...");
  await pool.query("TRUNCATE TABLE pic_tours RESTART IDENTITY CASCADE;");
  await pool.query("TRUNCATE TABLE top_tours RESTART IDENTITY CASCADE;");
  const picCats = (await pool.query("SELECT id, name FROM pic_category ORDER BY id")).rows;
  const picSubs = (await pool.query("SELECT id, category_id, name FROM pic_sub_category ORDER BY id")).rows;

  let picCount = 0;
  for (const c of picCats) {
    const subs = picSubs.filter((s) => s.category_id === c.id);
    for (let i = 1; i <= 10; i++) {
      const subObj = subs[(i - 1) % subs.length] || { id: 1, name: "Selfy" };
      const photoUrl = uploadedPhotos[(c.id * 10 + i) % uploadedPhotos.length];
      const title = `${c.name} Visual Tour Masterpiece Collection #${i}`;
      const desc = `High-resolution fine photography capturing the essence of ${c.name} with natural lighting and vivid contrast.`;

      await pool.query(
        `INSERT INTO pic_tours (user_id, name, description, pic_category, sub_category, image, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'approved', NOW() - ($7 || ' minutes')::interval, NOW() - ($7 || ' minutes')::interval)`,
        [userId, title, desc, c.id, subObj.id, photoUrl, (200 - picCount)]
      );
      picCount++;
      if (i === 1) {
        await pool.query(
          "INSERT INTO top_tours (name, description, pic_category, image, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())",
          [title, desc, c.id, photoUrl]
        );
      }
    }
  }
  console.log(`✔ Pic Tours: ${picCount} records across ${picCats.length} categories.`);

  // ----------------------------------------------------
  // 3. ON-NEWS (18 categories -> 10 records each = 180)
  // ----------------------------------------------------
  console.log("\n3. Seeding On-News (10 records per category)...");
  await pool.query("TRUNCATE TABLE news RESTART IDENTITY CASCADE;");
  await pool.query("TRUNCATE TABLE top_news RESTART IDENTITY CASCADE;");
  const newsCats = (await pool.query("SELECT id, name FROM news_category ORDER BY id")).rows;
  const newsSubs = (await pool.query("SELECT id, category_id, name FROM news_sub_category ORDER BY id")).rows;

  let newsCount = 0;
  for (const c of newsCats) {
    const subs = newsSubs.filter((s) => s.category_id === c.id);
    for (let i = 1; i <= 10; i++) {
      const subObj = subs[(i - 1) % subs.length] || { id: 1, name: "Global" };
      const photoUrl = uploadedPhotos[(c.id * 10 + i) % uploadedPhotos.length];
      const title = `${c.name} In-Depth Special Report: Global Perspective #${i}`;
      const desc = `Investigative journalism report examining critical advancements, economic shifts, and policy changes in ${c.name}.`;

      await pool.query(
        `INSERT INTO news (user_id, name, description, category, sub_category, image, type, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'image', 'approved', NOW() - ($7 || ' minutes')::interval, NOW() - ($7 || ' minutes')::interval)`,
        [userId, title, desc, c.id, subObj.id, photoUrl, (200 - newsCount)]
      );
      newsCount++;
      if (i === 1) {
        await pool.query(
          "INSERT INTO top_news (description, disc_category, image, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())",
          [desc, c.id, photoUrl]
        );
      }
    }
  }
  console.log(`✔ On-News: ${newsCount} records across ${newsCats.length} categories.`);

  // ----------------------------------------------------
  // 4. SPORT & SPORT (20 categories -> 10 records each = 200)
  // ----------------------------------------------------
  console.log("\n4. Seeding Sport & Sport (10 records per category)...");
  await pool.query("TRUNCATE TABLE sports RESTART IDENTITY CASCADE;");
  const sportCats = (await pool.query("SELECT id, name FROM sports_category ORDER BY id")).rows;
  const sportSubs = (await pool.query("SELECT id, category_id, name FROM sport_sub_category ORDER BY id")).rows;

  let sportCount = 0;
  for (const c of sportCats) {
    const subs = sportSubs.filter((s) => s.category_id === c.id);
    for (let i = 1; i <= 10; i++) {
      const subObj = subs[(i - 1) % subs.length] || { id: 1, name: "Europe" };
      const photoUrl = uploadedPhotos[(c.id * 10 + i) % uploadedPhotos.length];
      const title = `${c.name} Championship Action: Matchday Match Highlight #${i}`;
      const desc = `Electrifying athletic performance and tactical showdown in ${c.name} during the international tournament.`;

      await pool.query(
        `INSERT INTO sports (user_id, name, description, category_id, sub_category_id, image, type, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'image', NOW() - ($7 || ' minutes')::interval, NOW() - ($7 || ' minutes')::interval)`,
        [userId, title, desc, c.id, subObj.id, photoUrl, (200 - sportCount)]
      );
      sportCount++;
    }
  }
  console.log(`✔ Sport & Sport: ${sportCount} records across ${sportCats.length} categories.`);

  // ----------------------------------------------------
  // 5. OPEN LETTERS (21 categories -> 10 records each = 210)
  // ----------------------------------------------------
  console.log("\n5. Seeding Open Letters (10 records per category)...");
  await pool.query("TRUNCATE TABLE post_letters RESTART IDENTITY CASCADE;");
  await pool.query("TRUNCATE TABLE post_letters_images RESTART IDENTITY CASCADE;");
  const discCats = (await pool.query("SELECT id, name FROM disc_category ORDER BY id")).rows;
  const discSubs = (await pool.query("SELECT id, category_id, name FROM disc_sub_category ORDER BY id")).rows;

  let letterCount = 0;
  for (const c of discCats) {
    const subs = discSubs.filter((s) => s.category_id === c.id);
    for (let i = 1; i <= 10; i++) {
      const subObj = subs[(i - 1) % subs.length] || { id: 1, name: "Public (General)" };
      const photoUrl = uploadedPhotos[(c.id * 10 + i) % uploadedPhotos.length];
      const title = `Civic Petition for Equitable Progress in ${c.name} #${i}`;
      const greetings = `To the Representatives and Public Advocates for ${c.name},`;
      const intro = `Addressing institutional priorities and community accessibility in the domain of ${c.name}.`;
      const body = `We urge policymakers to enact comprehensive transparency audits, support regional innovators, and guarantee sustainable funding.`;
      const appeal = `Respectfully submitted in the spirit of civic progress,`;

      const ins = await pool.query(
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
        [userId, c.id, subObj.id, title, greetings, intro, body, appeal, sigId, (i === 1), (250 - letterCount)]
      );
      const letterId = ins.rows[0].id;
      await pool.query(
        "INSERT INTO post_letters_images (letter_id, image, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())",
        [letterId, photoUrl]
      );
      letterCount++;
    }
  }
  console.log(`✔ Open Letters: ${letterCount} records across ${discCats.length} categories.`);

  // ----------------------------------------------------
  // 6. TV PROGMAX (25 categories -> 10 records each = 250)
  // ----------------------------------------------------
  console.log("\n6. Seeding tvProgMax (10 records per category)...");
  await pool.query("TRUNCATE TABLE tv_progmax_videos RESTART IDENTITY CASCADE;");
  const tvCats = (await pool.query("SELECT id, name FROM tv_progmax_category ORDER BY id")).rows;
  const tvSubs = (await pool.query("SELECT id, category_id, name FROM tv_progmax_sub_category ORDER BY id")).rows;

  let tvCount = 0;
  for (const c of tvCats) {
    const subs = tvSubs.filter((s) => s.category_id === c.id);
    for (let i = 1; i <= 10; i++) {
      const subObj = subs[(i - 1) % subs.length] || { id: 1, name: "News" };
      const mediaPair = uploadedVideos[(c.id * 10 + i) % uploadedVideos.length];
      const title = `${c.name} Prime-Time Television Special Edition #${i}`;
      const desc = `High-definition television broadcast in ${c.name} featuring live news reports, interviews, and special programming.`;

      await pool.query(
        `INSERT INTO tv_progmax_videos (user_id, name, description, category_id, sub_category_id, video, thumbnail, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'approved', NOW() - ($8 || ' minutes')::interval, NOW() - ($8 || ' minutes')::interval)`,
        [userId, title, desc, c.id, subObj.id, mediaPair.videoUrl, mediaPair.thumbUrl, (300 - tvCount)]
      );
      tvCount++;
    }
  }
  console.log(`✔ tvProgMax: ${tvCount} records across ${tvCats.length} categories.`);

  // ----------------------------------------------------
  // 7. Q & A (17 categories -> 10 records each = 170)
  // ----------------------------------------------------
  console.log("\n7. Seeding Q & A (10 records per category)...");
  await pool.query("TRUNCATE TABLE qafi RESTART IDENTITY CASCADE;");
  const qafiCats = (await pool.query("SELECT id, name FROM qafi_category ORDER BY id")).rows;
  const qafiSubs = (await pool.query("SELECT id, category_id, name FROM qafi_sub_category ORDER BY id")).rows;

  let qafiCount = 0;
  for (const c of qafiCats) {
    const subs = qafiSubs.filter((s) => s.category_id === c.id);
    for (let i = 1; i <= 10; i++) {
      const subObj = subs[(i - 1) % subs.length] || { id: 1, name: "English" };
      const photoUrl = uploadedPhotos[(c.id * 10 + i) % uploadedPhotos.length];
      const question = `What are the defining innovations and ethical considerations transforming ${c.name} for future generations (Topic #${i})?`;

      await pool.query(
        `INSERT INTO qafi (user_id, description, category, sub_category, image, type, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'image', NOW() - ($6 || ' minutes')::interval, NOW() - ($6 || ' minutes')::interval)`,
        [userId, question, c.id, subObj.id, photoUrl, (200 - qafiCount)]
      );
      qafiCount++;
    }
  }
  console.log(`✔ Q & A: ${qafiCount} records across ${qafiCats.length} categories.`);

  // ----------------------------------------------------
  // 8. LEARNING & HOBBIES (9 categories -> 10 records each = 90)
  // ----------------------------------------------------
  console.log("\n8. Seeding Learning & Hobbies (10 records per category)...");
  await pool.query("TRUNCATE TABLE learning_hobbies_videos RESTART IDENTITY CASCADE;");
  const learnCats = (await pool.query("SELECT id, name FROM learning_hobbies_category ORDER BY id")).rows;
  const learnSubs = (await pool.query("SELECT id, category_id, name FROM learning_hobbies_sub_category ORDER BY id")).rows;

  let learnCount = 0;
  for (const c of learnCats) {
    const subs = learnSubs.filter((s) => s.category_id === c.id);
    for (let i = 1; i <= 10; i++) {
      const subObj = subs[(i - 1) % subs.length] || { id: 1, name: "English" };
      const mediaPair = uploadedVideos[(c.id * 10 + i) % uploadedVideos.length];
      const title = `${c.name} Comprehensive Mastery Masterclass Session #${i}`;
      const desc = `Step-by-step practical masterclass teaching core foundations and advanced techniques in ${c.name}.`;

      await pool.query(
        `INSERT INTO learning_hobbies_videos (user_id, name, description, category_id, sub_category_id, video, thumbnail, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'approved', NOW() - ($8 || ' minutes')::interval, NOW() - ($8 || ' minutes')::interval)`,
        [userId, title, desc, c.id, subObj.id, mediaPair.videoUrl, mediaPair.thumbUrl, (100 - learnCount)]
      );
      learnCount++;
    }
  }
  console.log(`✔ Learning & Hobbies: ${learnCount} records across ${learnCats.length} categories.`);

  // ----------------------------------------------------
  // 9. KID-VID (7 categories -> 10 records each = 70)
  // ----------------------------------------------------
  console.log("\n9. Seeding Kid-Vid (10 records per category)...");
  await pool.query("TRUNCATE TABLE kid_vids_videos RESTART IDENTITY CASCADE;");
  const kidCats = (await pool.query("SELECT id, name FROM kid_vids_category ORDER BY id")).rows;
  const kidSubs = (await pool.query("SELECT id, category_id, name FROM kid_vids_sub_category ORDER BY id")).rows;

  let kidCount = 0;
  for (const c of kidCats) {
    const subs = kidSubs.filter((s) => s.category_id === c.id);
    for (let i = 1; i <= 10; i++) {
      const subObj = subs[(i - 1) % subs.length] || { id: 1, name: "English" };
      const mediaPair = uploadedVideos[(c.id * 10 + i) % uploadedVideos.length];
      const title = `${c.name} Fun Kids Adventure & Learning Episode #${i}`;
      const desc = `Safe, educational, and joyful family-friendly video program for children exploring ${c.name}.`;

      await pool.query(
        `INSERT INTO kid_vids_videos (user_id, name, description, category_id, sub_category_id, video, thumbnail, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'approved', NOW() - ($8 || ' minutes')::interval, NOW() - ($8 || ' minutes')::interval)`,
        [userId, title, desc, c.id, subObj.id, mediaPair.videoUrl, mediaPair.thumbUrl, (80 - kidCount)]
      );
      kidCount++;
    }
  }
  console.log(`✔ Kid-Vid: ${kidCount} records across ${kidCats.length} categories.`);

  // ----------------------------------------------------
  // 10. FAN-STAR ZONE (8 categories -> 10 records each = 80)
  // ----------------------------------------------------
  console.log("\n10. Seeding Fan-Star Zone (10 records per category)...");
  await pool.query("TRUNCATE TABLE fan_star_videos RESTART IDENTITY CASCADE;");
  const fanCats = (await pool.query("SELECT id, name FROM fan_star_category ORDER BY id")).rows;
  const fanSubs = (await pool.query("SELECT id, category_id, name FROM fan_star_sub_category ORDER BY id")).rows;

  let fanCount = 0;
  for (const c of fanCats) {
    const subs = fanSubs.filter((s) => s.category_id === c.id);
    for (let i = 1; i <= 10; i++) {
      const subObj = subs[(i - 1) % subs.length] || { id: 1, name: "Joy & Fun" };
      const mediaPair = uploadedVideos[(c.id * 10 + i) % uploadedVideos.length];
      const title = `${c.name} Fan-Star Zone Viral Showcase #${i}`;
      const desc = `Top-trending fan community celebration and viral moments in ${c.name}.`;

      await pool.query(
        `INSERT INTO fan_star_videos (user_id, name, description, category_id, sub_category_id, video, thumbnail, type, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'video', 'approved', NOW() - ($8 || ' minutes')::interval, NOW() - ($8 || ' minutes')::interval)`,
        [userId, title, desc, c.id, subObj.id, mediaPair.videoUrl, mediaPair.thumbUrl, (90 - fanCount)]
      );
      fanCount++;
    }
  }
  console.log(`✔ Fan-Star Zone: ${fanCount} records across ${fanCats.length} categories.`);

  // ----------------------------------------------------
  // 11. CINEMATIC (10 categories -> 10 records each = 100)
  // ----------------------------------------------------
  console.log("\n11. Seeding Cinematic (10 records per category)...");
  await pool.query("TRUNCATE TABLE cinematics_videos RESTART IDENTITY CASCADE;");
  const cineCats = (await pool.query("SELECT id, name FROM cinematics_category ORDER BY id")).rows;
  const cineSubs = (await pool.query("SELECT id, category_id, name FROM cinematics_sub_category ORDER BY id")).rows;

  let cineCount = 0;
  for (const c of cineCats) {
    const subs = cineSubs.filter((s) => s.category_id === c.id);
    for (let i = 1; i <= 10; i++) {
      const subObj = subs[(i - 1) % subs.length] || { id: 1, name: "Hollywood  European  Latin-American  Movies" };
      const mediaPair = uploadedVideos[(c.id * 10 + i) % uploadedVideos.length];
      const title = `${c.name} Feature Film Premiere Experience #${i}`;
      const desc = `Award-winning cinematic production in the ${c.name} genre featuring rich storytelling and master-class cinematography.`;

      await pool.query(
        `INSERT INTO cinematics_videos (user_id, name, description, category_id, sub_category_id, video, thumbnail, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'approved', NOW() - ($8 || ' minutes')::interval, NOW() - ($8 || ' minutes')::interval)`,
        [userId, title, desc, c.id, subObj.id, mediaPair.videoUrl, mediaPair.thumbUrl, (110 - cineCount)]
      );
      cineCount++;
    }
  }
  console.log(`✔ Cinematic: ${cineCount} records across ${cineCats.length} categories.`);

  // ----------------------------------------------------
  // 12. EBIC (9 categories -> 10 records each = 90)
  // ----------------------------------------------------
  console.log("\n12. Seeding EBIC (10 records per category)...");
  await pool.query("TRUNCATE TABLE gebc RESTART IDENTITY CASCADE;");
  await pool.query("TRUNCATE TABLE top_gebc RESTART IDENTITY CASCADE;");
  const gebcCats = (await pool.query("SELECT id, name FROM gebc_category ORDER BY id")).rows;
  const gebcSubs = (await pool.query("SELECT id, category_id, name FROM gebc_sub_category ORDER BY id")).rows;

  let gebcCount = 0;
  for (const c of gebcCats) {
    const subs = gebcSubs.filter((s) => s.category_id === c.id);
    for (let i = 1; i <= 10; i++) {
      const subObj = subs[(i - 1) % subs.length] || { id: 1, name: "Thoughts & Ideas" };
      const photoUrl = uploadedPhotos[(c.id * 10 + i) % uploadedPhotos.length];
      const name = `${c.name} Emblem #${i}`;
      const desc = `Expressive ${c.name} visual symbol celebrating positive emotions and shared human connections.`;

      await pool.query(
        `INSERT INTO gebc (user_id, name, description, category, sub_category, image, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'approved', NOW() - ($7 || ' minutes')::interval, NOW() - ($7 || ' minutes')::interval)`,
        [userId, name, desc, c.id, subObj.id, photoUrl, (100 - gebcCount)]
      );
      gebcCount++;
      if (i === 1) {
        await pool.query(
          "INSERT INTO top_gebc (description, disc_category, image, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())",
          [desc, c.id, photoUrl]
        );
      }
    }
  }
  console.log(`✔ EBIC: ${gebcCount} records across ${gebcCats.length} categories.`);

  // ----------------------------------------------------
  // 13. MONDO MARKET (5 categories -> 10 records each = 50)
  // ----------------------------------------------------
  console.log("\n13. Seeding Mondo Market (10 records per category)...");
  await pool.query("TRUNCATE TABLE item RESTART IDENTITY CASCADE;");
  await pool.query("TRUNCATE TABLE item_images RESTART IDENTITY CASCADE;");
  const marketCats = (await pool.query("SELECT id, name FROM item_category ORDER BY id")).rows;
  const marketSubs = (await pool.query("SELECT id, category_id, name FROM item_sub_category ORDER BY id")).rows;

  const conditions = ["new", "used_Like_new", "used_Good", "used_Fair"];
  const citiesByRegion = {
    Europe: [{ city: "London", country: "United Kingdom", code: "GB", region: "europe" }, { city: "Paris", country: "France", code: "FR", region: "europe" }, { city: "Berlin", country: "Germany", code: "DE", region: "europe" }, { city: "Rome", country: "Italy", code: "IT", region: "europe" }],
    Africa: [{ city: "Nairobi", country: "Kenya", code: "KE", region: "africa" }, { city: "Cape Town", country: "South Africa", code: "ZA", region: "africa" }, { city: "Cairo", country: "Egypt", code: "EG", region: "africa" }],
    Americas: [{ city: "New York", country: "United States", code: "US", region: "americas" }, { city: "Toronto", country: "Canada", code: "CA", region: "americas" }, { city: "São Paulo", country: "Brazil", code: "BR", region: "americas" }],
    Asia: [{ city: "Tokyo", country: "Japan", code: "JP", region: "asia" }, { city: "Seoul", country: "South Korea", code: "KR", region: "asia" }, { city: "Singapore", country: "Singapore", code: "SG", region: "asia" }],
    "Middle-East": [{ city: "Dubai", country: "United Arab Emirates", code: "AE", region: "middle-east" }, { city: "Doha", country: "Qatar", code: "QA", region: "middle-east" }, { city: "Riyadh", country: "Saudi Arabia", code: "SA", region: "middle-east" }]
  };

  let marketCount = 0;
  for (const c of marketCats) {
    const subs = marketSubs.filter((s) => s.category_id === c.id);
    const locList = citiesByRegion[c.name] || [{ city: "Global City", country: "Global", code: "GL", region: "global" }];

    for (let i = 1; i <= 10; i++) {
      const subObj = subs[(i - 1) % subs.length] || { id: 1, name: "Clotthing & Related Items" };
      const loc = locList[(i - 1) % locList.length];
      const photoUrl = uploadedPhotos[(c.id * 10 + i) % uploadedPhotos.length];
      const cond = conditions[(i - 1) % conditions.length];
      const price = String(100 * i + (c.id * 50));
      const title = `${c.name} Premium Authentic Merchant Listing #${i}`;
      const desc = `Genuine commercial product offering from ${loc.city}, ${loc.country} with full verification warranty.`;

      const ins = await pool.query(
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
          userId, c.id, subObj.id, title, desc,
          price, cond, loc.city, loc.city, loc.city, loc.region,
          loc.country, loc.code, (i === 1), (60 - marketCount)
        ]
      );
      const itemId = ins.rows[0].id;
      await pool.query(
        "INSERT INTO item_images (item_id, image, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())",
        [itemId, photoUrl]
      );
      marketCount++;
    }
  }
  console.log(`✔ Mondo Market: ${marketCount} records across ${marketCats.length} categories.`);

  console.log("\n==================================================");
  console.log(`🎉 COMPLETED! All 13 modules populated with AT LEAST 10 RECORDS PER CATEGORY!`);
  console.log("==================================================");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
