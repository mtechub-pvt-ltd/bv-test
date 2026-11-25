import dotenv from "dotenv";
dotenv.config();
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "user6",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "watchagocha-db",
  port: Number(process.env.DB_PORT) || 5432,
});

async function main() {
  const userRes = await pool.query(`SELECT id FROM users LIMIT 1`);
  const userId = userRes.rows[0]?.id || 1;

  // 1. post_letters
  let letterId = 1;
  try {
    const res = await pool.query(`
      INSERT INTO "post_letters" ("user_id", "post_type", "receiver_type", "disc_category", "disc_sub_category", "name", "address", "email", "contact_no", "subject_place", "post_date", "greetings", "introduction", "body", "form_of_appeal", "signature_id", "paid_status", "top_letter", "status")
      VALUES ($1, 'public', 'general', 1, 1, 'John Doe', '123 Main St', 'john@example.com', '1234567890', 'New York', CURRENT_DATE, 'Hello', 'Intro text', 'Letter body content', 'Sincerely', 1, false, false, 'active')
      RETURNING id;
    `, [userId]);
    letterId = res.rows[0].id;
    console.log("[SUCCESS] post_letters ID:", letterId);
  } catch (e) {
    console.error("post_letters:", e.message);
  }

  // Dependent tables of post_letters
  const letterTables = [
    { name: "comment_post_letter", sql: `INSERT INTO "comment_post_letter" ("letter_id", "user_id", "comment") VALUES ($1, $2, 'Nice letter!')`, args: [letterId, userId] },
    { name: "like_post_letter", sql: `INSERT INTO "like_post_letter" ("letter_id", "user_id") VALUES ($1, $2)`, args: [letterId, userId] },
    { name: "report_post_letter", sql: `INSERT INTO "report_post_letter" ("letter_id", "user_id", "reason") VALUES ($1, $2, 'Spam content')`, args: [letterId, userId] },
    { name: "post_letters_images", sql: `INSERT INTO "post_letters_images" ("letter_id", "image") VALUES ($1, 'https://res.cloudinary.com/dcshfycci/image/upload/v1779478259/gfmoxqcxhpe3enjy0bp5.jpg')`, args: [letterId] },
    { name: "letter_reciever_info", sql: `INSERT INTO "letter_reciever_info" ("letter_id", "reciever_id", "address") VALUES ($1, $2, '456 Oak Ave')`, args: [letterId, userId] }
  ];

  for (const t of letterTables) {
    try {
      await pool.query(t.sql, t.args);
      console.log(`[SUCCESS] ${t.name}`);
    } catch (e) {
      console.error(`${t.name}:`, e.message);
    }
  }

  // mass_app
  try {
    await pool.query(`INSERT INTO "mass_app" ("user_id", "app_category_id", "name", "icon", "type") VALUES ($1, 1, 'Sample Mass App', 'icon.png', 'top')`, [userId]);
    console.log("[SUCCESS] mass_app");
  } catch (e) { console.error("mass_app:", e.message); }

  // top_gebc
  try {
    await pool.query(`INSERT INTO "top_gebc" ("description", "disc_category", "image") VALUES ('Sample Top GEBC', 1, 'https://res.cloudinary.com/dcshfycci/image/upload/v1779478259/gfmoxqcxhpe3enjy0bp5.jpg')`);
    console.log("[SUCCESS] top_gebc");
  } catch (e) { console.error("top_gebc:", e.message); }

  // top_news
  try {
    await pool.query(`INSERT INTO "top_news" ("description", "disc_category", "image") VALUES ('Sample Top News', 1, 'https://res.cloudinary.com/dcshfycci/image/upload/v1779478259/gfmoxqcxhpe3enjy0bp5.jpg')`);
    console.log("[SUCCESS] top_news");
  } catch (e) { console.error("top_news:", e.message); }

  // top_qafi
  try {
    await pool.query(`INSERT INTO "top_qafi" ("description", "disc_category", "image") VALUES ('Sample Top QAFI', 1, 'https://res.cloudinary.com/dcshfycci/image/upload/v1779478259/gfmoxqcxhpe3enjy0bp5.jpg')`);
    console.log("[SUCCESS] top_qafi");
  } catch (e) { console.error("top_qafi:", e.message); }

  // send_offer
  try {
    await pool.query(`INSERT INTO "send_offer" ("item_id", "sender_id", "price", "status") VALUES (1, $1, 2500, 'pending')`, [userId]);
    console.log("[SUCCESS] send_offer");
  } catch (e) { console.error("send_offer:", e.message); }

  // rate_app & share_app & privacy_policy & terms_conditions
  try {
    await pool.query(`INSERT INTO "privacy_policy" ("description") VALUES ('Sample Privacy Policy content.')`);
    console.log("[SUCCESS] privacy_policy");
  } catch (e) {}

  try {
    await pool.query(`INSERT INTO "terms_conditions" ("description") VALUES ('Sample Terms and Conditions content.')`);
    console.log("[SUCCESS] terms_conditions");
  } catch (e) {}

}

main().finally(() => pool.end());
