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
      VALUES ($1, 'general', 'individual', 1, 1, 'John Doe', '123 Main St', 'john@example.com', '1234567890', 'New York', CURRENT_DATE, 'Hello', 'Intro text', 'Letter body content', 'Sincerely', 1, false, false, 'active')
      RETURNING id;
    `, [userId]);
    letterId = res.rows[0].id;
    console.log("[FINAL SEEDED] post_letters ID:", letterId);
  } catch (e) {
    console.error("post_letters:", e.message);
  }

  // Letters dependents
  try {
    await pool.query(`INSERT INTO "comment_post_letter" ("letter_id", "user_id", "comment") VALUES ($1, $2, 'Nice letter!')`, [letterId, userId]);
    console.log("[FINAL SEEDED] comment_post_letter");
  } catch (e) { console.error("comment_post_letter:", e.message); }

  try {
    await pool.query(`INSERT INTO "like_post_letter" ("letter_id", "user_id") VALUES ($1, $2)`, [letterId, userId]);
    console.log("[FINAL SEEDED] like_post_letter");
  } catch (e) { console.error("like_post_letter:", e.message); }

  try {
    await pool.query(`INSERT INTO "report_post_letter" ("letter_id", "user_id", "reason") VALUES ($1, $2, 'Spam content')`, [letterId, userId]);
    console.log("[FINAL SEEDED] report_post_letter");
  } catch (e) { console.error("report_post_letter:", e.message); }

  try {
    await pool.query(`INSERT INTO "post_letters_images" ("letter_id", "image") VALUES ($1, 'https://res.cloudinary.com/dcshfycci/image/upload/v1779478259/gfmoxqcxhpe3enjy0bp5.jpg')`, [letterId]);
    console.log("[FINAL SEEDED] post_letters_images");
  } catch (e) { console.error("post_letters_images:", e.message); }

  try {
    await pool.query(`INSERT INTO "letter_reciever_info" ("letter_id", "receiver_name", "receiver_address", "receiver_email") VALUES ($1, 'Jane Smith', '456 Oak Ave', 'jane@example.com')`, [letterId]);
    console.log("[FINAL SEEDED] letter_reciever_info");
  } catch (e) { console.error("letter_reciever_info:", e.message); }

  // contact_us
  try {
    await pool.query(`INSERT INTO "contact_us" ("full_name", "email_address", "message", "status") VALUES ('John Doe', 'john@example.com', 'Inquiry message text', 'unread')`);
    console.log("[FINAL SEEDED] contact_us");
  } catch (e) { console.error("contact_us:", e.message); }

  // mass_app
  try {
    await pool.query(`INSERT INTO "mass_app" ("user_id", "app_category_id", "name", "icon", "type") VALUES ($1, 1, 'Sample Mass App', 'icon.png', 'app')`, [userId]);
    console.log("[FINAL SEEDED] mass_app");
  } catch (e) { console.error("mass_app:", e.message); }

  // top_gebc, top_news, top_qafi
  try {
    await pool.query(`INSERT INTO "top_gebc" ("gebc_id") VALUES (1)`);
    console.log("[FINAL SEEDED] top_gebc");
  } catch (e) { console.error("top_gebc:", e.message); }

  try {
    await pool.query(`INSERT INTO "top_news" ("news_id") VALUES (1)`);
    console.log("[FINAL SEEDED] top_news");
  } catch (e) { console.error("top_news:", e.message); }

  try {
    await pool.query(`INSERT INTO "top_qafi" ("qafi_id") VALUES (1)`);
    console.log("[FINAL SEEDED] top_qafi");
  } catch (e) { console.error("top_qafi:", e.message); }

  // send_offer
  try {
    await pool.query(`INSERT INTO "send_offer" ("item_id", "sender_id", "receiver_id", "offer_price") VALUES (1, $1, $1, 2500)`, [userId]);
    console.log("[FINAL SEEDED] send_offer");
  } catch (e) { console.error("send_offer:", e.message); }

  // subscription
  try {
    await pool.query(`INSERT INTO "subscription" ("user_id", "plan_id", "price", "status", "transaction_id") VALUES ($1, 'monthly', 19.99, 'active', 3)`, [userId]);
    console.log("[FINAL SEEDED] subscription");
  } catch (e) { console.error("subscription:", e.message); }

}

main().finally(() => pool.end());
