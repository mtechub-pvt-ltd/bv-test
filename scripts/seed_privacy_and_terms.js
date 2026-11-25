import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new pg.Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "user6",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "watchagocha-db",
  port: Number(process.env.DB_PORT) || 5432,
});

const privacyPolicyContent = `
<h2><strong>WotchaGotcha Privacy Policy</strong></h2>
<p><em>Last Updated: August 25, 2026</em></p>

<h3><strong>1. Introduction</strong></h3>
<p>Welcome to <strong>WotchaGotcha</strong>. We respect your privacy and are committed to protecting the personal data you share with us. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website, utilize our mobile applications, or participate in our multi-media social platform across all 13 interactive modules (including Video Mania, On-News, Sport & Sport, Pic Tours, Mondo Market, Open Letters, tvProgMax, Cinematic, and more).</p>

<h3><strong>2. Information We Collect</strong></h3>
<ul>
  <li><strong>Account & Profile Information:</strong> When you register for an account, we collect your username, email address, country, profile avatar, creator badge tier, and encrypted credentials.</li>
  <li><strong>User Generated Content:</strong> Photos, videos, letters, audio clips, marketplace listings, comments, replies, and community interactions you publish on the platform.</li>
  <li><strong>Usage & Device Analytics:</strong> Technical identifiers, IP address, device model, operating system, browser type, interaction timestamps, and FCM push notification tokens for live updates.</li>
  <li><strong>Financial & Payment Data:</strong> For marketplace transactions, paid promotions, and creator badges, payment processing is handled through secure third-party payment gateways with industry-standard encryption.</li>
</ul>

<h3><strong>3. How We Use Your Information</strong></h3>
<ul>
  <li>To provide, personalize, and maintain all multimedia features across our 13 interactive modules.</li>
  <li>To deliver real-time notifications for likes, comments, replies, mentions, and creator engagements.</li>
  <li>To protect user safety, prevent spam, enforce platform community guidelines, and investigate malicious conduct.</li>
  <li>To process transactions, creator verification, and premium subscription features.</li>
</ul>

<h3><strong>4. Data Security & Retention</strong></h3>
<p>We implement rigorous technical and organizational measures, including end-to-end transport layer security (TLS/HTTPS), secure PostgreSQL role policies, and password hashing (bcrypt) to protect against unauthorized access, alteration, disclosure, or destruction of your personal information.</p>

<h3><strong>5. Your Privacy Rights & Controls</strong></h3>
<ul>
  <li><strong>Access & Correction:</strong> You can review and update your profile details directly from Account Settings.</li>
  <li><strong>Privacy Visibility:</strong> You can toggle profile discovery, activity status, and direct message permissions.</li>
  <li><strong>Account Deletion:</strong> You have the right to permanently request the deletion of your account and associated media data at any time.</li>
</ul>

<h3><strong>6. Contact Us</strong></h3>
<p>If you have any questions, inquiries, or privacy requests regarding this Privacy Policy, please contact our Data Protection Team at <a href="mailto:privacy@wotcha-gotcha.com">privacy@wotcha-gotcha.com</a> or reach out through our official support center.</p>
`.trim();

const termsConditionsContent = `
<h2><strong>WotchaGotcha Terms & Conditions</strong></h2>
<p><em>Last Updated: August 25, 2026</em></p>

<h3><strong>1. Agreement to Terms</strong></h3>
<p>By accessing or using the <strong>WotchaGotcha</strong> platform, mobile applications, and associated services, you agree to be bound by these Terms and Conditions. If you do not agree to all terms and conditions, you must discontinue platform use immediately.</p>

<h3><strong>2. User Accounts & Security</strong></h3>
<ul>
  <li>You must provide accurate, current, and complete information during registration.</li>
  <li>You are solely responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</li>
  <li>You must immediately notify us of any unauthorized use or security breach of your account.</li>
</ul>

<h3><strong>3. Platform Guidelines & Acceptable Use</strong></h3>
<p>You agree not to upload, post, transmit, or share any content that:</p>
<ul>
  <li>Is unlawful, defamatory, harassing, abusive, fraudulent, or hateful.</li>
  <li>Infringes upon any patent, trademark, trade secret, copyright, or intellectual property rights of any third party.</li>
  <li>Contains malicious code, viruses, automated bots, scrapers, or disruptive scripts.</li>
  <li>Promotes unauthorized commercial solicitations or spam.</li>
</ul>

<h3><strong>4. Content Ownership & License</strong></h3>
<p>You retain full ownership of the intellectual property rights in the content you create and post on WotchaGotcha. By posting content, you grant WotchaGotcha a worldwide, non-exclusive, royalty-free license to host, display, distribute, and reproduce such content solely for the purpose of operating and promoting the platform.</p>

<h3><strong>5. Creator Badges, Marketplace & Paid Services</strong></h3>
<ul>
  <li>All purchases, marketplace transactions, banner promotions, and creator badge verification fees are subject to our billing policies.</li>
  <li>Users engaging in commercial transactions via Mondo Market agree to adhere to fair trade, authentic item representations, and prompt fulfillment standards.</li>
</ul>

<h3><strong>6. Termination of Service</strong></h3>
<p>We reserve the right to suspend or terminate your account access without prior notice if you violate these Terms and Conditions, engage in fraudulent behavior, or disrupt the platform community.</p>

<h3><strong>7. Governing Law & Dispute Resolution</strong></h3>
<p>These Terms shall be governed by and construed in accordance with applicable legal jurisdictions without regard to conflict of law provisions.</p>

<h3><strong>8. Contact Information</strong></h3>
<p>For any legal notices, inquiries, or support requests regarding these Terms and Conditions, please contact <a href="mailto:legal@wotcha-gotcha.com">legal@wotcha-gotcha.com</a>.</p>
`.trim();

async function main() {
  console.log("==================================================");
  console.log("📜 SEEDING PRIVACY POLICY & TERMS AND CONDITIONS");
  console.log("==================================================");

  const client = await pool.connect();

  try {
    // 1. PRIVACY POLICY
    await client.query("DELETE FROM privacy_policy");
    const ppRes = await client.query(
      "INSERT INTO privacy_policy (content, created_at, updated_at) VALUES ($1, NOW(), NOW()) RETURNING id",
      [privacyPolicyContent]
    );
    console.log(`✔ Privacy Policy seeded successfully (Record ID: ${ppRes.rows[0].id}).`);

    // 2. TERMS & CONDITIONS
    await client.query("DELETE FROM terms_conditions");
    const tcRes = await client.query(
      "INSERT INTO terms_conditions (content, created_at, updated_at) VALUES ($1, NOW(), NOW()) RETURNING id",
      [termsConditionsContent]
    );
    console.log(`✔ Terms & Conditions seeded successfully (Record ID: ${tcRes.rows[0].id}).`);

    console.log("\n==================================================");
    console.log("🎉 PRIVACY POLICY & TERMS AND CONDITIONS LIVE IN DB!");
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
