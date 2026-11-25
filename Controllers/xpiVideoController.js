import pool from "../db.config/index.js";
import { fetchCommentTree, commentTreeResponse } from "../utils/commentService.js";
import { toSafeInt } from "../utils/commentModules.js";
import { buildNestedCommentTree } from "../utils/commentUtils.js";
import { getAllRows, getSingleRow } from "../queries/common.js";
import { handle_delete_photos_from_folder } from "../utils/handleDeletePhoto.js";
import { sendPushNotificationToAll, notifyUser } from "../utils/notificationService.js";
import { NOTIFICATION_TITLES, NOTIFICATION_MESSAGES } from "../utils/notificationStrings.js";
import { interleaveBadgeSearchResults, paginateBadgeSearchResults } from "../utils/badgeSearchPagination.js";
import { checkDailyVideoUploadLimit } from "../utils/uploadLimits.js";
import { safeSearchWord } from "../utils/sqlSafe.js";

/** Resolve the source row of a shared video post. */
async function resolveXpiShareSource(sharedPostId) {
  if (!sharedPostId) return null;
  const xpi = await pool.query(
    `SELECT id, name, description, video, thumbnail, video_category, sub_category
     FROM xpi_videos WHERE id = $1`,
    [sharedPostId]
  );
  if (xpi.rowCount > 0) return xpi.rows[0];
  return null;
}

const XPI_CATEGORY_WHERE = `(v.video_category = $1
  OR (v.shared_post_id IS NOT NULL AND orig.video_category = $1))`;

