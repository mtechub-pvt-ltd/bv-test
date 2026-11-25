import pool from "../../db.config/index.js";
import { getOrSetCache } from "../../utils/cacheService.js";

/**
 * Combined API GET /v2/app/categories/all
 * Returns all 13 module category lists in a single JSON payload.
 * Cached in server RAM for 5 minutes (300 seconds).
 */
export const getAllAppCategoriesV2 = async (req, res) => {
  try {
    const data = await getOrSetCache("v2_all_app_categories", 300, async () => {
      const [
        videoRes,
        picRes,
        newsRes,
        qafiRes,
        gebcRes,
        sportsRes,
        itemRes,
        tvRes,
        kidRes,
        learningRes,
        fanStarRes,
        cinematicRes,
        letterRes,
      ] = await Promise.all([
        pool.query(`
          SELECT c.*, COUNT(sc.id) AS sub_category_count
          FROM video_category c
          LEFT JOIN video_sub_category sc ON c.id = sc.category_id
          GROUP BY c.id
          ORDER BY c.created_at DESC
        `),
        pool.query(`
          SELECT c.*, COUNT(sc.id) AS sub_category_count
          FROM pic_category c
          LEFT JOIN pic_sub_category sc ON c.id = sc.category_id
          GROUP BY c.id
          ORDER BY c.created_at DESC
        `),
        pool.query(`
          SELECT c.*, COUNT(sc.id) AS sub_category_count
          FROM news_category c
          LEFT JOIN news_sub_category sc ON c.id = sc.category_id
          GROUP BY c.id
          ORDER BY c.created_at DESC
        `),
        pool.query(`
          SELECT c.*, COUNT(sc.id) AS sub_category_count
          FROM qafi_category c
          LEFT JOIN qafi_sub_category sc ON c.id = sc.category_id
          GROUP BY c.id
          ORDER BY c.created_at DESC
        `),
        pool.query(`
          SELECT c.*, COUNT(sc.id) AS sub_category_count
          FROM gebc_category c
          LEFT JOIN gebc_sub_category sc ON c.id = sc.category_id
          GROUP BY c.id
          ORDER BY c.created_at DESC
        `),
        pool.query(`
          SELECT c.*, COUNT(sc.id) AS sub_category_count
          FROM sports_category c
          LEFT JOIN sport_sub_category sc ON c.id = sc.category_id
          GROUP BY c.id
          ORDER BY c.created_at DESC
        `),
        pool.query(`
          SELECT c.*, COUNT(sc.id) AS sub_category_count
          FROM item_category c
          LEFT JOIN item_sub_category sc ON c.id = sc.category_id
          GROUP BY c.id
          ORDER BY c.created_at DESC
        `),
        pool.query(`
          SELECT c.*, COUNT(sc.id) AS sub_category_count
          FROM tv_progmax_category c
          LEFT JOIN tv_progmax_sub_category sc ON c.id = sc.category_id
          GROUP BY c.id
          ORDER BY COALESCE(c.index, 9999) ASC, c.id ASC
        `),
        pool.query(`
          SELECT c.*, COUNT(sc.id) AS sub_category_count
          FROM kid_vids_category c
          LEFT JOIN kid_vids_sub_category sc ON c.id = sc.category_id
          GROUP BY c.id
          ORDER BY c.created_at DESC
        `),
        pool.query(`
          SELECT c.*, COUNT(sc.id) AS sub_category_count
          FROM learning_hobbies_category c
          LEFT JOIN learning_hobbies_sub_category sc ON c.id = sc.category_id
          GROUP BY c.id
          ORDER BY c.created_at DESC
        `),
        pool.query(`
          SELECT c.*, COUNT(sc.id) AS sub_category_count
          FROM fan_star_category c
          LEFT JOIN fan_star_sub_category sc ON c.id = sc.category_id
          GROUP BY c.id
          ORDER BY c.created_at DESC
        `),
        pool.query(`
          SELECT c.*, COUNT(sc.id) AS sub_category_count
          FROM cinematics_category c
          LEFT JOIN cinematics_sub_category sc ON c.id = sc.category_id
          GROUP BY c.id
          ORDER BY c.created_at DESC
        `),
        pool.query(`
          SELECT c.*, COUNT(sc.id) AS sub_category_count
          FROM disc_category c
          LEFT JOIN disc_sub_category sc ON c.id = sc.category_id
          GROUP BY c.id
          ORDER BY c.created_at DESC
        `),
      ]);

      return {
        statusCode: 200,
        videoCategories: videoRes.rows || [],
        picCategories: picRes.rows || [],
        newsCategories: newsRes.rows || [],
        qafiCategories: qafiRes.rows || [],
        gebcCategories: gebcRes.rows || [],
        sportsCategories: sportsRes.rows || [],
        itemCategories: itemRes.rows || [],
        tvProgmaxCategories: tvRes.rows || [],
        kidVidsCategories: kidRes.rows || [],
        learningHobbiesCategories: learningRes.rows || [],
        fanStarCategories: fanStarRes.rows || [],
        cinematicCategories: cinematicRes.rows || [],
        openLetterCategories: letterRes.rows || [],
      };
    });

    return res.status(200).json(data);
  } catch (error) {
    console.error("Error in getAllAppCategoriesV2:", error);
    return res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};
