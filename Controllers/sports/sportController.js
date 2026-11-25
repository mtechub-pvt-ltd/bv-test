import pool from "../../db.config/index.js";
import { fetchCommentTree, commentTreeResponse } from "../../utils/commentService.js";
import { toSafeInt } from "../../utils/commentModules.js";
import { buildNestedCommentTree } from "../../utils/commentUtils.js";
import { sendPushNotificationToAll, notifyUser } from "../../utils/notificationService.js";
import { NOTIFICATION_TITLES, NOTIFICATION_MESSAGES } from "../../utils/notificationStrings.js";
import {
  normalizeSeparateMediaFields,
  mergeSeparateMediaForUpdate,
  resolveModuleVideoThumbnail,
  mapSportRow,
} from "../../utils/mediaFields.js";
import { interleaveBadgeSearchResults, paginateBadgeSearchResults } from "../../utils/badgeSearchPagination.js";

export const create = async (req, res) => {
  try {
    const { name, description, category_id, category, main_category_id, sub_category_id, sub_category, user_id, image, video, thumbnail, type, shared_post_id } =
      req.body;
    const media = normalizeSeparateMediaFields({ image, video, type });
    const thumb = resolveModuleVideoThumbnail({ media, thumbnail });
    if (media.type === "video") {
      media.image = "";
    }
    const categoryVal = category_id || category || main_category_id || null;
    const subCategoryVal = sub_category_id || sub_category || null;

    const checkUserQuery =
      "SELECT * FROM users WHERE id = $1 AND is_deleted=FALSE";
    const checkUserResult = await pool.query(checkUserQuery, [user_id]);

    if (checkUserResult.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "User does not exist" });
    }


    const createQuery = `
            INSERT INTO sports (name, description, image, video, thumbnail, type, user_id, category_id, sub_category_id, shared_post_id) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
            RETURNING *
        `;
    const result = await pool.query(createQuery, [
      name || "",
      description || "",
      media.image,
      media.video,
      thumb,
      media.type,
      user_id,
      categoryVal,
      subCategoryVal,
      shared_post_id || null,
    ]);

    if (result.rowCount === 1) {
      const query = `
                SELECT
                    v.id AS id,
                    v.name AS name,
                    v.description AS description, 
                    v.image AS image,
                    v.video AS video,
                    v.thumbnail AS thumbnail,
                    v.type AS type,
                    vc.name AS category_name,
                    vsc.name AS sub_category_name,
                    v.user_id AS user_id,
                    v.shared_post_id,
                    u.username AS username,
                    u.image AS userImage,
                    u.is_premium AS premium,
                    v.created_at AS created_at,
                    orig.name AS original_name,
                    orig.description AS original_description,
                    orig.image AS original_image,
                    orig.video AS original_video,
                    orig.thumbnail AS original_thumbnail,
                    orig.type AS original_type,
                    orig_u.username AS original_username,
                    orig_u.image AS original_user_image,
                    orig.user_id AS original_user_id,
                    orig.created_at AS original_created_at
                FROM sports v
                JOIN users u ON v.user_id = u.id
                LEFT JOIN sports_category vc ON v.category_id = vc.id
                LEFT JOIN sport_sub_category vsc ON v.sub_category_id = vsc.id
                LEFT JOIN sports orig ON v.shared_post_id = orig.id
                LEFT JOIN users orig_u ON orig.user_id = orig_u.id
                WHERE v.id = $1
                GROUP BY v.id, u.username, u.image, u.is_premium, vc.name, vsc.name, orig.id, orig_u.id, orig.user_id
            `;
      const data = await pool.query(query, [result.rows[0].id]);
      const sportData = mapSportRow(data.rows[0]);
      try {
        const title = NOTIFICATION_TITLES.NEW_SPORT;
        const body = NOTIFICATION_MESSAGES.NEW_SPORT_DESC(name || "New Sport activity");
        sendPushNotificationToAll(title, body, { 
          moduleId: 'sports', 
          itemId: String(sportData.id) 
        }, sportData.original_user_id);
      } catch (err) {
        console.warn('Push notification failed:', err.message);
      }

      return res.status(201).json({
        statusCode: 201,
        message: "Sport created successfully",
        data: sportData,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const update = async (req, res) => {
  try {
    const {
      id,
      name,
      description,
      category_id,
      category,
      main_category_id,
      sub_category_id,
      sub_category,
      user_id,
      image,
      video,
      thumbnail,
      type,
    } = req.body;

    const checkQuery1 =
      "SELECT * FROM users WHERE id = $1 AND is_deleted=FALSE";
    const checkResult1 = await pool.query(checkQuery1, [user_id]);

    if (checkResult1.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "user not exist" });
    }

    const checkSportQuery = "SELECT * FROM sports WHERE id = $1";
    const checkSportResult = await pool.query(checkSportQuery, [id]);

    if (checkSportResult.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "Sport not exist" });
    }

    const existing = checkSportResult.rows[0];
    const media = mergeSeparateMediaForUpdate(
      { image, video, type },
      { image: existing.image, video: existing.video, type: existing.type }
    );
    const thumb = resolveModuleVideoThumbnail({ media, thumbnail, existing });
    if (media.type === "video") {
      media.image = "";
    }
    const categoryVal =
      category_id ?? category ?? main_category_id ?? existing.category_id;
    const subCategoryVal =
      sub_category_id ?? sub_category ?? existing.sub_category_id;

    const updateQuery =
      "UPDATE sports SET name=$1, description=$2, category_id=$3, sub_category_id=$4, image=$5, video=$6, thumbnail=$7, type=$8, user_id=$9 WHERE id=$10 RETURNING *";
    const result = await pool.query(updateQuery, [
      name ?? existing.name,
      description ?? existing.description,
      categoryVal,
      subCategoryVal,
      media.image,
      media.video,
      thumb,
      media.type,
      user_id,
      id,
    ]);

    if (result.rowCount === 1) {
      const query = `SELECT
        v.id AS id,
        v.name AS name,
        v.description AS description, 
        v.image AS image,
        v.video AS video,
        v.thumbnail AS thumbnail,
        v.type AS type,
        vc.name AS category_name,
        vsc.name AS sub_category_name,
        v.user_id AS user_id,
        v.shared_post_id,
        u.username AS username,
        u.image AS userImage,
        u.is_premium AS premium,
        u.badge AS badge,
        u.is_subscribed AS is_subscribed,
        v.created_at AS created_at,
        orig.name AS original_name,
        orig.description AS original_description,
        orig.image AS original_image,
        orig.video AS original_video,
        orig.thumbnail AS original_thumbnail,
        orig.type AS original_type,
        orig_u.username AS original_username,
        orig_u.image AS original_user_image,
        orig_u.badge AS original_badge,
        orig_u.is_subscribed AS original_is_subscribed,
        orig.created_at AS original_created_at
    FROM sports v
    JOIN users u ON v.user_id = u.id
    LEFT JOIN sports_category vc ON v.category_id = vc.id
    LEFT JOIN sport_sub_category vsc ON v.sub_category_id = vsc.id
    LEFT JOIN sports orig ON v.shared_post_id = orig.id
    LEFT JOIN users orig_u ON orig.user_id = orig_u.id
    WHERE v.id = $1
    GROUP BY v.id, u.username, u.image, u.is_premium, u.badge, u.is_subscribed, vc.name, vsc.name, orig.id, orig_u.id, orig_u.badge, orig_u.is_subscribed;
    
     `;
      const data = await pool.query(query, [result.rows[0].id]);
      const sportData = mapSportRow(data.rows[0]);
      return res.status(200).json({
        statusCode: 200,
        message: "Sport updated successfully",
        data: sportData,
      });
    }
  } catch (error) {
    console.error(error);
    if (error.constraint === "sports_user_id_fkey") {
      return res
        .status(400)
        .json({ statusCode: 400, message: "user not found" });
    } else if (error.constraint === "sports_category_id_fkey") {
      return res
        .status(400)
        .json({ statusCode: 400, message: "category not found" });
    } else if (error.constraint === "sports_sub_category_id_fkey") {
      return res
        .status(400)
        .json({ statusCode: 400, message: "sub category not found" });
    }
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const deleteSport = async (req, res) => {
  try {
    const { id } = req.params;

    const checkSportQuery = "SELECT * FROM sports WHERE id = $1";
    const checkSportResult = await pool.query(checkSportQuery, [id]);

    if (checkSportResult.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "Sport not exist" });
    }

    const deleteQuery = "DELETE FROM sports WHERE id=$1 RETURNING *";
    const result = await pool.query(deleteQuery, [id]);

    if (result.rowCount === 1) {
      return res.status(200).json({
        statusCode: 200,
        message: "Sport deleted successfully",
        data: result.rows[0],
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const deleteAllSports = async (req, res) => {
  try {
    const deleteQuery = "DELETE FROM sports RETURNING *";
    const result = await pool.query(deleteQuery);

    if (result.rowCount > 0) {
      return res.status(200).json({
        statusCode: 200,
        message: "All sports deleted successfully",
        data: result.rows,
      });
    } else {
      return res.status(404).json({
        statusCode: 404,
        message: "No sport found to delete",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const addComment = async (req, res) => {
  try {
    const { sport_id, user_id, comment, parent_comment_id = null } = req.body;

    const checkSportQuery = "SELECT * FROM sports WHERE id = $1";
    const checkSportResult = await pool.query(checkSportQuery, [sport_id]);

    if (checkSportResult.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "Sport not found" });
    }

    const checkUserQuery =
      "SELECT * FROM users WHERE id = $1 AND is_deleted=FALSE";
    const checkUserResult = await pool.query(checkUserQuery, [user_id]);

    if (checkUserResult.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "User not found" });
    }

    const insertQuery =
      "INSERT INTO sport_comment (sport_id, user_id, comment, parent_comment_id) VALUES ($1, $2, $3, $4) RETURNING *";
    const result = await pool.query(insertQuery, [sport_id, user_id, comment, parent_comment_id]);

    if (result.rowCount === 1) {
      // Send Push Notification to Sport Owner
      try {
        const sportOwnerId = checkSportResult.rows[0].user_id;
        const commenterName = checkUserResult.rows[0].username;
        
        if (sportOwnerId && sportOwnerId !== user_id) {
          const title = NOTIFICATION_TITLES.NEW_COMMENT;
          const body = NOTIFICATION_MESSAGES.NEW_COMMENT_DESC(commenterName);
          
          notifyUser({
            sender_id: user_id,
            receiver_id: sportOwnerId,
            title,
            body,
            moduletype: "sports",
            item_id: String(sport_id),
            action: "comment"
          });
        }
      } catch (pushErr) {
        console.error("Comment push notification failed:", pushErr.message);
      }

      return res.status(201).json({
        statusCode: 201,
        message: "Comment added successfully",
        data: result.rows[0],
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const getComments = async (req, res) => {
  try {
    const postId = toSafeInt(req.params.sport_id);
    if (postId === null) {
      return res.status(400).json({ statusCode: 400, message: "Invalid sport id" });
    }

    const checkResult = await pool.query("SELECT id FROM sports WHERE id = $1", [postId]);
    if (checkResult.rowCount === 0) {
      return res.status(404).json({ statusCode: 404, message: "Sport not found" });
    }

    // Shared reader: hides moderated comments, keeps replies under their parent,
    // marks deleted comments / users, adds like counts.
    const result = await fetchCommentTree({
      table: "sport_comment",
      scopeId: postId,
      viewerId: req.authUser?.id ?? null,
      page: req.query.page,
      limit: req.query.limit,
      sort: req.query.sort,
    });
    return res.status(200).json(commentTreeResponse(result));
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};
export const getSubcategoriesWithSportsByCategory = async (req, res) => {
  try {
    const { category_id } = req.params;
    const { subcategory_id, page, limit, user_id } = req.query;
    const specificPage = parseInt(page || 1);
    const specificLimit = parseInt(limit || 5);
    const specificOffset = (specificPage - 1) * specificLimit;
    const defaultLimit = 5;


    // Get all subcategories for the given category
    const subcategoriesQuery = `
      SELECT id, name , french_name, "index", created_at
      FROM sport_sub_category 
      WHERE category_id = $1
      ORDER BY created_at DESC
    `;
    const subcategoriesResult = await pool.query(subcategoriesQuery, [
      category_id,
    ]);

    if (subcategoriesResult.rowCount === 0) {
      return res.status(404).json({
        statusCode: 404,
        message: "No subcategories found for this category",
      });
    }

    const subcategories = subcategoriesResult.rows;

    // Get videos for each subcategory with conditional pagination
    for (let subcategory of subcategories) {
      let videosQuery = `
SELECT
  v.id AS sport_id,
  v.name,
  v.description, 
  v.image,
  v.video,
  v.thumbnail,
  v.type,
  v.user_id,
  v.shared_post_id,
  u.username,
  u.image AS user_image,
  u.is_premium AS premium,
  u.badge AS badge,
  u.is_subscribed AS is_subscribed,
  v.created_at,
  COUNT(DISTINCT CASE WHEN c.is_deleted = FALSE AND c.is_hidden = FALSE THEN c.id END) AS comment_count,
  COUNT(DISTINCT l.id) AS total_likes,
  -- Original post details
  orig.name AS original_name,
  orig.description AS original_description,
  orig.image AS original_image,
  orig.video AS original_video,
  orig.type AS original_type,
  orig_u.username AS original_username,
  orig_u.image AS original_user_image,
  orig_u.badge AS original_badge,
  orig_u.is_subscribed AS original_is_subscribed,
  orig.created_at AS original_created_at,
  bool_or(si.id IS NOT NULL) AS is_saved,
  bool_or(sl.id IS NOT NULL) AS is_liked
FROM sports v
LEFT JOIN users u ON v.user_id = u.id
LEFT JOIN sport_comment c ON v.id = c.sport_id
LEFT JOIN sport_like l ON v.id = l.sport_id
LEFT JOIN sports orig ON v.shared_post_id = orig.id
LEFT JOIN users orig_u ON orig.user_id = orig_u.id
LEFT JOIN save_item_general si ON si.module = 'sports' AND si.module_item_id::int = v.id AND si.user_id = $4
LEFT JOIN sport_like sl ON sl.sport_id = v.id AND sl.user_id = $4
WHERE v.sub_category_id = $1 AND v.status != 'blocked'
GROUP BY v.id, u.username, u.image, u.is_premium, u.badge, u.is_subscribed, orig.name, orig.description, orig.image, orig.video, orig.type, orig_u.username, orig_u.image, orig_u.badge, orig_u.is_subscribed, orig.created_at
ORDER BY v.created_at DESC

      `;

      let sportsResult, countQuery, totalsportsResult, totalSports, totalPages;

      if (subcategory_id && parseInt(subcategory_id) === subcategory.id) {
        // Apply specific pagination for the provided subcategory
        videosQuery += ` LIMIT $2 OFFSET $3`;
        sportsResult = await pool.query(videosQuery, [
          subcategory.id,
          specificLimit,
          specificOffset,
          user_id || null
        ]);

        countQuery = `SELECT COUNT(*) FROM sports WHERE sub_category_id = $1 AND status != 'blocked'`;
        totalsportsResult = await pool.query(countQuery, [subcategory.id]);
        totalSports = totalsportsResult.rows[0].count;
        totalPages = Math.ceil(totalSports / specificLimit);
      } else {
        // Apply default pagination for other subcategories
        videosQuery += ` LIMIT $2 OFFSET $3`;
        sportsResult = await pool.query(videosQuery, [
          subcategory.id,
          defaultLimit,
          0,
          user_id || null
        ]);

        countQuery = `SELECT COUNT(*) FROM sports WHERE sub_category_id = $1 AND status != 'blocked'`;
        totalsportsResult = await pool.query(countQuery, [subcategory.id]);
        totalSports = totalsportsResult.rows[0].count;
        totalPages = Math.ceil(totalSports / defaultLimit);
      }

      subcategory.sub_category_name = subcategory.name;
      subcategory.sub_category_french_name = subcategory.french_name;
      subcategory.sub_category_id = subcategory.id;
      subcategory.sub_category_index = typeof subcategory.index !== 'undefined' ? subcategory.index : null;
      subcategory.Sport_result = {
        totalSports,
        totalPages,
        currentPage:
          parseInt(subcategory_id) === subcategory.id ? specificPage : 1,
        Sports: sportsResult.rows.map(row => ({
          ...row,
          original_post: row.shared_post_id ? {
            id: row.shared_post_id,
            name: row.original_name,
            description: row.original_description,
            image: row.original_image,
            video: row.original_video,
            type: row.original_type,
            username: row.original_username,
            user_image: row.original_user_image,
            created_at: row.original_created_at
          } : null
        })),
      };
      delete subcategory.name;
      delete subcategory.id;
      delete subcategory.french_name;
      delete subcategory.index;
    }

    return res.status(200).json({
      statusCode: 200,
      message: "Subcategories with sports retrieved successfully",
      data: subcategories,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const getSportByUserId = async (req, res) => {
  try {
    const { user_id } = req.params;
    const page = parseInt(req.query.page || 1);
    const perPage = parseInt(req.query.limit || 1000);
    const offset = (page - 1) * perPage;

    // Check if the user exists
    const checkUserQuery =
      "SELECT * FROM users WHERE id = $1 AND is_deleted=FALSE";
    const checkUserResult = await pool.query(checkUserQuery, [user_id]);

    if (checkUserResult.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "User not found" });
    }

    const sportsQuery = `
            SELECT
              v.id AS sport_id,
              v.name,
              v.description, 
              v.image,
      v.video,
      v.thumbnail,
      v.type,
              v.category_id,
              vc.name AS category_name,
              vc.french_name AS category_french_name,
              v.sub_category_id,
              vsc.name AS sub_category_name,
              vsc.french_name AS sub_category_french_name,
              v.user_id,
              v.shared_post_id,
              u.username,
              u.image AS user_image,
              u.is_premium AS premium,
              u.badge AS badge,
              u.is_subscribed AS is_subscribed,
              v.created_at,
              orig.name AS original_name,
              orig.description AS original_description,
              orig.image AS original_image,
              orig.video AS original_video,
              orig.type AS original_type,
              orig_u.username AS original_username,
              orig_u.image AS original_user_image,
              orig_u.badge AS original_badge,
              orig_u.is_subscribed AS original_is_subscribed,
              orig.created_at AS original_created_at,
              COUNT(DISTINCT CASE WHEN c.is_deleted = FALSE AND c.is_hidden = FALSE THEN c.id END) AS comment_count,
              COUNT(DISTINCT l.id) AS total_likes,
              bool_or(sn.id IS NOT NULL) AS is_saved,
              bool_or(sl.id IS NOT NULL) AS is_liked
            FROM sports v
            LEFT JOIN users u ON v.user_id = u.id
            LEFT JOIN sports_category vc ON v.category_id = vc.id
            LEFT JOIN sport_sub_category vsc ON v.sub_category_id = vsc.id
            LEFT JOIN sport_comment c ON v.id = c.sport_id
            LEFT JOIN sport_like l ON v.id = l.sport_id
            LEFT JOIN sports orig ON v.shared_post_id = orig.id
            LEFT JOIN users orig_u ON orig.user_id = orig_u.id
            LEFT JOIN save_item_general sn ON sn.module = 'sports' AND sn.module_item_id::int = v.id AND sn.user_id = $2
            LEFT JOIN sport_like sl ON sl.sport_id = v.id AND sl.user_id = $4
            WHERE v.user_id = $1
            GROUP BY v.id, vc.name, vsc.name, u.username, u.image, u.is_premium, u.badge, u.is_subscribed, vc.french_name, vsc.french_name, orig.id, orig_u.id, orig_u.badge, orig_u.is_subscribed
            ORDER BY v.created_at DESC
            LIMIT $2 OFFSET $3;
        `;

    const sportsResult = await pool.query(sportsQuery, [
      user_id,
      perPage,
      offset,
      req.query.user_id || null
    ]);

    // Corrected the table name to "sports"
    const countQuery = `SELECT COUNT(*) FROM sports WHERE user_id = $1`;
    const totalSportsResult = await pool.query(countQuery, [user_id]);
    const totalSports = parseInt(totalSportsResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalSports / perPage);

    return res.status(200).json({
      statusCode: 200,
      message: "Sports retrieved successfully",
      totalSports,
      totalPages,
      // count: sportsResult.rows.length,
      currentPage: page,
      currentPage: page,
      sports: sportsResult.rows.map((row) => mapSportRow(row)),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const toggleLikeSport = async (req, res) => {
  try {
    const { sport_id, user_id } = req.body;

    // Check if the video exists
    const checkSportQuery = "SELECT * FROM sports WHERE id = $1";
    const checkSportResult = await pool.query(checkSportQuery, [sport_id]);

    if (checkSportResult.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "Sport not found" });
    }

    // Check if the user exists
    const checkUserQuery =
      "SELECT * FROM users WHERE id = $1 AND is_deleted=FALSE";
    const checkUserResult = await pool.query(checkUserQuery, [user_id]);

    if (checkUserResult.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "User not found" });
    }

    // Check if the user already liked the video
    const checkLikeQuery =
      "SELECT * FROM sport_like WHERE sport_id = $1 AND user_id = $2";
    const checkLikeResult = await pool.query(checkLikeQuery, [
      sport_id,
      user_id,
    ]);

    if (checkLikeResult.rowCount > 0) {
      // If the like exists, unlike the video
      const unlikeQuery =
        "DELETE FROM sport_like WHERE sport_id = $1 AND user_id = $2 RETURNING *";
      const unlikeResult = await pool.query(unlikeQuery, [sport_id, user_id]);

      return res.status(200).json({
        statusCode: 200,
        message: "Sport unliked successfully",
        data: unlikeResult.rows[0],
      });
    } else {
      // If the like does not exist, like the video
      const likeQuery = `
        INSERT INTO sport_like (sport_id, user_id)
        VALUES ($1, $2)
        RETURNING *;
      `;
      const likeResult = await pool.query(likeQuery, [sport_id, user_id]);

      if (likeResult.rowCount === 1) {
        // Send Push Notification to owner
        try {
          const postOwnerId = checkSportResult.rows[0].user_id;
          const likerName = checkUserResult.rows[0].username;

          if (postOwnerId && postOwnerId !== user_id) {
            const title = NOTIFICATION_TITLES.POST_LIKED;
            const body = NOTIFICATION_MESSAGES.POST_LIKED_DESC(likerName);
            
          notifyUser({
            sender_id: user_id,
            receiver_id: postOwnerId,
            title,
            body,
            moduletype: 'sports',
            item_id: String(sport_id),
            action: 'like'
          });
          }
        } catch (err) {
          console.warn('Push notification for like failed:', err.message);
        }
      }

      return res.status(201).json({
        statusCode: 201,
        message: "Sport liked successfully",
        data: likeResult.rows[0],
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const getSportsLikes = async (req, res) => {
  try {
    const { sport_id } = req.params;

    if (!sport_id) {
      return res.status(400).json({
        statusCode: 400,
        message: "The 'sport_id' parameter is required.",
      });
    }

    const query = `
      SELECT COUNT(*) AS like_count 
      FROM sport_like 
      WHERE sport_id = $1
    `;

    const detailsQuery = `
      SELECT * FROM sport_like 
      WHERE sport_id = $1
    `;

    const countResult = await pool.query(query, [sport_id]);
    const detailsResult = await pool.query(detailsQuery, [sport_id]);

    const likeCount = parseInt(countResult.rows[0]?.like_count) || 0;

    return res.status(200).json({
      statusCode: 200,
      likes: likeCount,
      allLikes: detailsResult.rows,
    });
  } catch (error) {
    console.error("Error fetching likes:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "An internal server error occurred.",
    });
  }
};

export const searchSportsByTitle = async (req, res) => {
  try {
    const { query } = req.query;
    const page = parseInt(req.query.page || 1);
    const perPage = parseInt(req.query.limit || 1000);

    if (!query) {
      return res.status(400).json({
        statusCode: 400,
        message: "query parameter is required",
      });
    }

    // Search videos by query with pagination
    const searchQuery = `
           SELECT
        v.id AS sport_id,
        v.name,
        v.description, 
        v.image,
      v.video,
      v.thumbnail,
      v.type,
        v.category_id,
        vc.name AS category_name,
        v.sub_category_id,
        vsc.name AS sub_category_name,
        v.user_id,
        v.shared_post_id,
        u.username,
        u.image AS user_image,
        u.is_premium AS premium,
        u.is_subscribed,
        u.badge,
        v.created_at,
        orig.name AS original_name,
        orig.description AS original_description,
        orig.image AS original_image,
        orig.video AS original_video,
        orig.thumbnail AS original_thumbnail,
        orig.type AS original_type,
        orig_u.username AS original_username,
        orig_u.image AS original_user_image,
        orig_u.is_subscribed AS original_is_subscribed,
        orig_u.badge AS original_badge,
        orig.created_at AS original_created_at,
        COALESCE(likes.total_likes, 0) AS total_likes,
        bool_or(sn.id IS NOT NULL) AS is_saved,
        bool_or(sl.id IS NOT NULL) AS is_liked
      FROM sports v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN sports_category vc ON v.category_id = vc.id
      LEFT JOIN sport_sub_category vsc ON v.sub_category_id = vsc.id
      LEFT JOIN sports orig ON v.shared_post_id = orig.id
      LEFT JOIN users orig_u ON orig.user_id = orig_u.id
      LEFT JOIN (
        SELECT sport_id, COUNT(*) AS total_likes
        FROM sport_like
        GROUP BY sport_id
      ) likes ON v.id = likes.sport_id
      LEFT JOIN save_item_general sn ON sn.module = 'sports' AND sn.module_item_id::int = v.id AND sn.user_id = $2
      LEFT JOIN sport_like sl ON sl.sport_id = v.id AND sl.user_id = $2
      WHERE (v.name ILIKE $1 OR v.description ILIKE $1 OR u.username ILIKE $1 OR u.username ILIKE $3 OR orig_u.username ILIKE $1 OR orig_u.username ILIKE $3)
      GROUP BY v.id, vc.name, vsc.name, u.username, u.image, u.is_premium, u.is_subscribed, u.badge, orig.id, orig_u.id, orig_u.is_subscribed, orig_u.badge, likes.total_likes
      ORDER BY (CASE WHEN u.badge ILIKE '%gold%' THEN 1 WHEN u.badge ILIKE '%blue%' THEN 2 ELSE 3 END) ASC, v.created_at DESC
        `;

    const cleanQuery = (query || "").replace(/^@+/, "");
    const searchResult = await pool.query(searchQuery, [
      `%${query}%`,
      req.query.user_id || null,
      `%${cleanQuery}%`,
    ]);

    const paginated = paginateBadgeSearchResults(searchResult.rows, page, perPage, {
      dateFields: ["created_at"],
    });

    return res.status(200).json({
      statusCode: 200,
      message: "Sports retrieved successfully",
      totalSports: paginated.total,
      totalPages: paginated.totalPages,
      currentPage: paginated.currentPage,
      sports: paginated.rows.map((row) => mapSportRow(row)),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const getTotal = async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*) AS total FROM sports");
    return res.status(200).json({ statusCode: 200, total: parseInt(result.rows[0].total) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const getSpecificSport = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.query.user_id || null;

    const query = `
      SELECT
        v.id AS sport_id,
        v.id AS id,
        v.name,
        v.description,
        v.thumbnail,
        v.image,
        v.video,
        v.type,
        vc.name AS category_name,
        vsc.name AS sub_category_name,
        v.user_id,
        u.username,
        u.image AS user_image,
        u.is_premium AS premium,
        u.badge,
        u.is_subscribed,
        v.created_at,
        v.shared_post_id,
        orig.name AS original_name,
        orig.description AS original_description,
        orig.image AS original_image,
        orig.video AS original_video,
        orig_u.username AS original_username,
        orig_u.image AS original_user_image,
        orig.created_at AS original_created_at,
        COUNT(DISTINCT CASE WHEN c.is_deleted = FALSE AND c.is_hidden = FALSE THEN c.id END) AS comment_count,
        COUNT(DISTINCT l.id) AS total_likes,
        bool_or(sn.id IS NOT NULL) AS is_saved,
        bool_or(sl.id IS NOT NULL) AS is_liked
      FROM sports v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN sports_category vc ON v.category_id = vc.id
      LEFT JOIN sport_sub_category vsc ON v.sub_category_id = vsc.id
      LEFT JOIN sport_comment c ON v.id = c.sport_id
      LEFT JOIN sport_like l ON v.id = l.sport_id
      LEFT JOIN sports orig ON v.shared_post_id = orig.id
      LEFT JOIN users orig_u ON orig.user_id = orig_u.id
      LEFT JOIN save_item_general sn ON sn.module = 'sports' AND sn.module_item_id::int = v.id AND sn.user_id = $2
      LEFT JOIN sport_like sl ON sl.sport_id = v.id AND sl.user_id = $2
      WHERE v.id = $1
      GROUP BY v.id, vc.name, vsc.name, u.username, u.image, u.is_premium, u.badge, u.is_subscribed, orig.id, orig_u.id;
    `;

    const { rows } = await pool.query(query, [id, user_id]);
    if (rows.length > 0) {
      const data = rows[0];
      if (data.shared_post_id) {
        data.original_post = {
          id: data.shared_post_id,
          name: data.original_name,
          description: data.original_description,
          image: data.original_image,
          video: data.original_video,
          username: data.original_username,
          user_image: data.original_user_image,
          created_at: data.original_created_at,
        };
      }
      return res.status(200).json({ statusCode: 200, sport: data, sports: data, video: data, data: data });
    }
    return res.status(404).json({ statusCode: 404, message: "Sport post not found" });
  } catch (error) {
    console.error("getSpecificSport error:", error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};
