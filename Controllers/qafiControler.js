import pool from "../db.config/index.js";
import { fetchCommentTree, commentTreeResponse } from "../utils/commentService.js";
import { toSafeInt } from "../utils/commentModules.js";
import { buildNestedCommentTree } from "../utils/commentUtils.js";
import { getAllRows, getSingleRow } from "../queries/common.js";
import { handle_delete_photos_from_folder } from "../utils/handleDeletePhoto.js";
import { sendPushNotificationToAll, notifyUser } from "../utils/notificationService.js";
import { NOTIFICATION_TITLES, NOTIFICATION_MESSAGES } from "../utils/notificationStrings.js";
import {
  normalizeNewsQafiMediaFields,
  mergeNewsQafiMediaForUpdate,
  mapNewsQafiRow,
} from "../utils/mediaFields.js";
import { interleaveBadgeSearchResults, paginateBadgeSearchResults } from "../utils/badgeSearchPagination.js";
import { safeSearchWord } from "../utils/sqlSafe.js";

const mapQafiRow = mapNewsQafiRow;

export const createQafi = async (req, res) => {
  try {
    const { description, category, sub_category, user_id, image, video, thumbnail, type, shared_post_id } = req.body;
    const media = normalizeNewsQafiMediaFields({ image, video, thumbnail, type });
    const checkQuery1 =
      "SELECT * FROM users WHERE id = $1 AND is_deleted = FALSE";
    const checkResult1 = await pool.query(checkQuery1, [user_id]);

    if (checkResult1.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "User does not exist" });
    }


    const createQuery =
      "INSERT INTO QAFI (description, category, sub_category, image, video, thumbnail, type, user_id, shared_post_id) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *";
    const result = await pool.query(createQuery, [
      description || "",
      category,
      sub_category,
      media.image,
      media.video,
      media.thumbnail,
      media.type,
      user_id,
      shared_post_id || null
    ]);

    if (result.rowCount === 1) {
      const query = `
        SELECT
          v.id AS qafi_id,
          v.description,
          v.category,
          v.sub_category,
          v.image,
          v.video,
          v.thumbnail,
          v.type,
          v.created_at AS tour_created_at,
          v.user_id,
          v.shared_post_id,
          u.username AS username,
          u.image AS userImage,
          u.is_premium AS premium,
          orig.description AS original_description,
          orig.image AS original_image,
          orig.video AS original_video,
          orig.thumbnail AS original_thumbnail,
          orig.type AS original_type,
orig_u.username AS original_username,
          orig_u.image AS original_user_image,
          orig_u.is_premium AS original_premium,
          orig.user_id AS original_user_id,
          orig.created_at AS original_created_at
        FROM QAFI v
        JOIN users u ON v.user_id = u.id
        LEFT JOIN QAFI orig ON v.shared_post_id = orig.id
        LEFT JOIN users orig_u ON orig.user_id = orig_u.id
        WHERE v.id = $1
        GROUP BY v.id, u.username, u.image, u.is_premium, orig.id, orig_u.id, orig_u.is_premium, orig.user_id;
      `;
      const data = await pool.query(query, [result.rows[0].id]);
      const qafiData = mapQafiRow(data.rows[0]);

      // Send Push Notification
      try {
        const title = NOTIFICATION_TITLES.NEW_QAFI;
        const body = NOTIFICATION_MESSAGES.NEW_QAFI_DESC(description || "New Q&A");
        sendPushNotificationToAll(title, body, { 
          moduleId: 'QAFI', 
          itemId: String(qafiData.qafi_id) 
        }, qafiData.original_user_id);
      } catch (err) {
        console.warn('Push notification failed:', err.message);
      }

      return res.status(201).json({
        statusCode: 201,
        message: "QAFI posted successfully",
        data: qafiData,
      });
    }
    res.status(400).json({ statusCode: 400, message: "Not uploaded" });
  } catch (error) {
    console.error(error);
    handle_delete_photos_from_folder([req.file?.filename], "qafiImages");
    if (error.constraint === "qafi_category_fkey") {
      return res
        .status(400)
        .json({ statusCode: 400, message: "Category does not exist" });
    } else if (error.constraint === "qafi_sub_category_fkey") {
      return res
        .status(400)
        .json({ statusCode: 400, message: "Sub-category does not exist" });
    } else if (error.constraint === "qafi_user_id_fkey") {
      return res
        .status(400)
        .json({ statusCode: 400, message: "User does not exist" });
    }
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const deleteQafi = async (req, res) => {
  const { id } = req.params;
  try {
    const condition = {
      column: "id",
      value: id,
    };
    const oldImage = await getSingleRow("qafi", condition);
    if (oldImage.length === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "Qafi not found " });
    }
    const oldImageSplit = oldImage[0].image.replace("/qafiImages/", "");
    const delQuery = "DELETE FROM qafi WHERE id=$1";
    const result = await pool.query(delQuery, [id]);
    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "Qafi not deleted" });
    }
    handle_delete_photos_from_folder([oldImageSplit], "qafiImages");
    res.status(200).json({
      statusCode: 200,
      message: "Qafi deleted successfully",
      deletedQafi: oldImage[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};
export const updateQafi = async (req, res) => {
  try {
    const { id, description, category, sub_category, image, video, thumbnail, type } = req.body;
    const condition = {
      column: "id",
      value: id,
    };
    const oldImage = await getSingleRow("qafi", condition);
    console.log(oldImage);
    if (oldImage.length === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "Qafi not found " });
    }
    const media = mergeNewsQafiMediaForUpdate(
      { image, video, thumbnail, type },
      {
        image: oldImage[0]?.image,
        video: oldImage[0]?.video,
        thumbnail: oldImage[0]?.thumbnail,
        type: oldImage[0]?.type,
      }
    );
    const updateType = `UPDATE qafi SET description=$1, category=$2, sub_category=$3, image=$4, video=$5, thumbnail=$6, type=$7, "updated_at"=NOW() WHERE id=$8 RETURNING *`;
    const result = await pool.query(updateType, [
      description,
      category,
      sub_category,
      media.image,
      media.video,
      media.thumbnail,
      media.type,
      id,
    ]);
    if (result.rowCount === 1) {
      const query = `
        SELECT
          v.id AS qafi_id,
          v.description,
          v.category,
          v.sub_category,
          v.image,
          v.video,
          v.thumbnail,
          v.type,
          v.created_at AS tour_created_at,
          v.user_id,
          v.shared_post_id,
          u.username AS username,
          u.image AS userImage,
          u.is_premium AS premium,
          orig.description AS original_description,
          orig.image AS original_image,
          orig.video AS original_video,
          orig.thumbnail AS original_thumbnail,
          orig.type AS original_type,
orig_u.username AS original_username,
          orig_u.image AS original_user_image,
          orig_u.is_premium AS original_premium,
          orig.created_at AS original_created_at
        FROM QAFI v
        JOIN users u ON v.user_id = u.id
        LEFT JOIN QAFI orig ON v.shared_post_id = orig.id
        LEFT JOIN users orig_u ON orig.user_id = orig_u.id
        WHERE v.id = $1
        GROUP BY v.id, u.username, u.image, u.is_premium, orig.id, orig_u.id, orig_u.is_premium;
      `;
      const data = await pool.query(query, [id]);
      const qafiData = mapQafiRow(data.rows[0]);
      return res.status(200).json({
        statusCode: 200,
        message: "QAFI updated successfully",
        updateQafi: qafiData,
      });
    } else {
      res
        .status(404)
        .json({ statusCode: 404, message: "Operation not successful" });
    }
  } catch (error) {
    console.error(error);
    if (error.constraint === "qafi_category_fkey") {
      return res
        .status(400)
        .json({ statusCode: 400, message: "Category does not exist" });
    } else if (error.constraint === "qafi_sub_category_fkey") {
      return res
        .status(400)
        .json({ statusCode: 400, message: "Sub-category does not exist" });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};
export const deleteAllQAFIs = async (req, res) => {
  try {
    // Perform a query to delete all users from the database
    const query = "DELETE FROM qafi RETURNING *";
    const { rows } = await pool.query(query);

    if (rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        message: "No qafi found to delete",
      });
    }
    const imageFilenames = rows.map((news) =>
      news.image.replace("/qafiImages/", "")
    );
    handle_delete_photos_from_folder(imageFilenames, "qafiImages");
    res.status(200).json({
      statusCode: 200,
      message: "All QAFIs deleted successfully",
      deletedQAFIs: rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};
export const sendComment = async (req, res) => {
  try {
    const { QAFI_id, user_id, comment, parent_comment_id = null } = req.body;
    const checkQuery = "SELECT * FROM qafi WHERE id = $1";
    const checkResult = await pool.query(checkQuery, [QAFI_id]);

    if (checkResult.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "QAFI not exist" });
    }
    const checkQuery1 = "SELECT * FROM users WHERE id = $1";
    const checkResult1 = await pool.query(checkQuery1, [user_id]);

    if (checkResult1.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "user not exist" });
    }

      if (parent_comment_id) {
        const parentCheckQuery = "SELECT * FROM qafi_comment WHERE id = $1";
        const parentCheckResult = await pool.query(parentCheckQuery, [parent_comment_id]);
        if (parentCheckResult.rowCount === 0) {
          return res.status(404).json({ statusCode: 404, message: "parent comment not found" });
        }
      }

      const createQuery =
        "INSERT INTO qafi_comment (QAFI_id,user_id,comment,parent_comment_id) VALUES($1,$2,$3,$4) RETURNING *";
      const result = await pool.query(createQuery, [QAFI_id, user_id, comment, parent_comment_id]);
    if (result.rowCount === 1) {
      // Send Push Notification to QAFI Owner
      try {
        const qafiOwnerId = checkResult.rows[0].user_id;
        const commenterName = checkResult1.rows[0].username;
        
        if (qafiOwnerId && qafiOwnerId !== user_id) {
          const title = NOTIFICATION_TITLES.NEW_COMMENT;
          const body = NOTIFICATION_MESSAGES.NEW_COMMENT_DESC(commenterName);
          
          notifyUser({
            sender_id: user_id,
            receiver_id: qafiOwnerId,
            title,
            body,
            moduletype: "QAFI",
            item_id: String(QAFI_id),
            action: "comment"
          });
        }
      } catch (pushErr) {
        console.error("Comment push notification failed:", pushErr.message);
      }

      let commentQuery = `SELECT 
      v.id AS commentId,
      v.parent_comment_id AS parentCommentId,
      v.comment AS comment,
      v.created_at AS commentCreatedAt,
            u.id AS userId,
            u.username AS username,
            u.image AS userImage,
            u.is_premium AS premium,
            q.shared_post_id,
            orig.description AS original_description,
            orig.image AS original_image,
          orig.video AS original_video,
          orig.thumbnail AS original_thumbnail,
          orig.type AS original_type,
orig.type AS original_type,
            orig_u.username AS original_username,
            orig_u.image AS original_user_image,
            orig_u.is_premium AS original_premium,
            orig.created_at AS original_created_at
            FROM qafi_comment v
            LEFT JOIN users u ON v.user_id = u.id
            LEFT JOIN qafi q ON v.QAFI_id = q.id
            LEFT JOIN QAFI orig ON q.shared_post_id = orig.id
            LEFT JOIN users orig_u ON orig.user_id = orig_u.id
            WHERE v.id=$1
            ORDER BY v.created_at DESC;
            `;
      const { rows } = await pool.query(commentQuery, [result.rows[0].id]);
      const commentData = rows[0] ? mapQafiRow(rows[0]) : null;
      return res.status(201).json({
        statusCode: 201,
        message: "Comment posted successfully",
        data: commentData,
      });
    }
    res.status(400).json({ statusCode: 400, message: "Not uploaded" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};
export const getAllCommentsByQAFI = async (req, res) => {
  try {
    const postId = toSafeInt(req.params.id);
    if (postId === null) {
      return res.status(400).json({ statusCode: 400, message: "Invalid id" });
    }

    const checkResult = await pool.query("SELECT id FROM qafi WHERE id = $1", [postId]);
    if (checkResult.rowCount === 0) {
      return res.status(404).json({ statusCode: 404, message: "QAFI does not exist" });
    }

    // Shared reader: hides moderated comments, keeps replies under their parent,
    // marks deleted comments / users, adds like counts.
    const result = await fetchCommentTree({
      table: "qafi_comment",
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


export const likeUnlikeQafi = async (req, res) => {
  try {
    const { QAFI_id, user_id } = req.body;
    const checkQafiQuery = "SELECT * FROM qafi WHERE id = $1";
    const checkQafiResult = await pool.query(checkQafiQuery, [QAFI_id]);

    if (checkQafiResult.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "QAFI not exist" });
    }

    // Check if the user has already liked the video
    const checkQuery =
      "SELECT * FROM like_qafi WHERE QAFI_id = $1 AND user_id = $2";
    const checkResult = await pool.query(checkQuery, [QAFI_id, user_id]);

    if (checkResult.rowCount > 0) {
      const createQuery =
        "DELETE FROM like_qafi WHERE user_id=$1 AND QAFI_id=$2 RETURNING *";
      const result = await pool.query(createQuery, [user_id, QAFI_id]);
      if (result.rowCount === 1) {
        return res.status(200).json({
          statusCode: 201,
          message: "QAFI Unlike successfully",
          data: result.rows[0],
        });
      }
      //   return res
      //     .status(400)
      //     .json({
      //       statusCode: 400,
      //       message: "User has already liked the pic tour",
      //     });
    }
    const createQuery = "INSERT INTO like_qafi (QAFI_id, user_id) VALUES($1, $2) RETURNING *";
    const result = await pool.query(createQuery, [QAFI_id, user_id]);
    if (result.rowCount === 1) {
      // Send Push Notification to owner
      try {
        const postOwnerId = checkQafiResult.rows[0].user_id;
        const likerInfo = await pool.query("SELECT username FROM users WHERE id = $1", [user_id]);
        const likerName = likerInfo.rows[0]?.username;

        if (postOwnerId && postOwnerId !== user_id) {
          const title = NOTIFICATION_TITLES.POST_LIKED;
          const body = NOTIFICATION_MESSAGES.POST_LIKED_DESC(likerName);
          
          notifyUser({
            sender_id: user_id,
            receiver_id: postOwnerId,
            title,
            body,
            moduletype: 'QAFI',
            item_id: String(QAFI_id),
            action: 'like'
          });
        }
      } catch (err) {
        console.warn('Push notification for like failed:', err.message);
      }

      return res.status(201).json({
        statusCode: 201,
        message: "Qafi like successfully",
        data: result.rows[0],
      });
    }
    res.status(400).json({ statusCode: 400, message: "Not uploaded" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const UnlikePicTour = async (req, res) => {
  try {
    const { like_id } = req.body;
    const createQuery = "DELETE FROM like_pic WHERE id=$1 RETURNING *";
    const result = await pool.query(createQuery, [like_id]);
    if (result.rowCount === 1) {
      return res.status(200).json({
        statusCode: 201,
        message: "Pic tour Unlike successfully",
        data: result.rows[0],
      });
    }
    res.status(400).json({ statusCode: 400, message: "User like not exist" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};
export const getAllLikesByQafi = async (req, res) => {
  try {
    const { id } = req.params;

    let likeQuery = `
      SELECT
        l.*,
        q.description,
        q.category AS category_id,
        q.sub_category AS sub_category_id,
        q.image AS qafi_image,
        q.type AS qafi_type,
        q.created_at AS qafi_created_at,
        q.user_id AS qafi_user_id,
        u.username AS qafi_username,
        u.image AS qafi_user_image,
        lu.is_premium AS liker_premium,
        c.name AS category_name,
        sc.name AS sub_category_name
      FROM like_qafi l
      JOIN qafi q ON l.QAFI_id = q.id
      JOIN users u ON q.user_id = u.id
      LEFT JOIN users lu ON l.user_id = lu.id
      LEFT JOIN QAFI_category c ON q.category = c.id
      LEFT JOIN QAFI_sub_category sc ON q.sub_category = sc.id
      WHERE l.QAFI_id = $1
      ORDER BY l.created_at DESC;
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

export const getSpecificQafi = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.query;
    const query = `SELECT
    v.id AS qafi_id,
    v.description,
    v.category AS category_id,
    v.sub_category AS sub_category_id,
    v.image,
    v.video,
    v.thumbnail,
    v.type,
    v.created_at AS tour_created_at,
    v.user_id,
    u.username AS username,
    u.image AS userImage,
    u.is_premium AS premium,
    u.is_subscribed,
    u.badge,
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
        FROM qafi_comment c
        JOIN users cu ON c.user_id = cu.id
        WHERE c.QAFI_id = v.id
    ) AS comments,
    (
        SELECT COALESCE(json_agg(
            json_build_object(
                'id', lv.id,
                'user_id', lv.user_id,
                'QAFI_id', v.id,
                'created_at', lu.created_at,
                'updated_at', lu.updated_at
            )
        ), '[]'::json)
        FROM like_qafi lv
        JOIN users lu ON lv.user_id = lu.id
        WHERE lv.QAFI_id = v.id
    ) AS likes,
        v.shared_post_id,
        orig.description AS original_description,
        orig.image AS original_image,
          orig.video AS original_video,
          orig.thumbnail AS original_thumbnail,
          orig.type AS original_type,
        orig_u.username AS original_username,
        orig_u.image AS original_user_image,
        orig_u.is_premium AS original_premium,
        orig_u.is_subscribed AS original_is_subscribed,
        orig_u.badge AS original_badge,
        orig.created_at AS original_created_at,
        bool_or(sn.id IS NOT NULL) AS is_saved,
        bool_or(lv.id IS NOT NULL) AS is_liked
FROM QAFI v
JOIN users u ON v.user_id = u.id
LEFT JOIN QAFI orig ON v.shared_post_id = orig.id
LEFT JOIN users orig_u ON orig.user_id = orig_u.id
LEFT JOIN save_item_general sn ON sn.module = 'qafi' AND sn.module_item_id::int = v.id AND sn.user_id = $2
LEFT JOIN like_qafi lv ON lv.QAFI_id = v.id AND lv.user_id = $2
WHERE v.id = $1 AND u.is_deleted=FALSE
GROUP BY v.id, u.username, u.image, u.is_premium, u.is_subscribed, u.badge, orig.id, orig_u.id, orig_u.is_premium, orig_u.is_subscribed, orig_u.badge;`;

    const { rows } = await pool.query(query, [id, user_id || null]);

    const qafiData = rows[0];
    const mappedQafi = mapQafiRow(qafiData);
    if (mappedQafi && !mappedQafi.shared_post_id) mappedQafi.original_post = null;
    return res.status(200).json({ statusCode: 200, QAFI: mappedQafi || [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const getAllQAFIs = async (req, res) => {
  try {
    let page = parseInt(req.query.page); // Get the page number from the query parameters
    const perPage = parseInt(req.query.limit);
    const offset = (page - 1) * perPage;

    let getQuery = `SELECT
      v.id AS qafi_id,
      v.description,
      v.category AS category_id,
      v.sub_category AS sub_category_id,
      v.image,
      v.video,
      v.thumbnail,
      v.type,
      v.created_at AS tour_created_at,
      v.user_id,
      v.shared_post_id,
      u.username AS username,
      u.image AS userImage,
      u.is_premium AS premium,
      u.is_subscribed,
      u.badge,
      c.name AS category_name,
      sc.name AS sub_category_name,
      c.french_name AS category_french_name,
      sc.french_name AS sub_category_french_name,
      orig.description AS original_description,
      orig.image AS original_image,
          orig.video AS original_video,
          orig.thumbnail AS original_thumbnail,
          orig.type AS original_type,
      orig_u.username AS original_username,
      orig_u.image AS original_user_image,
      orig_u.is_premium AS original_premium,
      orig_u.is_subscribed AS original_is_subscribed,
      orig_u.badge AS original_badge,
      orig.created_at AS original_created_at,
      bool_or(sn.id IS NOT NULL) AS is_saved,
      bool_or(lv.id IS NOT NULL) AS is_liked
    FROM qafi v
    JOIN users u ON v.user_id = u.id
    LEFT JOIN QAFI_category c ON v.category = c.id
    LEFT JOIN QAFI_sub_category sc ON v.sub_category = sc.id
    LEFT JOIN QAFI orig ON v.shared_post_id = orig.id
    LEFT JOIN users orig_u ON orig.user_id = orig_u.id
    LEFT JOIN save_item_general sn ON sn.module = 'qafi' AND sn.module_item_id::int = v.id AND sn.user_id = $3
    LEFT JOIN like_qafi lv ON lv.QAFI_id = v.id AND lv.user_id = $3
    WHERE u.is_deleted = FALSE
    GROUP BY v.id, u.username, u.image, u.is_premium, u.is_subscribed, u.badge, c.id, sc.id, orig.id, orig_u.id, orig_u.is_premium, orig_u.is_subscribed, orig_u.badge
    ORDER BY v.created_at DESC`;

    if (req.query.page !== undefined && req.query.limit !== undefined) {
      getQuery += ` LIMIT $1 OFFSET $2;`;
    }

    let queryParameters = [];

    if (req.query.page !== undefined || req.query.limit !== undefined) {
      queryParameters = [perPage, offset, req.query.user_id || null];
    } else {
      queryParameters = [req.query.user_id || null];
    }

    const { rows } = await pool.query(getQuery, queryParameters);

    if (req.query.page === undefined && req.query.limit === undefined) {
      // If no pagination is applied, don't calculate totalCategories and totalPages
      const formattedRows = rows.map((row) => {
        const mapped = mapQafiRow(row);
        if (!mapped.shared_post_id) mapped.original_post = null;
        return mapped;
      });

      res.status(200).json({
        statusCode: 200,
        totalQAFIs: formattedRows.length,
        AllQAFIs: formattedRows,
      });
    } else {
      // Calculate the total number of QAFIs (without pagination)
      const countQuery = `SELECT COUNT(*) FROM qafi JOIN users u ON qafi.user_id = u.id WHERE u.is_deleted = FALSE;`;

      const totalQAFIsResult = await pool.query(countQuery);
      const totalQAFIs = totalQAFIsResult.rows[0].count;
      const totalPages = Math.ceil(totalQAFIs / perPage);

      res.status(200).json({
        statusCode: 200,
        totalQAFIs,
        totalPages,
        AllQAFIs: rows.map((row) => {
          const mapped = mapQafiRow(row);
          if (!mapped.shared_post_id) mapped.original_post = null;
          return mapped;
        }),
      });
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error", error });
  }
};

export const getAllQafisByUser = async (req, res) => {
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

    const countQuery = `SELECT COUNT(*) FROM qafi WHERE user_id=$1;`;
    const countResult = await pool.query(countQuery, [id]);
    const totalQAFIs = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalQAFIs / perPage);

    const query = `SELECT
      v.id AS qafi_id,
      v.description,
      v.category AS category_id,
      v.sub_category AS sub_category_id,
      v.image,
      v.video,
      v.thumbnail,
      v.type,
      v.created_at AS tour_created_at,
      v.user_id,
      v.shared_post_id,
      u.username AS username,
      u.image AS userImage,
      u.is_premium AS premium,
      u.badge AS badge,
      u.is_subscribed AS is_subscribed,
      c.name AS category_name,
      sc.name AS sub_category_name,
      c.french_name AS category_french_name,
      sc.french_name AS sub_category_french_name,
      orig.description AS original_description,
      orig.image AS original_image,
          orig.video AS original_video,
          orig.thumbnail AS original_thumbnail,
          orig.type AS original_type,
orig.type AS original_type,
      orig_u.username AS original_username,
      orig_u.image AS original_user_image,
      orig_u.is_premium AS original_premium,
      orig_u.badge AS original_badge,
      orig_u.is_subscribed AS original_is_subscribed,
      orig.created_at AS original_created_at,
      bool_or(sn.id IS NOT NULL) AS is_saved,
      bool_or(lv.id IS NOT NULL) AS is_liked
    FROM qafi v
    JOIN users u ON v.user_id = u.id
    LEFT JOIN QAFI_category c ON v.category = c.id
    LEFT JOIN QAFI_sub_category sc ON v.sub_category = sc.id
    LEFT JOIN QAFI orig ON v.shared_post_id = orig.id
    LEFT JOIN users orig_u ON orig.user_id = orig_u.id
    LEFT JOIN save_item_general sn ON sn.module = 'qafi' AND sn.module_item_id::int = v.id AND sn.user_id = $4
    LEFT JOIN like_qafi lv ON lv.QAFI_id = v.id AND lv.user_id = $4
    WHERE v.user_id = $1
    GROUP BY v.id, u.username, u.image, u.is_premium, u.badge, u.is_subscribed, c.id, sc.id, orig.id, orig_u.id, orig_u.is_premium, orig_u.badge, orig_u.is_subscribed
    LIMIT $2 OFFSET $3;`;

    const { rows } = await pool.query(query, [id, perPage, offset, req.query.user_id || null]);

    return res
      .status(200)
      .json({
        statusCode: 200,
        totalPages,
        totalQAFIs,
        QAFIs: rows.map((row) => {
          const mapped = mapQafiRow(row);
          if (!mapped.shared_post_id) mapped.original_post = null;
          return mapped;
        })
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllQafisByCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.query.user_id || null;

    let page = parseInt(req.query.page || 1);
    const perPage = parseInt(req.query.limit || 1000);
    const offset = (page - 1) * perPage;

    // Count total QAFIs in the given category
    const countQuery = `
      SELECT COUNT(*) FROM QAFI v
      LEFT JOIN QAFI orig ON v.shared_post_id = orig.id
      WHERE (v.category = $1 OR (v.shared_post_id IS NOT NULL AND orig.category = $1))
        AND v.status != 'blocked';
    `;
    const countResult = await pool.query(countQuery, [id]);
    const totalQAFIs = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalQAFIs / perPage);

    // Get QAFIs in the given category with pagination
    const query = `SELECT
      v.id AS qafi_id,
      v.description,
      v.category AS category_id,
      v.sub_category AS sub_category_id,
      sc."index" AS sub_category_index,
      v.image,
      v.video,
      v.thumbnail,
      v.type,
      v.created_at AS created_at,
      v.user_id,
      v.shared_post_id,
      u.username AS username,
      u.image AS user_image,
      u.is_premium AS premium,
      c.name AS category_name,
      sc.name AS sub_category_name,
      c.french_name AS category_french_name,
      sc.french_name AS sub_category_french_name,
      (SELECT COUNT(*) FROM qafi_comment WHERE qafi_comment.qafi_id = v.id AND qafi_comment.is_deleted = FALSE AND qafi_comment.is_hidden = FALSE) AS comment_count,
      (SELECT COUNT(*) FROM like_qafi WHERE like_qafi.qafi_id = v.id) AS total_likes,
      -- Original post details
      orig.description AS original_description,
      orig.image AS original_image,
      orig.video AS original_video,
      orig.thumbnail AS original_thumbnail,
      orig.type AS original_type,
      orig_u.username AS original_username,
      orig_u.image AS original_user_image,
      orig_u.is_premium AS original_premium,
      orig.created_at AS original_created_at,
      bool_or(si.id IS NOT NULL) AS is_saved,
      bool_or(lv.id IS NOT NULL) AS is_liked
    FROM QAFI v
    JOIN users u ON v.user_id = u.id
    LEFT JOIN QAFI_category c ON v.category = c.id
    LEFT JOIN QAFI_sub_category sc ON v.sub_category = sc.id
    LEFT JOIN QAFI orig ON v.shared_post_id = orig.id
    LEFT JOIN users orig_u ON orig.user_id = orig_u.id
    LEFT JOIN save_item_general si ON si.module = 'qafi' AND si.module_item_id::int = v.id AND si.user_id = $4
    LEFT JOIN like_qafi lv ON lv.QAFI_id = v.id AND lv.user_id = $4
    WHERE (v.category = $1 OR (v.shared_post_id IS NOT NULL AND orig.category = $1)) AND u.is_deleted = FALSE AND v.status != 'blocked'
    GROUP BY v.id, u.username, u.image, u.is_premium, c.name, sc.name, c.french_name, sc.french_name, sc."index", orig.id, orig_u.id, orig_u.is_premium
    ORDER BY v.created_at DESC
    LIMIT $2 OFFSET $3;`;

    const { rows } = await pool.query(query, [id, perPage, offset, user_id]);

    // Group QAFIs by sub_category
    const groupedQAFIs = rows.reduce((acc, qafi) => {
      const subCategoryId = qafi.sub_category_id || "uncategorized";
      const subCategoryName = qafi.sub_category_name || "Uncategorized";
      const subCategoryFrenchName = qafi.sub_category_french_name || "Non classé";

      if (!acc[subCategoryId]) {
        acc[subCategoryId] = {
          sub_category_name: subCategoryName,
          sub_category_french_name: subCategoryFrenchName,
          sub_category_id: subCategoryId === "uncategorized" ? null : subCategoryId,
          sub_category_index: qafi.sub_category_index ?? 9999,
          QAFI_result: {
            totalQAFIs: 0,
            totalPages,
            currentPage: page,
            QAFIs: [],
          },
        };
      }

      const mapped = mapQafiRow(qafi);
      if (!mapped.shared_post_id) mapped.original_post = null;
      acc[subCategoryId].QAFI_result.QAFIs.push({
        qafi_id: mapped.qafi_id,
        name: mapped.category_name,
        description: mapped.description,
        image: mapped.image,
        type: mapped.type,
        video: mapped.video,
        user_id: mapped.user_id,
        username: mapped.username,
        user_image: mapped.user_image,
        created_at: mapped.created_at,
        comment_count: mapped.comment_count,
        total_likes: mapped.total_likes,
        is_saved: mapped.is_saved,
        is_liked: mapped.is_liked,
        shared_post_id: mapped.shared_post_id,
        original_post: mapped.original_post,
      });

      acc[subCategoryId].QAFI_result.totalQAFIs++;

      return acc;
    }, {});

    // Convert grouped QAFIs into an array format
    const responseData = Object.values(groupedQAFIs);

    // Sort subcategories by index ascending
    responseData.sort((a, b) => (a.sub_category_index ?? 9999) - (b.sub_category_index ?? 9999));

    return res.status(200).json({
      statusCode: 200,
      message: "Subcategories with QAFIs retrieved successfully",
      data: responseData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const searchQafi = async (req, res) => {
  try {
    const name = req.query.name || req.query.searchWord || "";

    if (!name || typeof name !== "string") {
      return res.status(200).json({ statusCode: 200, totalQAFIs: 0, QAFIs: [] });
    }

    // Split the search query into individual words
    const searchWords = name.split(/\s+/).filter(Boolean).map(safeSearchWord);

    if (searchWords.length === 0) {
      return res.status(200).json({ statusCode: 200, QAFIs: [] });
    }

    // Create an array of conditions for each search word
    const conditions = searchWords.map((word) => {
      const cleanWord = word.replace(/^@+/, "");
      return `(v.description ILIKE '%${word}%' OR v.description ILIKE '%${cleanWord}%' OR u.username ILIKE '%${cleanWord}%' OR u.username ILIKE '%${word}%')`;
    });

    const query = `SELECT
      v.id AS qafi_id,
      v.description,
      v.category AS category_id,
      v.sub_category AS sub_category_id,
      v.image,
      v.video,
      v.thumbnail,
      v.type,
      v.created_at AS tour_created_at,
      v.user_id,
      u.username AS username,
      u.image AS userImage,
      u.is_premium AS premium,
      u.is_subscribed,
      u.badge,
      c.name AS category_name,
      sc.name AS sub_category_name,
      bool_or(sn.id IS NOT NULL) AS is_saved,
      bool_or(lv.id IS NOT NULL) AS is_liked
    FROM qafi v
    JOIN users u ON v.user_id = u.id
    LEFT JOIN QAFI_category c ON v.category = c.id
    LEFT JOIN QAFI_sub_category sc ON v.sub_category = sc.id
    LEFT JOIN save_item_general sn ON sn.module = 'qafi' AND sn.module_item_id::int = v.id AND sn.user_id = $1
    LEFT JOIN like_qafi lv ON lv.QAFI_id = v.id AND lv.user_id = $1
    WHERE (${conditions.join(" OR ")}) AND u.is_deleted=FALSE
    GROUP BY v.id, u.username, u.image, u.is_premium, u.is_subscribed, u.badge, c.id, sc.id
    ORDER BY v.created_at DESC`;

    const { rows } = await pool.query(query, [req.query.user_id || null]);
    const ordered = interleaveBadgeSearchResults(rows, {
      dateFields: ["tour_created_at", "created_at"],
    });

    return res.status(200).json({
      statusCode: 200,
      totalQAFIs: ordered.length,
      QAFIs: ordered.map((row) => {
        const mapped = mapQafiRow(row);
        if (!mapped.shared_post_id) mapped.original_post = null;
        return mapped;
      }),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
