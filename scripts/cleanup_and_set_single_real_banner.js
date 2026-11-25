import pool from "../db.config/index.js";
import { clearAllCache } from "../utils/cacheService.js";

const LIVE_BASE_URL = "https://wocha-gocha.testing.mtechub.org";
const REAL_BANNER_URL = "https://wocha-gocha.testing.mtechub.org/fileUpload/1c0d28c3-830b-4197-b0fc-4827ea5101cb-1792148704138.jpg";

async function main() {
  console.log("==========================================================");
  console.log("🚀 CLEANING UP BANNERS & CONFIGURING SINGLE REAL BANNER");
  console.log("==========================================================");

  // 1. Verify image HEAD
  console.log("1. Verifying real banner image availability...");
  const imgRes = await fetch(REAL_BANNER_URL, { method: "HEAD" });
  console.log(`   Image HTTP status: ${imgRes.status} ${imgRes.statusText}`);
  if (!imgRes.ok) {
    throw new Error(`Real banner image check failed with status ${imgRes.status}`);
  }

  // 2. Clear all extra banners from database
  console.log("\n2. Removing all extra banners from database...");
  const delRes = await pool.query("DELETE FROM banner");
  console.log(`   Deleted ${delRes.rowCount} previous banner rows.`);

  // 3. Insert the single real general banner
  console.log("\n3. Inserting single real general banner for video_category...");
  const insertRes = await pool.query(
    `INSERT INTO banner (
      image,
      user_id,
      banner_link,
      category_table,
      category_id,
      price,
      startdate,
      enddate,
      status,
      top_banner,
      paid_status,
      created_at,
      updated_at,
      transaction_id
    ) VALUES (
      $1,
      2,
      NULL,
      'video_category',
      NULL,
      '100',
      '2026-01-01',
      '2030-12-31',
      'active',
      true,
      true,
      NOW(),
      NOW(),
      'tx_real_general_banner'
    ) RETURNING *`,
    [REAL_BANNER_URL]
  );
  console.log("   Inserted banner record:", insertRes.rows[0]);

  // 4. Invalidate all cache
  console.log("\n4. Purging application Redis/memory cache...");
  try {
    await clearAllCache();
    console.log("   ✔ Application cache purged successfully.");
  } catch (err) {
    console.warn("   Cache purge notice:", err.message);
  }

  // 5. Verify database counts
  console.log("\n5. Database verification:");
  const totalBanners = (await pool.query("SELECT COUNT(*)::int as count FROM banner")).rows[0].count;
  const activeBanners = (await pool.query("SELECT COUNT(*)::int as count FROM banner WHERE status = 'active'")).rows[0].count;
  const byModule = (await pool.query("SELECT category_table, COUNT(*)::int as count FROM banner GROUP BY category_table")).rows;

  console.log({
    totalBanners,
    activeBanners,
    byModule,
  });

  // 6. Verify live API response
  console.log("\n6. Live API verification:");
  for (const mod of ["video_category", "pic_category", "tv_progmax_category"]) {
    try {
      const apiRes = await fetch(`${LIVE_BASE_URL}/banner/getByModule?module=${mod}`);
      const data = await apiRes.json();
      console.log(`   /banner/getByModule?module=${mod} -> HTTP ${apiRes.status}, count = ${data.totalBanners || data.banners?.length || 0}`);
      if (data.banners && data.banners.length > 0) {
        console.log(`      Banner image: ${data.banners[0].image}`);
        console.log(`      Banner module: ${data.banners[0].category_table}`);
      }
    } catch (e) {
      console.warn(`   Failed to query API for ${mod}:`, e.message);
    }
  }

  console.log("\n==========================================================");
  console.log("🎉 SINGLE REAL GENERAL BANNER SETUP COMPLETE!");
  console.log("==========================================================");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