export const createXpiVideo = async (req, res) => {
  try {
    const {
      name,
      description,
      video_category,
      category_id,
      category,
      main_category_id,
      sub_category,
      sub_category_id,
      user_id,
      video,
      thumbnail,
      shared_post_id,
      caption_url,
    } = req.body;
    let videoCategoryVal = video_category || category_id || category || main_category_id || null;
    let subCategoryVal = sub_category || sub_category_id || null;

    // Category and subcategory validation removed to allow cross-module sharing.
    // Constraints on xpi_videos have been relaxed to support IDs from other modules.


    // Check if the user exists and is not deleted
    const checkUserQuery =
      "SELECT * FROM users WHERE id = $1 AND is_deleted=FALSE";
    const checkUserResult = await pool.query(checkUserQuery, [user_id]);

    if (checkUserResult.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "User not exist" });
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

    // Insert new video record
    let insertVideo = video || "";
    let insertThumbnail = thumbnail || "";
    let insertCaptionUrl = caption_url || null;
    if (shared_post_id) {
      const src = await resolveXpiShareSource(shared_post_id);
      if (src) {
        insertVideo = insertVideo || src.video || "";
        insertThumbnail = insertThumbnail || src.thumbnail || "";
        videoCategoryVal = videoCategoryVal || src.video_category || null;
        subCategoryVal = subCategoryVal || src.sub_category || null;
        insertCaptionUrl = insertCaptionUrl || src.caption_url || null;
      }
    }

    const createQuery = `
      INSERT INTO xpi_videos (name, description, video_category, sub_category, video, user_id, thumbnail, shared_post_id, caption_url) 
      VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING *`;
    const result = await pool.query(createQuery, [
      name || "",
      description || "",
      videoCategoryVal,
      subCategoryVal,
      insertVideo,
      user_id,
      insertThumbnail,
      shared_post_id || null,
      insertCaptionUrl,
    ]);

    if (result.rowCount === 1) {
      const query = `
        SELECT
          v.id AS xpi_video_id,
          v.name,
          v.description,
          v.video_category,
          vc.name AS category_name,
          v.sub_category,
          vsc.name AS sub_category_name,
          v.thumbnail,
          v.video,
          COALESCE(v.caption_url, orig.caption_url) AS caption_url,
          v.created_at AS tour_created_at,
          v.user_id,
          v.shared_post_id,
          u.username AS username,
          u.image AS user_image,
          u.is_premium AS premium,
          orig.name AS original_name,
          orig.description AS original_description,
          orig.video AS original_video,
          orig.thumbnail AS original_thumbnail,
          orig_u.username AS original_username,
          orig_u.image AS original_user_image,
          orig_u.is_premium AS original_premium,
          orig.user_id AS original_user_id,
          orig.created_at AS original_created_at
        FROM xpi_videos v
        JOIN users u ON v.user_id = u.id
        LEFT JOIN video_category vc ON v.video_category = vc.id
        LEFT JOIN video_sub_category vsc ON v.sub_category = vsc.id
        LEFT JOIN xpi_videos orig ON v.shared_post_id = orig.id
        LEFT JOIN users orig_u ON orig.user_id = orig_u.id
        WHERE v.id = $1
        GROUP BY v.id, u.username, u.image, u.is_premium, vc.name, vsc.name, orig.id, orig_u.id, orig_u.is_premium, orig.user_id`;

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
          created_at: videoData.original_created_at,
        };
      } else {
        videoData.original_post = null;
      }

      // Send Push Notification
      try {
        const title = NOTIFICATION_TITLES.NEW_VIDEO;
        const body = NOTIFICATION_MESSAGES.NEW_VIDEO_DESC(name || "New Video");
        sendPushNotificationToAll(title, body, { 
          moduleId: 'xpi_videos', 
          itemId: String(videoData.xpi_video_id) 
        }, videoData.original_user_id);
      } catch (err) {
        console.warn('Push notification failed:', err.message);
      }

      return res.status(201).json({
        statusCode: 201,
        message: "Xpi video uploaded successfully",
        data: videoData,
      });
    }

    res.status(400).json({ statusCode: 400, message: "Not uploaded" });
  } catch (error) {
    console.error(error);

    if (error.constraint === "xpi_videos_user_id_fkey") {
      return res
        .status(400)
        .json({ statusCode: 400, message: "User not found" });
    } else if (error.constraint === "xpi_videos_video_category_fkey") {
      return res
        .status(400)
        .json({ statusCode: 400, message: "Video category not found" });
    } else if (error.constraint === "xpi_videos_sub_category_fkey") {
      return res
        .status(400)
        .json({ statusCode: 400, message: "Sub category not found" });
    }

    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const uploadFile = async (req, res) => {
  try {
    const files = req.files && req.files.length ? req.files : (req.file ? [req.file] : []);
    if (files.length) {
      const host = req.get("host") || "localhost:3801";
      const protocol = req.protocol || "http";
      const media = files.map((file) => `/fileUpload/${file.filename}`);
      const fullUrls = files.map((file) => `${protocol}://${host}/fileUpload/${file.filename}`);

      res.status(200).json({
        statusCode: 200,
        status: true,
        file: media,
        url: fullUrls[0],
        urls: fullUrls,
        secure_url: fullUrls[0],
        storage_key: files[0].filename,
        mime_type: files[0].mimetype,
        file_size: files[0].size,
        original_filename: files[0].originalname,
      });
    } else {
      res.status(400).json({ statusCode: 400, message: "file not uploaded" });
    }
  } catch (error) {
    console.error(error);
    if (req.file?.filename) {
      handle_delete_photos_from_folder([req.file.filename], "fileUpload");
    }
    if (error.constraint === "check_valid_status") {
      return res.status(400).json({
        statusCode: 400,
        message:
          "Invalid mass app type use one of these types ('favourites','new_added','phone_based','unused_app')",
      });
    } else if (error.constraint === "mass_app_user_id_fkey") {
      return res
        .status(400)
        .json({ statusCode: 400, message: "user id not exist" });
    } else if (error.constraint === "mass_app_app_category_id_fkey") {
      return res.status(400).json({
        statusCode: 400,
        message: "app category id not exist",
      });
    }
    res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error", error });
  }
};
export const deleteVideo = async (req, res) => {
  const { id } = req.params;
  try {
    const condition = {
      column: "id",
      value: id,
    };
    const oldVideo = await getSingleRow("xpi_videos", condition);
    if (oldVideo.length === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "Xpi video not found " });
    }
    const oldVideoSplit = oldVideo[0].video.replace("/xpiVideos/", "");
    const delQuery = "DELETE FROM xpi_videos WHERE id=$1";
    const result = await pool.query(delQuery, [id]);
    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "Xpi video not deleted" });
    }
    handle_delete_photos_from_folder([oldVideoSplit], "xpiVideos");
    res.status(200).json({
      statusCode: 200,
      message: "Xpi video deleted successfully",
      deletedVideo: oldVideo[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};
export const updateXpiVideo = async (req, res) => {
  try {
    const {
      id,
      name,
      description,
      video_category,
      sub_category,
      video,
      thumbnail,
    } = req.body;
    const condition = {
      column: "id",
      value: id,
    };

    // Check if the video exists
    const oldVideo = await getSingleRow("xpi_videos", condition);
    if (oldVideo.length === 0) {
      handle_delete_photos_from_folder([req.file?.filename], "xpiVideos");
      return res
        .status(404)
        .json({ statusCode: 404, message: "Xpi video not found" });
    }

    // Subcategory validation removed to support cross-module sharing.


    const updateQuery = `
      UPDATE xpi_videos 
      SET name=$1, description=$2, video_category=$3, sub_category=$4, video=$5, thumbnail=$6, updated_at=NOW() 
      WHERE id=$7 
      RETURNING *`;
    const result = await pool.query(updateQuery, [
      name,
      description,
      video_category,
      sub_category,
      video,
      thumbnail,
      id,
    ]);

    if (result.rowCount === 1) {
      const query = `
        SELECT
          v.id AS xpi_video_id,
          v.name,
          v.description,
          v.video_category,
          vc.name AS category_name,
          v.sub_category,
          vsc.name AS sub_category_name,
          v.video,
          v.thumbnail,
          v.created_at AS tour_created_at,
          v.user_id,
          v.shared_post_id,
          u.username AS username,
          u.image AS user_image,
          u.is_premium AS premium,
          orig.name AS original_name,
          orig.description AS original_description,
          orig.video AS original_video,
          orig.thumbnail AS original_thumbnail,
          orig_u.username AS original_username,
          orig_u.image AS original_user_image,
          orig_u.is_premium AS original_premium,
          orig.user_id AS original_user_id, orig.created_at AS original_created_at
        FROM xpi_videos v
        JOIN users u ON v.user_id = u.id
        LEFT JOIN video_category vc ON v.video_category = vc.id
        LEFT JOIN video_sub_category vsc ON v.sub_category = vsc.id
        LEFT JOIN xpi_videos orig ON v.shared_post_id = orig.id
        LEFT JOIN users orig_u ON orig.user_id = orig_u.id
        WHERE v.id = $1
        GROUP BY v.id, u.username, u.image, u.is_premium, vc.name, vsc.name, orig.id, orig_u.id, orig_u.is_premium, orig.user_id`;

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
          created_at: videoData.original_created_at,
        };
      } else {
        videoData.original_post = null;
      }

      return res
        .status(200)
        .json({ statusCode: 200, updateXpiVideo: videoData });
    } else {
      res
        .status(404)
        .json({ statusCode: 404, message: "Operation not successful" });
    }
  } catch (error) {
    console.error(error);
    if (error.constraint === "xpi_videos_video_category_fkey") {
      return res
        .status(400)
        .json({ statusCode: 400, message: "Video category not found" });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteAllVideos = async (req, res) => {
  try {
    // Perform a query to delete all users from the database
    const query = "DELETE FROM xpi_videos RETURNING *";
    const { rows } = await pool.query(query);

    if (rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        message: "No video found to delete",
      });
    }
    const imageFilenames = rows.map((news) =>
      news.video.replace("/xpiVideos/", "")
    );
    handle_delete_photos_from_folder(imageFilenames, "xpiVideos");
    res.status(200).json({
      statusCode: 200,
      message: "All Videos deleted successfully",
      deletedVideos: rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};


export const sendComment = async (req, res) => {
  try {
    const { user_id, comment, type, parent_comment_id = null } = req.body;
    const video_id = req.body.video_id || req.body.id;
    const targetVideoId = video_id;
    const checkQuery1 =
      "SELECT * FROM users WHERE id = $1 AND is_deleted=FALSE";
    const checkResult1 = await pool.query(checkQuery1, [user_id]);

    if (checkResult1.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "user not exist" });
    }

    let result;

    const checkVideoQuery = "SELECT * FROM xpi_videos WHERE id = $1";
    const checkVideoResult = await pool.query(checkVideoQuery, [video_id]);

    if (checkVideoResult.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "video not exist" });
    }

    if (parent_comment_id) {
      const parentCheckQuery = `
        SELECT id FROM video_comment
        WHERE id = $1 AND video_id = $2
      `;
      const parentCheckResult = await pool.query(parentCheckQuery, [
        parent_comment_id,
        video_id,
      ]);

      if (parentCheckResult.rowCount === 0) {
        return res
          .status(400)
          .json({ statusCode: 400, message: "parent comment not found for this video" });
      }
    }

    const createQuery = `
      INSERT INTO video_comment (video_id,user_id,comment,parent_comment_id)
      VALUES($1,$2,$3,$4)
      RETURNING *
    `;
    result = await pool.query(createQuery, [video_id, user_id, comment, parent_comment_id]);
    if (result.rowCount === 1) {
      // Send Push Notification to Video Owner
      try {
        let postOwnerId;
        const commenterName = checkResult1.rows[0].username;


        const xpiVideoRes = await pool.query("SELECT user_id FROM xpi_videos WHERE id = $1", [video_id]);
        postOwnerId = xpiVideoRes.rows[0]?.user_id;

        if (postOwnerId && postOwnerId !== user_id) {
          const title = NOTIFICATION_TITLES.NEW_COMMENT;
          const body = NOTIFICATION_MESSAGES.NEW_COMMENT_DESC(commenterName);

          notifyUser({
            sender_id: user_id,
            receiver_id: postOwnerId,
            title,
            body,
            moduletype: "xpi",
            item_id: String(video_id),
            action: "comment"
          });
        }
      } catch (pushErr) {
        console.error("Comment push notification failed:", pushErr.message);
      }

      let commentQuery = `SELECT 
      v.video_id AS xpi_video_id,
      v.id AS commentId,
      v.parent_comment_id AS parentCommentId,
      v.comment AS comment,
      v.created_at AS commentCreatedAt,
      u.id AS userId,
      u.username AS username,
      u.image AS userImage,
      u.is_premium AS premium,
      u.is_subscribed AS is_subscribed,
      u.badge AS badge
      FROM video_comment v
      LEFT JOIN users u ON v.user_id = u.id
      WHERE v.id=$1
      ORDER BY v.created_at DESC;
      `;
      const { rows } = await pool.query(commentQuery, [result.rows[0].id]);
      return res.status(201).json({
        statusCode: 201,
        message: "Comment posted successfully",
        data: {
          ...rows[0],
          replies: [],
        },
      });
    }
    res.status(400).json({ statusCode: 400, message: "Not uploaded" });
  } catch (error) {
    console.error(error);
    if (error.constraint === "video_comment_user_id_fkey") {
      return res
        .status(400)
        .json({ statusCode: 400, message: "user not found" });
    } else if (error.constraint === "video_comment_video_id_fkey") {
      return res
        .status(400)
        .json({ statusCode: 400, message: "video  not found" });
    } else if (error.constraint === "video_comment_parent_comment_id_fkey") {
      return res
        .status(400)
        .json({ statusCode: 400, message: "parent comment not found" });
    }
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};
export const getAllCommentsByVideo = async (req, res) => {
  try {
    const postId = toSafeInt(req.params.id);
    if (postId === null) {
      return res.status(400).json({ statusCode: 400, message: "Invalid id" });
    }


    // Shared reader: hides moderated comments, keeps replies under their parent,
    // marks deleted comments / users, adds like counts.
    const result = await fetchCommentTree({
      table: "video_comment",
      scopeColumn: "video_id",
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

export const likeUnlikeVideo = async (req, res) => {
  try {
    const { video_id, user_id, type } = req.body;
    const targetVideoId = video_id || req.body.id;
    if (!targetVideoId || !user_id) {
      return res.status(400).json({ statusCode: 400, message: "video_id and user_id are required" });
    }
    const checkQuery1 =
      "SELECT * FROM users WHERE id = $1 AND is_deleted=FALSE";
    const checkResult1 = await pool.query(checkQuery1, [user_id]);

    if (checkResult1.rowCount === 0) {
      handle_delete_photos_from_folder([req.file?.filename], "picTourImages");
      return res
        .status(404)
        .json({ statusCode: 404, message: "user not exist" });
    }


    // xpi video like/unlike
    const checkQuery =
      "SELECT * FROM like_video WHERE video_id = $1 AND user_id = $2";
    const checkResult = await pool.query(checkQuery, [video_id, user_id]);

    if (checkResult.rowCount > 0) {
      const deleteQuery =
        "DELETE FROM like_video WHERE user_id=$1 AND video_id=$2 RETURNING *";
      const result = await pool.query(deleteQuery, [user_id, video_id]);
      if (result.rowCount === 1) {
        return res.status(200).json({
          statusCode: 201,
          message: "Video Unlike successfully",
          data: result.rows[0],
        });
      }
    }
    const createQuery = "INSERT INTO like_video (video_id, user_id) VALUES($1, $2) RETURNING *";
    const result = await pool.query(createQuery, [video_id, user_id]);
    if (result.rowCount === 1) {
      // Send Push Notification to owner
      try {
        const videoInfo = await pool.query("SELECT user_id FROM xpi_videos WHERE id = $1", [video_id]);
        const postOwnerId = videoInfo.rows[0]?.user_id;
        const likerName = checkResult1.rows[0].username;

        if (postOwnerId && postOwnerId !== user_id) {
          const title = NOTIFICATION_TITLES.POST_LIKED;
          const body = NOTIFICATION_MESSAGES.POST_LIKED_DESC(likerName);
          
          notifyUser({
            sender_id: user_id,
            receiver_id: postOwnerId,
            title,
            body,
            moduletype: 'xpi_video',
            item_id: String(video_id),
            action: 'like'
          });
        }
      } catch (err) {
        console.warn('Push notification for like failed:', err.message);
      }

      return res.status(201).json({
        statusCode: 201,
        message: "Video like successfully",
        data: result.rows[0],
      });
    }
    res.status(400).json({ statusCode: 400, message: "Not like" });
  } catch (error) {
    console.error(error);
    if (error.constraint === "like_video_user_id_fkey") {
      return res
        .status(400)
        .json({ statusCode: 400, message: "user not found" });
    } else if (error.constraint === "like_video_video_id_fkey") {
      return res
        .status(400)
        .json({ statusCode: 400, message: "video  not found" });
    }
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};
export const likeVideo = async (req, res) => {
  try {
    const { video_id, user_id, type } = req.body;
    if (!video_id || !user_id) {
      return res.status(400).json({ statusCode: 400, message: "video_id and user_id are required" });
    }
    // Check if the user has already liked the video
    const checkQuery =
      "SELECT * FROM like_video WHERE video_id = $1 AND user_id = $2";
    const checkResult = await pool.query(checkQuery, [video_id, user_id]);

    if (checkResult.rowCount > 0) {
      // The user has already liked the video, return an error
      return res
        .status(400)
        .json({ statusCode: 400, message: "User has already liked the video" });
    }
    const createQuery =
      "INSERT INTO like_video (video_id,user_id) VALUES($1,$2) RETURNING *";
    const result = await pool.query(createQuery, [video_id, user_id]);
    if (result.rowCount === 1) {
      return res.status(201).json({
        statusCode: 201,
        message: "Video like successfully",
        data: result.rows[0],
      });
    }
    res.status(400).json({ statusCode: 400, message: "Not uploaded" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const UnlikeVideo = async (req, res) => {
  try {
    const { like_id } = req.body;
    const createQuery = "DELETE FROM like_video WHERE id=$1 RETURNING *";
    const result = await pool.query(createQuery, [like_id]);
    if (result.rowCount === 1) {
      return res.status(200).json({
        statusCode: 201,
        message: "Video Unlike successfully",
        data: result.rows[0],
      });
    }
    res.status(400).json({ statusCode: 400, message: "User like not exist" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};
export const getAllLikesByVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query;
    let likeQuery;

    likeQuery = `SELECT v.*, u.username, u.image AS userImage, u.is_premium AS premium
    FROM like_video v
    LEFT JOIN
    users AS u ON v.user_id = u.id
    WHERE video_id=$1 AND u.is_deleted=FALSE
    ORDER BY v.created_at DESC;
    `;

    const { rows } = await pool.query(likeQuery, [id]);
    res.status(200).json({
      statusCode: 200,
      totalLikes: rows.length,
      AllLikes: rows,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error", error });
  }
};
export const getSpecificVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.query;

    let sqlQuery = `
      SELECT
        v.id AS video_id,
        v.name,
        v.description,
        v.video_category,
        vc.name AS category_name,
        vc.french_name AS category_french_name,
        v.sub_category,
        vsc.name AS sub_category_name,
        vsc.french_name AS sub_category_french_name,
        v.video,
        COALESCE(v.caption_url, orig.caption_url) AS caption_url,
        v.thumbnail,
        v.created_at AS video_created_at,
        v.user_id,
        u.username AS username,
        u.image AS userImage,
        u.is_premium AS premium,
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'comment_id', c.id,
              'comment', c.comment,
              'user_id', c.user_id,
              'username', cu.username,
              'userimage', cu.image,
              'is_subscribed', cu.is_subscribed,
              'badge', cu.badge,
              'comment_created_at', c.created_at
            )
          ), '[]'::json)
          FROM video_comment c
          JOIN users cu ON c.user_id = cu.id
          WHERE c.video_id = v.id
        ) AS comments,
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', lv.id,
              'user_id', lv.user_id,
              'video_id', v.id,
              'created_at', lu.created_at,
              'updated_at', lu.updated_at
            )
          ), '[]'::json)
          FROM like_video lv
          JOIN users lu ON lv.user_id = lu.id
          WHERE lv.video_id = v.id
        ) AS likes,
        (
          SELECT count(*) FROM video_comment c WHERE c.video_id = v.id AND c.is_deleted = FALSE AND c.is_hidden = FALSE
        ) AS comment_count,
        (
          SELECT count(*) FROM like_video lv WHERE lv.video_id = v.id
        ) AS like_count,
        v.shared_post_id,
        orig.name AS original_name,
        orig.description AS original_description,
        orig.video AS original_video,
        orig.thumbnail AS original_thumbnail,
        orig_u.username AS original_username,
        orig_u.image AS original_user_image,
        orig_u.is_premium AS original_premium,
        orig.user_id AS original_user_id, orig.created_at AS original_created_at
    `;

    if (user_id) {
      sqlQuery += `,
        bool_or(sn.id IS NOT NULL) AS is_saved,
        bool_or(lv.id IS NOT NULL) AS is_liked`;
    }

    sqlQuery += `
      FROM xpi_videos v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN video_category vc ON v.video_category = vc.id
      LEFT JOIN video_sub_category vsc ON v.sub_category = vsc.id
      LEFT JOIN xpi_videos orig ON v.shared_post_id = orig.id
      LEFT JOIN users orig_u ON orig.user_id = orig_u.id`;

    if (user_id) {
      sqlQuery += `
      LEFT JOIN save_item_general sn ON sn.module = 'xpi' AND sn.module_item_id::int = v.id AND sn.user_id = $2
      LEFT JOIN like_video lv ON lv.video_id = v.id AND lv.user_id = $2`;
    }

    sqlQuery += `
      WHERE v.id = $1 AND u.is_deleted = FALSE
      GROUP BY v.id, u.username, u.image, u.is_premium, vc.name, vsc.name, vc.french_name, vsc.french_name, orig.id, orig_u.id, orig_u.is_premium, orig.user_id`;

    if (user_id) {
      sqlQuery += `, sn.id`;
    }

    const queryParams = [id];
    if (user_id) {
      queryParams.push(user_id);
    }

    const { rows } = await pool.query(sqlQuery, queryParams);

    if (rows.length > 0) {
      const videoData = rows[0];
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
      return res.status(200).json({ statusCode: 200, Video: videoData });
    } else {
      return res
        .status(404)
        .json({ statusCode: 404, message: "No Video found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// export const getSpecificVideo = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const query = `SELECT
//     v.id AS video_id,
//     v.name,
//     v.description,
//     v.video_category,
//     v.video,
//     v.created_at AS video_created_at,
//     v.user_id,
//     u.username AS username,
//     u.image AS userImage,
//     (
//         SELECT COALESCE(json_agg(
//             json_build_object(
//                 'comment_id', c.id,
//                 'comment', c.comment,
//                 'user_id', c.user_id,
//                 'username', cu.username,
//                 'userimage', cu.image,
//                 'comment_created_at', c.created_at
//             )
//         ), '[]'::json)
//         FROM video_comment c
//         JOIN users cu ON c.user_id = cu.id
//         WHERE c.video_id = v.id
//     ) AS comments,
//     (
//         SELECT COALESCE(json_agg(
//             json_build_object(
//                 'id', lv.id,
//                 'user_id', lv.user_id,
//                 'video_id', v.id,
//                 'created_at', lu.created_at,
//                 'updated_at', lu.updated_at
//             )
//         ), '[]'::json)
//         FROM like_video lv
//         JOIN users lu ON lv.user_id = lu.id
//         WHERE lv.video_id = v.id
//     ) AS likes
// FROM xpi_videos v
// JOIN users u ON v.user_id = u.id
// WHERE v.id = $1
// GROUP BY v.id, u.username, u.image;

//  `;

//     const { rows } = await pool.query(query, [id]);
//     if (rows.length > 0) {
//       return res.status(200).json({ statusCode: 200, Video: rows[0] });
//     } else {
//       res.status(404).json({ statusCode: 404, message: "No Video found" });
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };
export const getAllVideos = async (req, res) => {
  try {
    console.log(req.query);
    let page = parseInt(req.query.page || 1); // Get the page number from the query parameters
    const perPage = parseInt(req.query.limit || 1000);
    const offset = (page - 1) * perPage;

    const currentUserId = req.query.user_id ? parseInt(req.query.user_id) : null;
    let query = `
      SELECT
        v.id AS video_id,
        v.name,
        v.description,
        v.video_category,
        vc.name AS category_name,
        vc.french_name AS category_french_name,
        v.sub_category,
        vsc.name AS sub_category_name,
        vsc.french_name AS sub_category_french_name,
        v.video,
        v.thumbnail,
        v.created_at AS video_created_at,
        v.user_id,
        v.shared_post_id,
        u.username AS username,
        u.image AS userImage,
        u.is_premium AS premium,
        orig.name AS original_name,
        orig.description AS original_description,
        orig.video AS original_video,
        orig.thumbnail AS original_thumbnail,
        orig_u.username AS original_username,
        orig_u.image AS original_user_image,
        orig_u.is_premium AS original_premium,
        orig.user_id AS original_user_id, orig.created_at AS original_created_at,
        bool_or(sn.id IS NOT NULL) AS is_saved,
        bool_or(lv.id IS NOT NULL) AS is_liked
      FROM xpi_videos v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN video_category vc ON v.video_category = vc.id
      LEFT JOIN video_sub_category vsc ON v.sub_category = vsc.id
      LEFT JOIN xpi_videos orig ON v.shared_post_id = orig.id
      LEFT JOIN users orig_u ON orig.user_id = orig_u.id
      LEFT JOIN save_item_general sn ON sn.module = 'xpi' AND sn.module_item_id::int = v.id AND sn.user_id = $1::int
      LEFT JOIN like_video lv ON lv.video_id = v.id AND lv.user_id = $1::int
      WHERE u.is_deleted = FALSE
      GROUP BY v.id, u.username, u.image, u.is_premium, vc.name, vsc.name, vc.french_name, vsc.french_name, orig.id, orig_u.id, orig_u.is_premium
      ORDER BY v.created_at DESC`;

    let queryParameters = [currentUserId];

    if (req.query.page !== undefined || req.query.limit !== undefined) {
      query += ` LIMIT $2 OFFSET $3;`;
      queryParameters.push(perPage, offset);
    }

    const { rows } = await pool.query(query, queryParameters);

    const formattedRows = rows.map((row) => {
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
          created_at: row.original_created_at,
        };
      } else {
        row.original_post = null;
      }
      return row;
    });

    if (req.query.page === undefined && req.query.limit === undefined) {
      // If no pagination is applied, don't calculate totalVideos and totalPages
      res.status(200).json({
        statusCode: 200,
        totalVideos: formattedRows.length,
        AllVideos: formattedRows,
      });
    } else {
      // Calculate the total number of videos (without pagination)
      const countQuery = `
        SELECT COUNT(*) FROM xpi_videos
        JOIN users u ON xpi_videos.user_id = u.id
        WHERE u.is_deleted = FALSE
      ;`;
      const totalVideosResult = await pool.query(countQuery);
      const totalVideos = totalVideosResult.rows[0].count;
      const totalPages = Math.ceil(totalVideos / perPage);

      res.status(200).json({
        statusCode: 200,
        totalVideos,
        totalPages,
        AllVideos: formattedRows,
      });
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error", error });
  }
};

// export const getAllVideos = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page || 1); // Get the page number from the query parameters
//     const perPage = parseInt(req.query.limit || 100); // Number of results per page

//     const offset = (page - 1) * perPage;

//     const countQuery = `SELECT COUNT(*) FROM xpi_videos
//     JOIN users u ON xpi_videos.user_id = u.id
//     WHERE u.is_deleted=FALSE
//     ;`;
//     const countResult = await pool.query(countQuery);
//     const totalVideos = parseInt(countResult.rows[0].count);

//     const totalPages = Math.ceil(totalVideos / perPage);

//     const query = `SELECT
//           v.id AS video_id,
//           v.name,
//           v.description,
//           v.video_category,
//           vc.name AS category_name,
//           v.video,
//           v.thumbnail,
//           v.created_at AS video_created_at,
//           v.user_id,
//           u.username AS username,
//           u.image AS userImage

//       FROM xpi_videos v
//       JOIN users u ON v.user_id = u.id
//       LEFT JOIN video_category vc ON v.video_category = vc.id
//       WHERE u.is_deleted=FALSE
//       ORDER BY v.created_at DESC
//       LIMIT $1 OFFSET $2;`;

//     const { rows } = await pool.query(query, [perPage, offset]);

//     return res.status(200).json({
//       statusCode: 200,
//       totalPages,
//       totalVideos,
//       Videos: rows,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

export const getAllVideosByUser = async (req, res) => {
  try {
    const { id } = req.params;
    const checkQuery = "SELECT * FROM users WHERE id = $1 AND is_deleted=FALSE";
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "User does not exist" });
    }

    const page = parseInt(req.query.page || 1); // Get the page number from the query parameters
    const perPage = parseInt(req.query.limit || 100); // Number of results per page
    const offset = (page - 1) * perPage;

    const countQuery = `SELECT COUNT(*) FROM xpi_videos WHERE user_id=$1;`;
    const countResult = await pool.query(countQuery, [id]);
    const totalVideos = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalVideos / perPage);

    const query = `
      SELECT
        v.id AS video_id,
        v.name,
        v.description,
        v.video_category,
        vc.name AS category_name,
        vc.french_name AS category_french_name,
        v.sub_category,
        vsc.name AS sub_category_name,
        vsc.french_name AS sub_category_french_name,
        v.video,
        COALESCE(v.caption_url, orig.caption_url) AS caption_url,
        v.thumbnail,
        v.created_at AS video_created_at,
        v.user_id,
        u.username AS username,
        u.image AS userImage,
        u.is_premium AS premium,
        u.badge AS badge,
        u.is_subscribed AS is_subscribed,
        v.shared_post_id,
        orig.name AS original_name,
        orig.description AS original_description,
        orig.video AS original_video,
        orig.thumbnail AS original_thumbnail,
        orig_u.username AS original_username,
        orig_u.image AS original_user_image,
        orig_u.is_premium AS original_premium,
        orig_u.badge AS original_badge,
        orig_u.is_subscribed AS original_is_subscribed,
        orig.user_id AS original_user_id, orig.created_at AS original_created_at,
        bool_or(sn.id IS NOT NULL) AS is_saved,
        bool_or(lv.id IS NOT NULL) AS is_liked
      FROM xpi_videos v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN video_category vc ON v.video_category = vc.id
      LEFT JOIN video_sub_category vsc ON v.sub_category = vsc.id
      LEFT JOIN xpi_videos orig ON v.shared_post_id = orig.id
      LEFT JOIN users orig_u ON orig.user_id = orig_u.id
      LEFT JOIN save_item_general sn ON sn.module = 'xpi' AND sn.module_item_id::int = v.id AND sn.user_id = $4
      LEFT JOIN like_video lv ON lv.video_id = v.id AND lv.user_id = $4
      WHERE v.user_id = $1
      GROUP BY v.id, u.username, u.image, u.is_premium, u.badge, u.is_subscribed, vc.name, vsc.name, vc.french_name, vsc.french_name, orig.id, orig_u.id, orig_u.is_premium, orig_u.badge, orig_u.is_subscribed
      ORDER BY v.created_at DESC
      LIMIT $2 OFFSET $3;
    `;

    const { rows } = await pool.query(query, [id, perPage, offset, req.query.user_id || null]);

    return res.status(200).json({
      statusCode: 200,
      totalPages,
      totalVideos,
      Videos: rows.map((row) => {
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
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllVideosByCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.query.user_id || null;

    let page = parseInt(req.query.page || 1); // Get the page number from the query parameters
    const perPage = parseInt(req.query.limit || 100);
    const offset = (page - 1) * perPage;

    const countQuery = `
      SELECT COUNT(*) FROM xpi_videos v
      LEFT JOIN users AS u ON v.user_id = u.id
      LEFT JOIN xpi_videos orig ON v.shared_post_id = orig.id
      WHERE ${XPI_CATEGORY_WHERE}
        AND u.is_deleted = FALSE AND v.status != 'blocked';
    `;
    const countResult = await pool.query(countQuery, [id]);
    const totalVideos = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalVideos / perPage);

    const query = `
  SELECT
    v.id AS video_id,
    v.name,
    v.description,
    v.video_category,
    vc.name AS category_name,
    vc.french_name AS category_french_name,
    v.sub_category,
    vsc.name AS sub_category_name,
    vsc.french_name AS sub_category_french_name,
    vsc."index" AS sub_category_index,
    orig_vsc.name AS original_sub_category_name,
    orig_vsc.french_name AS original_sub_category_french_name,
    orig_vsc."index" AS original_sub_category_index,
    v.video,
    COALESCE(v.caption_url, orig.caption_url) AS caption_url,
    v.thumbnail,
    v.created_at AS video_created_at,
    v.user_id,
    v.shared_post_id,
    u.username AS username, 
    u.image AS user_image,
    u.is_premium AS premium,
    u.is_subscribed,
    u.badge,
    (
      SELECT COUNT(*) FROM video_comment vc WHERE vc.video_id = v.id AND vc.is_deleted = FALSE AND vc.is_hidden = FALSE
    ) AS comment_count,
    (
      SELECT COUNT(*) FROM like_video lv WHERE lv.video_id = v.id
    ) AS total_likes,
    -- Original post details (share source)
    orig.name AS original_name,
    orig.description AS original_description,
    orig.video AS original_video,
    orig.thumbnail AS original_thumbnail,
    orig.sub_category AS original_sub_category_id,
    orig_vsc.name AS original_sub_category_name,
    orig_vsc.french_name AS original_sub_category_french_name,
    orig_vsc."index" AS original_sub_category_index,
    orig_u.username AS original_username,
    orig_u.image AS original_user_image,
    orig_u.is_premium AS original_premium,
    orig_u.is_subscribed AS original_is_subscribed,
    orig_u.badge AS original_badge,
    orig.user_id AS original_user_id,
    orig.created_at AS original_created_at,
    bool_or(si.id IS NOT NULL) AS is_saved,
    bool_or(lv.id IS NOT NULL) AS is_liked
  FROM xpi_videos v
  JOIN users u ON v.user_id = u.id
  LEFT JOIN video_category vc ON v.video_category = vc.id
  LEFT JOIN video_sub_category vsc ON v.sub_category = vsc.id
  LEFT JOIN xpi_videos orig ON v.shared_post_id = orig.id
  LEFT JOIN users orig_u ON orig.user_id = orig_u.id
  LEFT JOIN video_sub_category orig_vsc ON orig.sub_category = orig_vsc.id
  LEFT JOIN save_item_general si ON si.module = 'xpi' AND si.module_item_id::int = v.id AND si.user_id = $4
  LEFT JOIN like_video lv ON lv.video_id = v.id AND lv.user_id = $4
  WHERE ${XPI_CATEGORY_WHERE}
    AND u.is_deleted = FALSE AND v.status != 'blocked'
  GROUP BY v.id, u.username, u.image, u.is_premium, u.is_subscribed, u.badge, vc.name, vsc.name, vc.french_name, vsc.french_name, orig.id, orig_u.id, orig_u.is_premium, orig_u.is_subscribed, orig_u.badge, orig_vsc.name, orig_vsc.french_name, vsc."index", orig_vsc."index"
  ORDER BY v.created_at DESC
  LIMIT $2 OFFSET $3;
`;

    const { rows } = await pool.query(query, [id, perPage, offset, user_id]);

    // Group videos by subcategory
    const groupedBySubCategory = rows.reduce((acc, row) => {
      const subCategoryId = row.sub_category || row.original_sub_category_id || null;
      const subCategoryName = row.sub_category_name || row.original_sub_category_name || "Uncategorized";
      const subCategoryFrenchName = row.sub_category_french_name || row.original_sub_category_french_name || null;
      const subCategoryIndex = row.sub_category_index ?? row.original_sub_category_index ?? null;

      if (!acc[subCategoryId]) {
        acc[subCategoryId] = {
          sub_category_name: subCategoryName,
          sub_category_french_name: subCategoryFrenchName,
          sub_category_id: subCategoryId,
          sub_category_index: subCategoryIndex,

          video_result: {
            totalVideos: 0,
            totalPages: totalPages,
            currentPage: page,
            Videos: [],
          },
        };
      }

      const displayVideo = row.video || row.original_video || "";
      const displayThumbnail = row.thumbnail || row.original_thumbnail || "";

      acc[subCategoryId].video_result.Videos.push({
        video_id: row.video_id,
        name: row.name,
        description: row.description,
        video: displayVideo,
        caption_url: row.caption_url,
        thumbnail: displayThumbnail,
        user_id: row.user_id,
        username: row.username,
        userimage: row.user_image,
        premium: row.premium,
        is_subscribed: row.is_subscribed,
        badge: row.badge,
        created_at: row.video_created_at,
        comment_count: row.comment_count,
        total_likes: row.total_likes,
        is_saved: row.is_saved,
        is_liked: row.is_liked,
        shared_post_id: row.shared_post_id,
        original_post: row.shared_post_id ? {
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
          created_at: row.original_created_at
        } : null
      });

      acc[subCategoryId].video_result.totalVideos += 1;

      return acc;
    }, {});

    let data = Object.values(groupedBySubCategory);

    // Sort videos inside each subcategory strictly by Gold -> Blue -> Free
    data.forEach((subCat) => {
      if (Array.isArray(subCat.video_result?.Videos)) {
        subCat.video_result.Videos = interleaveBadgeSearchResults(subCat.video_result.Videos, {
          dateFields: ["created_at", "video_created_at"]
        });
      }
    });

    data.sort((a, b) => {
      const ai = a.sub_category_index ?? Number.MAX_SAFE_INTEGER;
      const bi = b.sub_category_index ?? Number.MAX_SAFE_INTEGER;
      return ai - bi;
    });

    return res.status(200).json({
      statusCode: 200,
      message: "Subcategories with videos retrieved successfully",
      data: data,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMostViewedVideosByCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const page = parseInt(req.query.page || 1); // Get the page number from the query parameters
    const perPage = parseInt(req.query.limit || 100); // Number of results per page
    const offset = (page - 1) * perPage;

    const countQuery = `
      SELECT COUNT(*) FROM xpi_videos
      LEFT JOIN users AS u ON xpi_videos.user_id = u.id
      WHERE video_category = $1 AND u.is_deleted = FALSE;
    `;
    const countResult = await pool.query(countQuery, [id]);
    const totalVideos = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalVideos / perPage);

    const query = `
      SELECT
        v.id AS video_id,
        v.name,
        v.description,
        v.video_category,
        vc.name AS category_name,
        vc.french_name As category_french_name,
        v.sub_category,
        vsc.name AS sub_category_name,
        vsc.french_name AS sub_category_french_name,
        v.video,
        v.thumbnail,
        v.created_at AS video_created_at,
        v.user_id,
        u.username AS username,
        u.image AS userImage,
        u.is_premium AS premium,
        v.shared_post_id,
        orig.name AS original_name,
        orig.description AS original_description,
        orig.video AS original_video,
        orig.thumbnail AS original_thumbnail,
        orig_u.username AS original_username,
        orig_u.image AS original_user_image,
        orig_u.is_premium AS original_premium,
        orig.user_id AS original_user_id, orig.created_at AS original_created_at,
        COUNT(vv.video_id) AS view_count,
        bool_or(sn.id IS NOT NULL) AS is_saved,
        bool_or(likev.id IS NOT NULL) AS is_liked,
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'comment_id', c.id,
              'comment', c.comment,
              'user_id', c.user_id,
              'username', cu.username,
              'userimage', cu.image,
              'is_subscribed', cu.is_subscribed,
              'badge', cu.badge,
              'comment_created_at', c.created_at
            )
          ), '[]'::json)
          FROM video_comment c
          JOIN users cu ON c.user_id = cu.id
          WHERE c.video_id = v.id
        ) AS comments,
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', lv.id,
              'user_id', lv.user_id,
              'video_id', v.id,
              'created_at', lu.created_at,
              'updated_at', lu.updated_at
            )
          ), '[]'::json)
          FROM like_video lv
          JOIN users lu ON lv.user_id = lu.id
          WHERE lv.video_id = v.id
        ) AS likes
      FROM xpi_videos v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN viewed_video vv ON v.id = vv.video_id
      LEFT JOIN video_category vc ON v.video_category = vc.id
      LEFT JOIN video_sub_category vsc ON v.sub_category = vsc.id
      LEFT JOIN xpi_videos orig ON v.shared_post_id = orig.id
      LEFT JOIN users orig_u ON orig.user_id = orig_u.id
      LEFT JOIN save_item_general sn ON sn.module = 'xpi' AND sn.module_item_id::int = v.id AND sn.user_id = $4
      LEFT JOIN like_video likev ON likev.video_id = v.id AND likev.user_id = $4
      WHERE v.video_category = $1 AND u.is_deleted = FALSE
      GROUP BY v.id, u.username, u.image, u.is_premium, vc.name, vsc.name, vc.french_name, vsc.french_name, orig.id, orig_u.id, orig_u.is_premium
      ORDER BY view_count DESC
      LIMIT $2 OFFSET $3;
    `;

    const { rows } = await pool.query(query, [id, perPage, offset, req.query.user_id || null]);

    return res.status(200).json({
      statusCode: 200,
      totalPages,
      totalVideos,
      Videos: rows.map((row) => {
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
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllTrendingVideosByCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page || 1); // Get the page number from the query parameters
    const perPage = parseInt(req.query.limit || 100); // Number of results per page

    const offset = (page - 1) * perPage;

    const countQuery = `SELECT COUNT(*) FROM xpi_videos
    LEFT JOIN
      users AS u ON xpi_videos.user_id = u.id
    WHERE video_category=$1 AND u.is_deleted=FALSE;`;
    const countResult = await pool.query(countQuery, [id]);
    const totalVideos = parseInt(countResult.rows[0].count);

    const totalPages = Math.ceil(totalVideos / perPage);
    const query = `SELECT
      v.id AS video_id,
      v.name,
      v.description,
      v.video_category,
      vc.name AS category_name,
      vc.french_name AS category_french_name,
      v.video,
      v.created_at AS video_created_at,
      v.thumbnail,
      v.user_id,
      u.username AS username,
      u.image AS userImage,
      u.is_premium AS premium,
      v.shared_post_id,
      orig.name AS original_name,
      orig.description AS original_description,
      orig.video AS original_video,
      orig.thumbnail AS original_thumbnail,
      orig_u.username AS original_username,
      orig_u.image AS original_user_image,
      orig_u.is_premium AS original_premium,
      orig.user_id AS original_user_id, orig.created_at AS original_created_at,
      (SELECT COUNT(*) FROM like_video lv WHERE lv.video_id = v.id) AS like_count,
      (SELECT COUNT(*) FROM video_comment c WHERE c.video_id = v.id AND c.is_deleted = FALSE AND c.is_hidden = FALSE) AS comment_count,
      (SELECT COUNT(*) FROM viewed_video vv WHERE vv.video_id = v.id) AS view_count,
      bool_or(sn.id IS NOT NULL) AS is_saved,
      bool_or(lkv.id IS NOT NULL) AS is_liked
     
    FROM xpi_videos v
    JOIN users u ON v.user_id = u.id
    LEFT JOIN like_video lv ON v.id = lv.video_id
    LEFT JOIN viewed_video vv ON v.id = vv.video_id
    LEFT JOIN video_comment c ON v.id = c.video_id
    LEFT JOIN video_category vc ON v.video_category = vc.id
    LEFT JOIN xpi_videos orig ON v.shared_post_id = orig.id
    LEFT JOIN users orig_u ON orig.user_id = orig_u.id
    LEFT JOIN save_item_general sn ON sn.module = 'xpi' AND sn.module_item_id::int = v.id AND sn.user_id = $4
    LEFT JOIN like_video lkv ON lkv.video_id = v.id AND lkv.user_id = $4
    WHERE v.video_category = $1 AND u.is_deleted=FALSE
    GROUP BY v.id, u.username, u.image, u.is_premium, vc.name, vc.french_name, orig.id, orig_u.id, orig_u.is_premium
    ORDER BY  view_count DESC,video_created_at DESC
    LIMIT $2 OFFSET $3;
    
       `;
    //  like_count DESC, comment_count DESC,
    const { rows } = await pool.query(query, [id, perPage, offset, req.query.user_id || null]);

    return res
      .status(200)
      .json({
        statusCode: 200,
        totalPages,
        totalVideos,
        Videos: rows.map((row) => {
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
              created_at: row.original_created_at,
            };
          } else {
            row.original_post = null;
          }
          return row;
        })
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const getAllRecentVideosByCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page || 1); // Get the page number from the query parameters
    const perPage = parseInt(req.query.limit || 100); // Number of results per page

    const offset = (page - 1) * perPage;

    const countQuery = `SELECT COUNT(*) FROM xpi_videos
    LEFT JOIN
      users AS u ON xpi_videos.user_id = u.id
      WHERE u.is_deleted=FALSE
      
    ;`;
    const countResult = await pool.query(countQuery);
    const totalVideos = parseInt(countResult.rows[0].count);

    const totalPages = Math.ceil(totalVideos / perPage);

    const query = `SELECT
            v.id AS video_id,
            v.name,
            v.description,
            v.video_category,
            vc.name AS category_name,
            vc.french_name AS category_french_name,
            v.video,
            v.thumbnail,
            v.created_at AS video_created_at,
            v.user_id,
            u.username AS username,
            u.image AS userImage,
            u.is_premium AS premium,
            v.shared_post_id,
            orig.name AS original_name,
            orig.description AS original_description,
            orig.video AS original_video,
            orig.thumbnail AS original_thumbnail,
            orig_u.username AS original_username,
            orig_u.image AS original_user_image,
            orig_u.is_premium AS original_premium,
            orig.user_id AS original_user_id, orig.created_at AS original_created_at
           
        FROM xpi_videos v
        JOIN users u ON v.user_id = u.id
        LEFT JOIN video_category vc ON v.video_category = vc.id
        LEFT JOIN xpi_videos orig ON v.shared_post_id = orig.id
        LEFT JOIN users orig_u ON orig.user_id = orig_u.id
        WHERE v.video_category=$3 AND u.is_deleted=FALSE
        GROUP BY v.id, u.username, u.image, u.is_premium, vc.name, vc.french_name, orig.id, orig_u.id, orig_u.is_premium
        ORDER BY v.created_at DESC
        LIMIT $1 OFFSET $2;`;

    const { rows } = await pool.query(query, [perPage, offset, id]);

    return res.status(200).json({
      statusCode: 200,
      totalPages,
      totalVideos,
      Videos: rows.map((row) => {
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
    res.status(500).json({ message: "Internal server error" });
  }
};
export const getComentedVideos = async (req, res) => {
  try {
    const { id } = req.params;

    const page = parseInt(req.query.page || 1); // Get the page number from the query parameters
    const perPage = parseInt(req.query.limit || 100); // Number of results per page
    const offset = (page - 1) * perPage;

    const countQuery = `
      SELECT COUNT(*) FROM xpi_videos
      LEFT JOIN users AS u ON xpi_videos.user_id = u.id
      WHERE video_category = $1 AND u.is_deleted = FALSE;
    `;
    const countResult = await pool.query(countQuery, [id]);
    const totalVideos = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalVideos / perPage);

    const query = `
      SELECT
        v.id AS video_id,
        v.name,
        v.description,
        v.video_category,
        vc.name AS category_name,
        vc.french_name AS category_french_name,
        v.sub_category,
        vsc.name AS sub_category_name,
        vsc.french_name AS sub_category_french_name,
        v.video,
        v.thumbnail,
        v.created_at AS video_created_at,
        v.user_id,
        u.username AS username,
        u.image AS userImage,
        u.is_premium AS premium,
        v.shared_post_id,
        orig.name AS original_name,
        orig.description AS original_description,
        orig.video AS original_video,
        orig.thumbnail AS original_thumbnail,
        orig_u.username AS original_username,
        orig_u.image AS original_user_image,
        orig_u.is_premium AS original_premium,
        orig.user_id AS original_user_id, orig.created_at AS original_created_at,
        COUNT(CASE WHEN c.is_deleted = FALSE AND c.is_hidden = FALSE THEN c.id END) AS comment_count,
        bool_or(sn.id IS NOT NULL) AS is_saved,
        bool_or(lkv.id IS NOT NULL) AS is_liked
      FROM xpi_videos v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN video_comment c ON v.id = c.video_id
      LEFT JOIN video_category vc ON v.video_category = vc.id
      LEFT JOIN video_sub_category vsc ON v.sub_category = vsc.id
      LEFT JOIN xpi_videos orig ON v.shared_post_id = orig.id
      LEFT JOIN users orig_u ON orig.user_id = orig_u.id
      LEFT JOIN save_item_general sn ON sn.module = 'xpi' AND sn.module_item_id::int = v.id AND sn.user_id = $4
      LEFT JOIN like_video lkv ON lkv.video_id = v.id AND lkv.user_id = $4
      WHERE v.video_category = $1 AND u.is_deleted = FALSE
      GROUP BY v.id, u.username, u.image, u.is_premium, vc.name, vsc.name, vc.french_name , vsc.french_name, orig.id, orig_u.id, orig_u.is_premium
      ORDER BY comment_count DESC
      LIMIT $2 OFFSET $3;
    `;

    const { rows } = await pool.query(query, [id, perPage, offset, req.query.user_id || null]);

    return res.status(200).json({
      statusCode: 200,
      totalPages,
      totalVideos,
      Videos: rows.map((row) => {
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
    res.status(500).json({ message: "Internal server error" });
  }
};

export const viewVideo = async (req, res) => {
  try {
    const { video_id, user_id } = req.body;
    if (!video_id || !user_id) {
      return res.status(400).json({ statusCode: 400, message: "video_id and user_id are required" });
    }

    const xpiCheck = await pool.query("SELECT id FROM xpi_videos WHERE id = $1", [video_id]);
    if (xpiCheck.rowCount === 0) {
      return res.status(404).json({ statusCode: 404, message: "Video not found" });
    }

    const checkQuery =
      "SELECT * FROM viewed_video WHERE video_id = $1 AND user_id = $2";
    const checkResult = await pool.query(checkQuery, [video_id, user_id]);

    if (checkResult.rowCount > 0) {
      const count = await pool.query(
        "SELECT COUNT(*) FROM viewed_video WHERE video_id = $1",
        [video_id]
      );
      return res.status(200).json({
        statusCode: 200,
        message: "User has already view the video",
        totalViews: count.rows[0].count,
      });
    }
    const createQuery =
      "INSERT INTO viewed_video (video_id, user_id) VALUES($1, $2) RETURNING *";
    const result = await pool.query(createQuery, [video_id, user_id]);
    if (result.rowCount === 1) {
      const count = await pool.query(
        "SELECT COUNT(*) FROM viewed_video WHERE video_id = $1",
        [video_id]
      );
      return res.status(201).json({
        statusCode: 201,
        message: "Video view successfully",
        totalViews: count.rows[0].count,
        data: result.rows[0],
      });
    }
    res.status(400).json({ statusCode: 400, message: "Not uploaded" });
  } catch (error) {
    if (error.constraint === "viewed_video_user_id_fkey") {
      return res.status(400).json({ statusCode: 400, message: "user not found" });
    } else if (error.constraint === "viewed_video_video_id_fkey") {
      return res.status(400).json({ statusCode: 400, message: "video not found" });
    }
    console.error("viewVideo error:", error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};
export const searchVideos = async (req, res) => {
  try {
    const name = req.query.name || req.query.query || "";

    if (!name || !name.trim()) {
      return res.status(200).json({ statusCode: 200, totalVideos: 0, Videos: [] });
    }

    // Split the search query into individual words
    const searchWords = name.split(/\s+/).filter(Boolean).map(safeSearchWord);

    if (searchWords.length === 0) {
      return res.status(200).json({ statusCode: 200, Videos: [] });
    }

    // Create an array of conditions for each search word
    const conditions = searchWords.map((word) => {
      const cleanWord = word.replace(/^@+/, "");
      return `(v.name ILIKE '%${word}%' OR v.description ILIKE '%${word}%' OR u.username ILIKE '%${cleanWord}%' OR u.username ILIKE '%${word}%' OR orig_u.username ILIKE '%${cleanWord}%' OR orig_u.username ILIKE '%${word}%')`;
    });
    const query = `SELECT
          v.id AS video_id,
          v.name AS name,
          v.description,
          v.video_category,
          vc.name AS category_name,
          v.sub_category AS sub_category_id,
          vsc.name AS sub_category_name,
          v.video,
          v.thumbnail,
          v.created_at AS video_created_at,
          v.user_id,
          u.username AS username,
          u.image AS userImage,
          u.is_premium AS premium,
          u.is_subscribed,
          u.badge,
          v.shared_post_id,
          orig.name AS original_name,
          orig.description AS original_description,
          orig.video AS original_video,
          orig.thumbnail AS original_thumbnail,
          orig_u.username AS original_username,
          orig_u.image AS original_user_image,
          orig_u.is_premium AS original_premium,
          orig_u.is_subscribed AS original_is_subscribed,
          orig_u.badge AS original_badge,
          orig.user_id AS original_user_id, orig.created_at AS original_created_at,
          bool_or(sn.id IS NOT NULL) AS is_saved,
          bool_or(lkv.id IS NOT NULL) AS is_liked
         
      FROM xpi_videos v

      JOIN users u ON v.user_id = u.id
      LEFT JOIN video_category vc ON v.video_category = vc.id
      LEFT JOIN video_sub_category vsc ON v.sub_category = vsc.id
      LEFT JOIN xpi_videos orig ON v.shared_post_id = orig.id
      LEFT JOIN users orig_u ON orig.user_id = orig_u.id
      LEFT JOIN save_item_general sn ON sn.module = 'xpi' AND sn.module_item_id::int = v.id AND sn.user_id = $1
      LEFT JOIN like_video lkv ON lkv.video_id = v.id AND lkv.user_id = $1
      WHERE ${conditions.join(" OR ")} AND u.is_deleted=FALSE
      GROUP BY v.id, u.username, u.image, u.is_premium, u.is_subscribed, u.badge, vc.name, vsc.name, orig.id, orig_u.id, orig_u.is_premium, orig_u.is_subscribed, orig_u.badge
      ORDER BY v.created_at DESC`;

    const { rows } = await pool.query(query, [req.query.user_id || null]);
    const ordered = interleaveBadgeSearchResults(rows, {
      dateFields: ["video_created_at", "created_at"],
    });

    return res.status(200).json({
      statusCode: 200,
      totalVideos: ordered.length,
      Videos: ordered.map((row) => {
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
      }),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

