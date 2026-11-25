import pool from "../../db.config/index.js";
import { fetchCommentTree, commentTreeResponse } from "../../utils/commentService.js";
import { toSafeInt } from "../../utils/commentModules.js";
import { buildNestedCommentTree } from "../../utils/commentUtils.js";
import { sendPushNotificationToAll, notifyUser } from "../../utils/notificationService.js";
import { NOTIFICATION_TITLES, NOTIFICATION_MESSAGES } from "../../utils/notificationStrings.js";
import { interleaveBadgeSearchResults, paginateBadgeSearchResults } from "../../utils/badgeSearchPagination.js";
import { checkDailyVideoUploadLimit } from "../../utils/uploadLimits.js";

export const create = async (req, res) => { 
  try {
    const {
      name, 
      description,
      category_id, 
      category,
      main_category_id,
      sub_category_id,
      sub_category,
      user_id,
      video,
      thumbnail,
      shared_post_id,
    } = req.body;
    const categoryVal = category_id || category || main_category_id || null;
    const subCategoryVal = sub_category_id || sub_category || null;
    const checkQuery1 =
      "SELECT * FROM users WHERE id = $1 AND is_deleted=FALSE";
    const checkResult1 = await pool.query(checkQuery1, [user_id]);

    if (checkResult1.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "user not exist" });
    }

    if (!shared_post_id) {
      const limitCheck = await checkDailyVideoUploadLimit(pool, user_id);
      if (!limitCheck.allowed) {
        return res.status(403).json({
          statusCode: 403,
          message: limitCheck.message,
        });
      }
    }
    const createQuery =
      "INSERT INTO cinematics_videos (name, description, video, user_id, thumbnail, category_id, sub_category_id, shared_post_id) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *";
    const result = await pool.query(createQuery, [
      name || "",
      description || "",
      video || "",
      user_id,
      thumbnail || "",
      categoryVal,
      subCategoryVal,
      shared_post_id || null,
    ]);
    if (result.rowCount === 1) {
      const query = `SELECT
        v.id AS id,
        v.name AS name,
        v.description AS description,
        v.thumbnail As thumbnail,
        v.video AS video,
        vc.name AS category_name,
        vsc.name AS sub_category_name,
        NULL AS french_category_name,
        NULL AS french_sub_category_name,
        v.user_id AS user_id,
        v.shared_post_id,
        u.username AS username,
        u.image AS userImage,
        u.is_premium AS premium,
        v.created_at AS created_at,
        orig.name AS original_name,
        orig.description AS original_description,
        orig.video AS original_video,
        orig.thumbnail AS original_thumbnail,
        orig_u.username AS original_username,
        orig_u.image AS original_user_image,
        orig_u.is_premium AS original_premium,
        orig.created_at AS original_created_at
      FROM cinematics_videos v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN cinematics_category vc ON v.category_id = vc.id
      LEFT JOIN cinematics_sub_category vsc ON v.sub_category_id = vsc.id
      LEFT JOIN cinematics_videos orig ON v.shared_post_id = orig.id
      LEFT JOIN users orig_u ON orig.user_id = orig_u.id
      WHERE v.id = $1
      GROUP BY v.id, u.username, u.image, u.is_premium, vc.name, vsc.name, orig.id, orig_u.id, orig_u.is_premium;`;
      const data = await pool.query(query, [result.rows[0].id]);
      const videoData = data.rows[0];
      if (videoData.shared_post_id) {
        videoData.original_post = {
          id: videoData.shared_post_id,
          name: videoData.original_name,
          description: videoData.original_description,
          video: videoData.original_video,
          thumbnail: videoData.original_thumbnail,
          username: videoData.original_username,
          user_image: videoData.original_user_image,
          premium: videoData.original_premium,
          created_at: videoData.original_created_at,
        };
      } else {
        videoData.original_post = null;
      }

      // Send Push Notification
      try {
        const titleC = NOTIFICATION_TITLES.NEW_CINEMATIC;
        const bodyC = NOTIFICATION_MESSAGES.NEW_CINEMATIC_DESC(name || "New Cinematic video");
        sendPushNotificationToAll(titleC, bodyC, { 
          moduleId: 'cinematics_videos', 
          itemId: String(videoData.id) 
        });
      } catch (err) {
        console.warn('Push notification failed:', err.message);
      }

      return res.status(201).json({
        statusCode: 201,
        message: "Cinematic video created successfully",
        data: videoData,
      });
    }
  } catch (error) {
    console.error(error);
    if (error.constraint === "cinematics_videos_user_id_fkey") {
      return res
        .status(400)
        .json({ statusCode: 400, message: "user not found" });
    } else if (error.constraint === "cinematics_videos_category_id_fkey") {
      return res
        .status(400)
        .json({ statusCode: 400, message: "category not found" });
    } else if (error.constraint === "cinematics_videos_category_id_fkey") {
      return res
        .status(400)
        .json({ statusCode: 400, message: "sub category not found" });
    }
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
      sub_category_id,
      user_id,
      video,
      thumbnail,
    } = req.body;

    const checkQuery1 =
      "SELECT * FROM users WHERE id = $1 AND is_deleted=FALSE";
    const checkResult1 = await pool.query(checkQuery1, [user_id]);

    if (checkResult1.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "user not exist" });
    }

    const checkVideoQuery = "SELECT * FROM cinematics_videos WHERE id = $1";
    const checkVideoResult = await pool.query(checkVideoQuery, [id]);

    if (checkVideoResult.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "Cinematic video not exist" });
    }

    const updateQuery =
      "UPDATE cinematics_videos SET name=$1, description=$2, category_id=$3, sub_category_id=$4, video=$5, thumbnail=$6, user_id=$7 WHERE id=$8 RETURNING *";
    const result = await pool.query(updateQuery, [
      name,
      description,
      category_id,
      sub_category_id,
      video,
      thumbnail,
      user_id,
      id,
    ]);

    if (result.rowCount === 1) {
      const query = `SELECT
        v.id AS id,
        v.name AS name,
        v.description AS description,
        v.thumbnail As thumbnail,
        v.video AS video,
        vc.name AS category_name,
        vsc.name AS sub_category_name,
        NULL AS french_category_name,
        NULL AS french_sub_category_name,
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
        orig.video AS original_video,
        orig.thumbnail AS original_thumbnail,
        orig_u.username AS original_username,
        orig_u.image AS original_user_image,
        orig_u.is_premium AS original_premium,
        orig_u.badge AS original_badge,
        orig_u.is_subscribed AS original_is_subscribed,
        orig.created_at AS original_created_at
      FROM cinematics_videos v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN cinematics_category vc ON v.category_id = vc.id
      LEFT JOIN cinematics_sub_category vsc ON v.sub_category_id = vsc.id
      LEFT JOIN cinematics_videos orig ON v.shared_post_id = orig.id
      LEFT JOIN users orig_u ON orig.user_id = orig_u.id
      WHERE v.id = $1
      GROUP BY v.id, u.username, u.image, u.is_premium, u.badge, u.is_subscribed, vc.name, vsc.name, orig.id, orig_u.id, orig_u.is_premium, orig_u.badge, orig_u.is_subscribed;`;
      const data = await pool.query(query, [result.rows[0].id]);
      const videoData = data.rows[0];
      if (videoData.shared_post_id) {
        videoData.original_post = {
          id: videoData.shared_post_id,
          name: videoData.original_name,
          description: videoData.original_description,
          video: videoData.original_video,
          thumbnail: videoData.original_thumbnail,
          username: videoData.original_username,
          user_image: videoData.original_user_image,
          premium: videoData.original_premium,
          badge: videoData.original_badge,
          is_subscribed: videoData.original_is_subscribed,
          created_at: videoData.original_created_at,
        };
      } else {
        videoData.original_post = null;
      }
      return res.status(200).json({
        statusCode: 200,
        message: "Cinematic video updated successfully",
        data: videoData,
      });
    }
  } catch (error) {
    console.error(error);
    if (error.constraint === "cinematics_videos_user_id_fkey") {
      return res
        .status(400)
        .json({ statusCode: 400, message: "user not found" });
    } else if (error.constraint === "cinematics_videos_category_id_fkey") {
      return res
        .status(400)
        .json({ statusCode: 400, message: "category not found" });
    } else if (error.constraint === "cinematics_videos_sub_category_id_fkey") {
      return res
        .status(400)
        .json({ statusCode: 400, message: "sub category not found" });
    }
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;

    const checkVideoQuery = "SELECT * FROM cinematics_videos WHERE id = $1";
    const checkVideoResult = await pool.query(checkVideoQuery, [id]);

    if (checkVideoResult.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "Cinematic video not exist" });
    }

    const deleteQuery = "DELETE FROM cinematics_videos WHERE id=$1 RETURNING *";
    const result = await pool.query(deleteQuery, [id]);

    if (result.rowCount === 1) {
      return res.status(200).json({
        statusCode: 200,
        message: "Cinematic video deleted successfully",
        data: result.rows[0],
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const deleteAllVideos = async (req, res) => {
  try {
    const deleteQuery = "DELETE FROM cinematics_videos RETURNING *";
    const result = await pool.query(deleteQuery);

    if (result.rowCount > 0) {
      return res.status(200).json({
        statusCode: 200,
        message: "All cinematic videos deleted successfully",
        data: result.rows,
      });
    } else {
      return res.status(404).json({
        statusCode: 404,
        message: "No cinematic videos found to delete",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const addComment = async (req, res) => {
  try {
    const { video_id, user_id, comment, parent_comment_id = null } = req.body;

    const checkVideoQuery = "SELECT * FROM cinematics_videos WHERE id = $1";
    const checkVideoResult = await pool.query(checkVideoQuery, [video_id]);

    if (checkVideoResult.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "Cinematic Video not found" });
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
      'INSERT INTO cinematics_video_comment (video_id, user_id, comment, parent_comment_id) VALUES ($1, $2, $3, $4) RETURNING id, video_id, user_id, comment, created_at AS "commentCreatedAt", updated_at';
    const result = await pool.query(insertQuery, [video_id, user_id, comment, parent_comment_id]);

    if (result.rowCount === 1) {
      // Send Push Notification to Video Owner
      try {
        const videoOwnerId = checkVideoResult.rows[0].user_id;
        const commenterName = checkUserResult.rows[0].username;
        
        if (videoOwnerId && videoOwnerId !== user_id) {
          const title = NOTIFICATION_TITLES.NEW_COMMENT;
          const body = NOTIFICATION_MESSAGES.NEW_COMMENT_DESC(commenterName);
          
          notifyUser({
            sender_id: user_id,
            receiver_id: videoOwnerId,
            title,
            body,
            moduletype: "cinematics",
            item_id: String(video_id),
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
    const postId = toSafeInt(req.params.video_id);
    if (postId === null) {
      return res.status(400).json({ statusCode: 400, message: "Invalid video id" });
    }

    const checkResult = await pool.query("SELECT id FROM cinematics_videos WHERE id = $1", [postId]);
    if (checkResult.rowCount === 0) {
      return res.status(404).json({ statusCode: 404, message: "Video not found" });
    }

    // Shared reader: hides moderated comments, keeps replies under their parent,
    // marks deleted comments / users, adds like counts.
    const result = await fetchCommentTree({
      table: "cinematics_video_comment",
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
export const getSubcategoriesWithVideosByCategory = async (req, res) => {
  try {
    const { category_id } = req.params;
    const { subcategory_id, page, limit, user_id } = req.query;
    const specificPage = parseInt(page || 1);
    const specificLimit = parseInt(limit || 5);
    const specificOffset = (specificPage - 1) * specificLimit;
    const defaultLimit = 5;


    // Check if the category exists
    const checkCategoryQuery =
      "SELECT * FROM cinematics_category WHERE id = $1";
    const checkCategoryResult = await pool.query(checkCategoryQuery, [
      category_id,
    ]);

    if (checkCategoryResult.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "Category not found" });
    }

    // Get all subcategories for the given category
    const subcategoriesQuery = `
      SELECT id, name, french_name, "index", created_at
      FROM cinematics_sub_category 
      WHERE category_id = $1
      ORDER BY "index" ASC, id ASC
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
          v.id AS video_id,
          v.name,
          v.description,
          v.thumbnail,
          v.video,
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
          --Original post details
          orig.name AS original_name,
          orig.description AS original_description,
          orig.video AS original_video,
          orig.thumbnail AS original_thumbnail,
          orig_u.username AS original_username,
          orig_u.image AS original_user_image,
          orig_u.is_premium AS original_premium,
          orig_u.badge AS original_badge,
          orig_u.is_subscribed AS original_is_subscribed,
          orig.created_at AS original_created_at,
          bool_or(si.id IS NOT NULL) AS is_saved,
          bool_or(sl.id IS NOT NULL) AS is_liked
        FROM cinematics_videos v
        LEFT JOIN users u ON v.user_id = u.id
        LEFT JOIN cinematics_video_comment c ON v.id = c.video_id
        LEFT JOIN cinematics_video_like l ON v.id = l.video_id
        LEFT JOIN cinematics_videos orig ON v.shared_post_id = orig.id
        LEFT JOIN users orig_u ON orig.user_id = orig_u.id
        LEFT JOIN save_item_general si ON si.module = 'cinematics' AND si.module_item_id::int = v.id AND si.user_id = $4
        LEFT JOIN cinematics_video_like sl ON sl.video_id = v.id AND sl.user_id = $4
        WHERE v.sub_category_id = $1 AND v.status != 'blocked'
        GROUP BY v.id, u.username, u.image, u.is_premium, u.badge, u.is_subscribed, orig.name, orig.description, orig.video, orig.thumbnail, orig_u.username, orig_u.image, orig_u.is_premium, orig_u.badge, orig_u.is_subscribed, orig.created_at
        ORDER BY v.created_at DESC
      `;

      let videosResult, countQuery, totalVideosResult, totalVideos, totalPages;

      if (subcategory_id && parseInt(subcategory_id) === subcategory.id) {
        // Apply specific pagination for the provided subcategory
        videosQuery += ` LIMIT $2 OFFSET $3`;
        videosResult = await pool.query(videosQuery, [
          subcategory.id,
          specificLimit,
          specificOffset,
          user_id || null
        ]);

        countQuery = `SELECT COUNT(*) FROM cinematics_videos WHERE sub_category_id = $1 AND status != 'blocked'`;
        totalVideosResult = await pool.query(countQuery, [subcategory.id]);
        totalVideos = totalVideosResult.rows[0].count;
        totalPages = Math.ceil(totalVideos / specificLimit);
      } else {
        // Apply default pagination for other subcategories
        videosQuery += ` LIMIT $2 OFFSET $3`;
        videosResult = await pool.query(videosQuery, [
          subcategory.id,
          defaultLimit,
          0,
          user_id || null
        ]);

        countQuery = `SELECT COUNT(*) FROM cinematics_videos WHERE sub_category_id = $1 AND status != 'blocked'`;
        totalVideosResult = await pool.query(countQuery, [subcategory.id]);
        totalVideos = totalVideosResult.rows[0].count;
        totalPages = Math.ceil(totalVideos / defaultLimit);
      }

      subcategory.sub_category_name = subcategory.name;
      subcategory.sub_category_french_name = subcategory.french_name;
      subcategory.sub_category_id = subcategory.id;
      // include subcategory index if present
      subcategory.sub_category_index = typeof subcategory.index !== 'undefined' ? subcategory.index : null;
      subcategory.video_result = {
        totalVideos,
        totalPages,
        currentPage:
          parseInt(subcategory_id) === subcategory.id ? specificPage : 1,
        videos: videosResult.rows.map(row => ({
          ...row,
          original_post: row.shared_post_id ? {
            id: row.shared_post_id,
            name: row.original_name,
            description: row.original_description,
            video: row.original_video,
            thumbnail: row.original_thumbnail,
            username: row.original_username,
            user_image: row.original_user_image,
            premium: row.original_premium,
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
      message: "Subcategories with videos retrieved successfully",
      data: subcategories,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const getVideosByUserId = async (req, res) => {
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

    const videosQuery = `
      SELECT
        v.id AS video_id,
        v.name,
        v.description,
        v.thumbnail,
        v.video,
        v.category_id,
        vc.name AS category_name,
        NULL AS category_french_name,
        v.sub_category_id,
        vsc.name AS sub_category_name,
        NULL AS sub_category_french_name,
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
        orig.video AS original_video,
        orig.thumbnail AS original_thumbnail,
        orig_u.username AS original_username,
        orig_u.image AS original_user_image,
        orig_u.is_premium AS original_premium,
        orig_u.badge AS original_badge,
        orig_u.is_subscribed AS original_is_subscribed,
        orig.created_at AS original_created_at,
        COUNT(DISTINCT CASE WHEN c.is_deleted = FALSE AND c.is_hidden = FALSE THEN c.id END) AS comment_count,
        COUNT(DISTINCT l.id) AS total_likes,
        bool_or(sn.id IS NOT NULL) AS is_saved,
        bool_or(sl.id IS NOT NULL) AS is_liked
      FROM cinematics_videos v
      LEFT JOIN users u ON v.user_id = u.id
      LEFT JOIN cinematics_category vc ON v.category_id = vc.id
      LEFT JOIN cinematics_sub_category vsc ON v.sub_category_id = vsc.id
      LEFT JOIN cinematics_video_comment c ON v.id = c.video_id
      LEFT JOIN cinematics_video_like l ON v.id = l.video_id
      LEFT JOIN cinematics_videos orig ON v.shared_post_id = orig.id
      LEFT JOIN users orig_u ON orig.user_id = orig_u.id
      LEFT JOIN save_item_general sn ON sn.module = 'cinematics' AND sn.module_item_id::int = v.id AND sn.user_id = $4
      LEFT JOIN cinematics_video_like sl ON sl.video_id = v.id AND sl.user_id = $4
      WHERE v.user_id = $1
      GROUP BY v.id, vc.name, vsc.name, u.username, u.image, u.is_premium, u.badge, u.is_subscribed, orig.id, orig_u.id, orig_u.is_premium, orig_u.badge, orig_u.is_subscribed
      ORDER BY v.created_at DESC
      LIMIT $2 OFFSET $3;
    `;

    const videosResult = await pool.query(videosQuery, [
      user_id,
      perPage,
      offset,
      req.query.user_id || null
    ]);

    const countQuery = `SELECT COUNT(*) FROM cinematics_videos WHERE user_id = $1`;
    const totalVideosResult = await pool.query(countQuery, [user_id]);
    const totalVideos = totalVideosResult.rows[0].count;
    const totalPages = Math.ceil(totalVideos / perPage);

    return res.status(200).json({
      statusCode: 200,
      message: "Videos retrieved successfully",
      totalVideos,
      totalPages,
      currentPage: page,
      videos: videosResult.rows.map((row) => {
        if (row.shared_post_id) {
          row.original_post = {
            id: row.shared_post_id,
            name: row.original_name,
            description: row.original_description,
            video: row.original_video,
            thumbnail: row.original_thumbnail,
            username: row.original_username,
            user_image: row.original_user_image,
            premium: row.original_premium,
            badge: row.original_badge,
            is_subscribed: row.original_is_subscribed,
            created_at: row.original_created_at,
          };
        } else {
          row.original_post = null;
        }
        return row;
      }),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const toggleLikeVideo = async (req, res) => {
  try {
    const { video_id, user_id } = req.body;

    // Check if the video exists
    const checkVideoQuery = "SELECT * FROM cinematics_videos WHERE id = $1";
    const checkVideoResult = await pool.query(checkVideoQuery, [video_id]);

    if (checkVideoResult.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "Video not found" });
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
      "SELECT * FROM cinematics_video_like WHERE video_id = $1 AND user_id = $2";
    const checkLikeResult = await pool.query(checkLikeQuery, [
      video_id,
      user_id,
    ]);

    if (checkLikeResult.rowCount > 0) {
      // If the like exists, unlike the video
      const unlikeQuery =
        "DELETE FROM cinematics_video_like WHERE video_id = $1 AND user_id = $2 RETURNING *";
      const unlikeResult = await pool.query(unlikeQuery, [video_id, user_id]);

      return res.status(200).json({
        statusCode: 200,
        message: "Video unliked successfully",
        data: unlikeResult.rows[0],
      });
    } else {
      // If the like does not exist, like the video
      const likeQuery = `
        INSERT INTO cinematics_video_like(video_id, user_id)
      VALUES($1, $2)
      RETURNING *;
      `;
      const likeResult = await pool.query(likeQuery, [video_id, user_id]);

      return res.status(201).json({
        statusCode: 201,
        message: "Video liked successfully",
        data: likeResult.rows[0],
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const searchVideosByTitle = async (req, res) => {
  try {
    const { query } = req.query;
    const page = parseInt(req.query.page || 1);
    const perPage = parseInt(req.query.limit || 1000);

    if (!query) {
      return res.status(400).json({
        statusCode: 400,
        message: "query query parameter is required",
      });
    }

    // Search videos by query with pagination
    const searchQuery = `
      SELECT
        v.id AS video_id,
        v.name,
        v.description,
        v.thumbnail,
        v.video,
        v.category_id,
        vc.name AS category_name,
        NULL AS category_french_name,
        v.sub_category_id,
        vsc.name AS sub_category_name,
        NULL AS sub_category_french_name,
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
        orig.video AS original_video,
        orig.thumbnail AS original_thumbnail,
        orig_u.username AS original_username,
        orig_u.image AS original_user_image,
        orig_u.is_premium AS original_premium,
        orig_u.is_subscribed AS original_is_subscribed,
        orig_u.badge AS original_badge,
        orig.created_at AS original_created_at,
        COALESCE(likes.total_likes, 0) AS total_likes,
        bool_or(sn.id IS NOT NULL) AS is_saved,
        bool_or(sl.id IS NOT NULL) AS is_liked
      FROM cinematics_videos v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN cinematics_category vc ON v.category_id = vc.id
      LEFT JOIN cinematics_sub_category vsc ON v.sub_category_id = vsc.id
      LEFT JOIN cinematics_videos orig ON v.shared_post_id = orig.id
      LEFT JOIN users orig_u ON orig.user_id = orig_u.id
      LEFT JOIN (
        SELECT video_id, COUNT(*) AS total_likes
        FROM cinematics_video_like
        GROUP BY video_id
      ) likes ON v.id = likes.video_id
      LEFT JOIN save_item_general sn ON sn.module = 'cinematics' AND sn.module_item_id::int = v.id AND sn.user_id = $2
      LEFT JOIN cinematics_video_like sl ON sl.video_id = v.id AND sl.user_id = $2
      WHERE (v.name ILIKE $1 OR v.description ILIKE $1 OR u.username ILIKE $1 OR u.username ILIKE $3 OR orig_u.username ILIKE $1 OR orig_u.username ILIKE $3)
      GROUP BY v.id, vc.name, vsc.name, u.username, u.image, u.is_premium, u.is_subscribed, u.badge, orig.id, orig_u.id, orig_u.is_premium, orig_u.is_subscribed, orig_u.badge, likes.total_likes
      ORDER BY (CASE WHEN u.badge ILIKE '%gold%' THEN 1 WHEN u.badge ILIKE '%blue%' THEN 2 ELSE 3 END) ASC, v.created_at DESC
    `;

    const cleanQuery = (query || "").replace(/^@+/, "");
    const searchResult = await pool.query(searchQuery, [
      `%${query}%`,
      req.query.user_id || null,
      `%${cleanQuery}%`,
    ]);

    const mapSearchRow = (row) => {
      if (row.shared_post_id) {
        row.original_post = {
          id: row.shared_post_id,
          name: row.original_name,
          description: row.original_description,
          video: row.original_video,
          thumbnail: row.original_thumbnail,
          username: row.original_username,
          user_image: row.original_user_image,
          premium: row.original_premium,
          is_subscribed: row.original_is_subscribed,
          badge: row.original_badge,
          created_at: row.original_created_at,
        };
      } else {
        row.original_post = null;
      }
      return row;
    };

    const paginated = paginateBadgeSearchResults(searchResult.rows, page, perPage, {
      dateFields: ["created_at"],
    });

    return res.status(200).json({
      statusCode: 200,
      message: "Videos retrieved successfully",
      totalVideos: paginated.total,
      totalPages: paginated.totalPages,
      currentPage: paginated.currentPage,
      videos: paginated.rows.map(mapSearchRow),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const getLikes = async (req, res) => {
  try {
    const { video_id } = req.params;

    if (!video_id) {
      return res.status(400).json({
        statusCode: 400,
        message: "The 'video_id' parameter is required.",
      });
    }

    const query = `
      SELECT COUNT(*) AS like_count 
      FROM cinematics_video_like 
      WHERE video_id = $1
    `;

    const detailsQuery = `
      SELECT * FROM cinematics_video_like 
      WHERE video_id = $1
    `;

    const countResult = await pool.query(query, [video_id]);
    const detailsResult = await pool.query(detailsQuery, [video_id]);

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

export const getTotal = async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*) AS total FROM cinematics_videos");
    return res.status(200).json({ statusCode: 200, total: parseInt(result.rows[0].total) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const getSpecificCinematic = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.query.user_id || null;

    const query = `
      SELECT
        v.id AS video_id,
        v.id AS id,
        v.name,
        v.description,
        v.thumbnail,
        v.video,
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
        orig.video AS original_video,
        orig.thumbnail AS original_thumbnail,
        orig_u.username AS original_username,
        orig_u.image AS original_user_image,
        orig.created_at AS original_created_at,
        COUNT(DISTINCT CASE WHEN c.is_deleted = FALSE AND c.is_hidden = FALSE THEN c.id END) AS comment_count,
        COUNT(DISTINCT l.id) AS total_likes,
        bool_or(sn.id IS NOT NULL) AS is_saved,
        bool_or(sl.id IS NOT NULL) AS is_liked
      FROM cinematics_videos v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN cinematics_category vc ON v.category_id = vc.id
      LEFT JOIN cinematics_sub_category vsc ON v.sub_category_id = vsc.id
      LEFT JOIN cinematics_video_comment c ON v.id = c.video_id
      LEFT JOIN cinematics_video_like l ON v.id = l.video_id
      LEFT JOIN cinematics_videos orig ON v.shared_post_id = orig.id
      LEFT JOIN users orig_u ON orig.user_id = orig_u.id
      LEFT JOIN save_item_general sn ON sn.module = 'cinematics' AND sn.module_item_id::int = v.id AND sn.user_id = $2
      LEFT JOIN cinematics_video_like sl ON sl.video_id = v.id AND sl.user_id = $2
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
          video: data.original_video,
          thumbnail: data.original_thumbnail,
          username: data.original_username,
          user_image: data.original_user_image,
          created_at: data.original_created_at,
        };
      }
      return res.status(200).json({ statusCode: 200, cinematic: data, video: data, data: data });
    }
    return res.status(404).json({ statusCode: 404, message: "Cinematic video not found" });
  } catch (error) {
    console.error("getSpecificCinematic error:", error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};
