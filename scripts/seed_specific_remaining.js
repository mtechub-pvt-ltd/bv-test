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
  const userRes = await pool.query(`SELECT id FROM users ORDER BY id ASC LIMIT 5`);
  const userId1 = userRes.rows[0]?.id || 1;
  const userId2 = userRes.rows[1]?.id || userId1;

  console.log("Seeding with User IDs:", userId1, userId2);

  // 1. pic_tours
  let picToursId = 1;
  try {
    const res = await pool.query(`
      INSERT INTO "pic_tours" ("user_id", "name", "description", "pic_category", "sub_category", "image", "status")
      VALUES ($1, 'Sample Pic Tour', 'Sample pic tour description', 1, 1, 'https://res.cloudinary.com/dcshfycci/image/upload/v1779478259/gfmoxqcxhpe3enjy0bp5.jpg', 'active')
      RETURNING id;
    `, [userId1]);
    picToursId = res.rows[0].id;
    console.log("[SEEDED] pic_tours ID:", picToursId);
  } catch (e) {
    console.error("pic_tours:", e.message);
  }

  // 2. xpi_videos
  let xpiVideoId = 1;
  try {
    const res = await pool.query(`
      INSERT INTO "xpi_videos" ("user_id", "name", "description", "video_category", "sub_category", "video", "thumbnail", "top", "status")
      VALUES ($1, 'Sample Video', 'Sample video description', 1, 1, 'https://www.w3schools.com/html/mov_bbb.mp4', 'https://res.cloudinary.com/dcshfycci/image/upload/v1779478259/gfmoxqcxhpe3enjy0bp5.jpg', true, 'active')
      RETURNING id;
    `, [userId1]);
    xpiVideoId = res.rows[0].id;
    console.log("[SEEDED] xpi_videos ID:", xpiVideoId);
  } catch (e) {
    console.error("xpi_videos:", e.message);
  }

  // 3. post_letters
  let postLetterId = 1;
  try {
    const res = await pool.query(`
      INSERT INTO "post_letters" ("user_id", "post_type", "receiver_type", "disc_category", "disc_sub_category", "name", "address", "email", "contact_no", "subject_place", "post_date", "greetings", "introduction", "body", "form_of_appeal", "signature_id", "paid_status", "top_letter", "status")
      VALUES ($1, 'general', 'individual', 1, 1, 'John Doe', '123 Main St', 'john@example.com', '1234567890', 'New York', CURRENT_DATE, 'Hello', 'Intro text', 'Letter body content', 'Sincerely', 1, true, false, 'active')
      RETURNING id;
    `, [userId1]);
    postLetterId = res.rows[0].id;
    console.log("[SEEDED] post_letters ID:", postLetterId);
  } catch (e) {
    console.error("post_letters:", e.message);
  }

  // 4. banner
  let bannerId = 1;
  try {
    const res = await pool.query(`
      INSERT INTO "banner" ("user_id", "image", "banner_link", "category_table", "category_id", "price", "startdate", "enddate", "status", "top_banner", "paid_status")
      VALUES ($1, 'https://res.cloudinary.com/dcshfycci/image/upload/v1779478259/gfmoxqcxhpe3enjy0bp5.jpg', 'https://example.com', 'app_category', 1, 1999, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'active', false, true)
      RETURNING id;
    `, [userId1]);
    bannerId = res.rows[0].id;
    console.log("[SEEDED] banner ID:", bannerId);
  } catch (e) {
    console.error("banner:", e.message);
  }

  // 5. item
  let itemId = 1;
  try {
    const res = await pool.query(`
      INSERT INTO "item" ("user_id", "item_category", "sub_category", "title", "description", "price", "condition", "location", "top_post", "paid_status", "status")
      VALUES ($1, 1, 1, 'Sample Market Item', 'Description of market item', 2999, 'new', 'New York', false, true, 'active')
      RETURNING id;
    `, [userId1]);
    itemId = res.rows[0].id;
    console.log("[SEEDED] item ID:", itemId);
  } catch (e) {
    console.error("item:", e.message);
  }

  // Dependents of pic_tours
  const picDependents = [
    { table: "like_pic", sql: `INSERT INTO "like_pic" ("pic_tours_id", "user_id") VALUES ($1, $2)`, args: [picToursId, userId1] },
    { table: "pic_comment", sql: `INSERT INTO "pic_comment" ("pic_tours_id", "user_id", "comment") VALUES ($1, $2, 'Great pic tour!')`, args: [picToursId, userId1] },
    { table: "viewed_pic", sql: `INSERT INTO "viewed_pic" ("pic_tours_id", "user_id") VALUES ($1, $2)`, args: [picToursId, userId1] },
    { table: "top_tours", sql: `INSERT INTO "top_tours" ("name", "description", "pic_category", "image") VALUES ('Top Tour', 'Top tour description', 1, 'https://res.cloudinary.com/dcshfycci/image/upload/v1779478259/gfmoxqcxhpe3enjy0bp5.jpg')`, args: [] },
  ];

  // Dependents of xpi_videos
  const videoDependents = [
    { table: "like_video", sql: `INSERT INTO "like_video" ("video_id", "user_id") VALUES ($1, $2)`, args: [xpiVideoId, userId1] },
    { table: "video_comment", sql: `INSERT INTO "video_comment" ("video_id", "user_id", "comment") VALUES ($1, $2, 'Awesome video!')`, args: [xpiVideoId, userId1] },
    { table: "viewed_video", sql: `INSERT INTO "viewed_video" ("video_id", "user_id") VALUES ($1, $2)`, args: [xpiVideoId, userId1] },
    { table: "top_video", sql: `INSERT INTO "top_video" ("name", "description", "video_category", "video") VALUES ('Top Video', 'Top video description', 1, 'https://www.w3schools.com/html/mov_bbb.mp4')`, args: [] },
    { table: "top_video_like", sql: `INSERT INTO "top_video_like" ("video_id", "user_id") VALUES ($1, $2)`, args: [xpiVideoId, userId1] },
    { table: "top_video_viewed", sql: `INSERT INTO "top_video_viewed" ("video_id", "user_id") VALUES ($1, $2)`, args: [xpiVideoId, userId1] },
  ];

  // Dependents of post_letters
  const letterDependents = [
    { table: "comment_post_letter", sql: `INSERT INTO "comment_post_letter" ("letter_id", "user_id", "comment") VALUES ($1, $2, 'Nice letter!')`, args: [postLetterId, userId1] },
    { table: "like_post_letter", sql: `INSERT INTO "like_post_letter" ("letter_id", "user_id") VALUES ($1, $2)`, args: [postLetterId, userId1] },
    { table: "report_post_letter", sql: `INSERT INTO "report_post_letter" ("letter_id", "user_id", "reason") VALUES ($1, $2, 'Spam content')`, args: [postLetterId, userId1] },
    { table: "post_letters_images", sql: `INSERT INTO "post_letters_images" ("letter_id", "image") VALUES ($1, 'https://res.cloudinary.com/dcshfycci/image/upload/v1779478259/gfmoxqcxhpe3enjy0bp5.jpg')`, args: [postLetterId] },
    { table: "letter_reciever_info", sql: `INSERT INTO "letter_reciever_info" ("letter_id", "name", "address", "email") VALUES ($1, 'Jane Smith', '456 Oak Ave', 'jane@example.com')`, args: [postLetterId] },
  ];

  // Dependents of banner
  let transactionId = 1;
  try {
    const tRes = await pool.query(`
      INSERT INTO "transactions" ("user_id", "banner_id", "amount", "credit")
      VALUES ($1, $2, 19.99, true)
      RETURNING id;
    `, [userId1, bannerId]);
    transactionId = tRes.rows[0].id;
    console.log("[SEEDED] transactions ID:", transactionId);
  } catch (e) {
    console.error("transactions:", e.message);
  }

  const bannerDependents = [
    { table: "stripe_payments", sql: `INSERT INTO "stripe_payments" ("user_id", "banner_id", "status", "amount_cents", "currency") VALUES ($1, $2, 'succeeded', 1999, 'usd')`, args: [userId1, bannerId] },
    { table: "subscription", sql: `INSERT INTO "subscription" ("user_id", "plan_id", "price", "status", "transaction_id") VALUES ($1, 'monthly_plan', 19.99, 'active', $2)`, args: [userId1, transactionId] },
  ];

  // Dependents of item
  const itemDependents = [
    { table: "item_images", sql: `INSERT INTO "item_images" ("item_id", "image") VALUES ($1, 'https://res.cloudinary.com/dcshfycci/image/upload/v1779478259/gfmoxqcxhpe3enjy0bp5.jpg')`, args: [itemId] },
    { table: "mondon_market_comment", sql: `INSERT INTO "mondon_market_comment" ("item_id", "user_id", "comment") VALUES ($1, $2, 'Is this item still available?')`, args: [itemId, userId1] },
    { table: "mondon_market_like", sql: `INSERT INTO "mondon_market_like" ("item_id", "user_id") VALUES ($1, $2)`, args: [itemId, userId1] },
    { table: "save_item", sql: `INSERT INTO "save_item" ("item_id", "user_id") VALUES ($1, $2)`, args: [itemId, userId1] },
    { table: "send_offer", sql: `INSERT INTO "send_offer" ("item_id", "user_id", "offer_price") VALUES ($1, $2, 2500)`, args: [itemId, userId1] },
  ];

  // Standalone tables
  const standalone = [
    { table: "contact_us", sql: `INSERT INTO "contact_us" ("full_name", "email_address", "message", "status") VALUES ('John Doe', 'john@example.com', 'Inquiry message text', 'pending')`, args: [] },
    { table: "mass_app", sql: `INSERT INTO "mass_app" ("user_id", "app_category_id", "name", "icon", "type") VALUES ($1, 1, 'Sample Mass App', 'icon.png', 'app')`, args: [userId1] },
    { table: "user_profile_likes", sql: `INSERT INTO "user_profile_likes" ("liked_user_id", "liked_by_user_id") VALUES ($1, $2)`, args: [userId1, userId2] },
    { table: "top_gebc", sql: `INSERT INTO "top_gebc" ("user_id", "gebc_id") VALUES ($1, 1)`, args: [userId1] },
    { table: "top_news", sql: `INSERT INTO "top_news" ("user_id", "news_id") VALUES ($1, 1)`, args: [userId1] },
    { table: "top_qafi", sql: `INSERT INTO "top_qafi" ("user_id", "qafi_id") VALUES ($1, 1)`, args: [userId1] },
  ];

  const allQueries = [
    ...picDependents,
    ...videoDependents,
    ...letterDependents,
    ...bannerDependents,
    ...itemDependents,
    ...standalone
  ];

  for (const q of allQueries) {
    try {
      await pool.query(q.sql, q.args);
      console.log(`[SEEDED] ${q.table} successfully.`);
    } catch (err) {
      console.error(`[FAILED] ${q.table}:`, err.message);
    }
  }

}

main().finally(() => pool.end());
