import pool from "../db.config/index.js";
import { clearAllCache } from "../utils/cacheService.js";

async function trimVideoManiaTo5PerSubcategory() {
  console.log("==================================================");
  console.log("✂️  TRIMMING VIDEO MANIA TO EXACTLY 5 ITEMS PER SUBCATEGORY");
  console.log("==================================================");

  const client = await pool.connect();

  try {
    await client.query("BEGIN;");

    // 1. Get engaged videos (videos with likes or comments) so we prioritize keeping them
    const engagedRes = await client.query(`
      SELECT DISTINCT video_id FROM like_video WHERE video_id IS NOT NULL
      UNION
      SELECT DISTINCT video_id FROM video_comment WHERE video_id IS NOT NULL
    `);
    const engagedSet = new Set(engagedRes.rows.map((r) => r.video_id));

    // 2. Fetch all subcategories and their videos in Video Mania
    const allVideosRes = await client.query(`
      SELECT 
        v.id,
        v.name,
        v.video_category,
        v.sub_category,
        v.user_id,
        u.username,
        v.created_at
      FROM xpi_videos v
      LEFT JOIN users u ON v.user_id = u.id
      ORDER BY v.video_category, v.sub_category, v.id ASC
    `);

    const subcategoryMap = new Map();
    for (const item of allVideosRes.rows) {
      const subId = item.sub_category;
      if (!subcategoryMap.has(subId)) {
        subcategoryMap.set(subId, []);
      }
      subcategoryMap.get(subId).push(item);
    }

    const keptIds = [];
    const deleteIds = [];

    for (const [subId, items] of subcategoryMap.entries()) {
      // Sort items inside subcategory by priority:
      // 1. Has engagement (likes/comments)
      // 2. Non-umar user (user_id != 2)
      // 3. User diversity
      // 4. Stable ID ascending
      items.sort((a, b) => {
        const engA = engagedSet.has(a.id) ? 1 : 0;
        const engB = engagedSet.has(b.id) ? 1 : 0;
        if (engA !== engB) return engB - engA;

        const nonUmarA = a.user_id !== 2 ? 1 : 0;
        const nonUmarB = b.user_id !== 2 ? 1 : 0;
        if (nonUmarA !== nonUmarB) return nonUmarB - nonUmarA;

        return a.id - b.id;
      });

      // Group to maximize user diversity in kept 5
      const prioritized = [];
      const remainder = [];
      const usersInSub = new Set();
      for (const item of items) {
        if (!usersInSub.has(item.user_id)) {
          usersInSub.add(item.user_id);
          prioritized.push(item);
        } else {
          remainder.push(item);
        }
      }
      const finalSorted = [...prioritized, ...remainder];

      const toKeep = finalSorted.slice(0, 5);
      const toDelete = finalSorted.slice(5);

      toKeep.forEach((i) => keptIds.push(i.id));
      toDelete.forEach((i) => deleteIds.push(i.id));
    }

    console.log(`📊 Initial video count: ${allVideosRes.rows.length}`);
    console.log(`🎯 Videos to keep (5 per subcategory across ${subcategoryMap.size} subcategories): ${keptIds.length}`);
    console.log(`🗑️  Extra videos to remove: ${deleteIds.length}`);

    if (deleteIds.length > 0) {
      const deleteIdsStr = deleteIds.map(String);

      // Clean up any save_item_general rows referencing these videos
      await client.query(
        `DELETE FROM save_item_general 
         WHERE module IN ('videoMania', 'xpi_videos', 'videomania') 
           AND module_item_id = ANY($1::text[])`,
        [deleteIdsStr]
      );

      // Clean up any item_report rows referencing these videos
      await client.query(
        `DELETE FROM item_report 
         WHERE module_type IN ('videoMania', 'xpi_videos', 'videomania') 
           AND item_id = ANY($1::int[])`,
        [deleteIds]
      );

      // If any remaining video has shared_post_id pointing to one of deleteIds, set it to NULL
      await client.query(
        `UPDATE xpi_videos SET shared_post_id = NULL WHERE shared_post_id = ANY($1::int[])`,
        [deleteIds]
      );

      // Delete the extra records from xpi_videos
      const deleteResult = await client.query(
        `DELETE FROM xpi_videos WHERE id = ANY($1::int[]) RETURNING id`,
        [deleteIds]
      );
      console.log(`✔ Successfully deleted ${deleteResult.rowCount} extra video records.`);
    }

    // Verification check
    const finalCountRes = await client.query("SELECT COUNT(*)::int as count FROM xpi_videos");
    const finalTotal = finalCountRes.rows[0].count;
    console.log(`✅ Final total videos in xpi_videos: ${finalTotal}`);

    // Verify per-subcategory distribution
    const subCheck = await client.query(`
      SELECT sub_category, COUNT(*)::int as count
      FROM xpi_videos
      GROUP BY sub_category
      HAVING COUNT(*) != 5
    `);
    if (subCheck.rows.length > 0) {
      console.warn("⚠️ Warning: Some subcategories do not have exactly 5 items:", subCheck.rows);
    } else {
      console.log("🎉 All 105 subcategories now have EXACTLY 5 items!");
    }

    // Verify per-main-category distribution
    const catCheck = await client.query(`
      SELECT vc.id, vc.name, COUNT(v.id)::int as count
      FROM video_category vc
      LEFT JOIN xpi_videos v ON v.video_category = vc.id
      GROUP BY vc.id, vc.name
      ORDER BY vc.id
    `);
    console.table(catCheck.rows);

    await client.query("COMMIT;");
    clearAllCache();
    console.log("✔ Cleared application cache.");
    console.log("🎉 Done!");
  } catch (err) {
    await client.query("ROLLBACK;");
    console.error("❌ Error during trimming:", err);
    throw err;
  } finally {
    client.release();
    process.exit(0);
  }
}

trimVideoManiaTo5PerSubcategory();
