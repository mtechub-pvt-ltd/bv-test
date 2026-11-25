import pool from "../db.config/index.js";
import { fetchCommentTree, commentTreeResponse } from "../utils/commentService.js";
import { toSafeInt } from "../utils/commentModules.js";
import { buildNestedCommentTree } from "../utils/commentUtils.js";
import { getAllRows, getSingleRow } from "../queries/common.js";
import { handle_delete_photos_from_folder } from "../utils/handleDeletePhoto.js";
import { sendPushNotificationToAll, notifyUser } from "../utils/notificationService.js";
import { NOTIFICATION_TITLES, NOTIFICATION_MESSAGES } from "../utils/notificationStrings.js";
import { normalizeNewsQafiMediaFields, mergeNewsQafiMediaForUpdate, mapNewsQafiRow } from "../utils/mediaFields.js";
import { interleaveBadgeSearchResults, paginateBadgeSearchResults } from "../utils/badgeSearchPagination.js";
import { safeSearchWord } from "../utils/sqlSafe.js";
export const createNews = async (req, res) => {
  try {
    const { name, description, category, sub_category, user_id, image, video, thumbnail, type, shared_post_id } = req.body;
    const media = normalizeNewsQafiMediaFields({ image, video, thumbnail, type });


    // Check if the user exists
    const userCheckQuery =
      "SELECT * FROM users WHERE id=$1 AND is_deleted=FALSE";
    const userCheckResult = await pool.query(userCheckQuery, [user_id]);

    if (userCheckResult.rowCount === 0) {
      return res.status(404).json({
        statusCode: 404,
        message: "User does not exist",
      });
    }

    const createQuery =
      "INSERT INTO NEWS (name, description, category, sub_category, image, video, thumbnail, type, user_id, shared_post_id) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *";
    const result = await pool.query(createQuery, [
      name || "",
      description || "",
      category,
      sub_category,
      media.image,
      media.video,
      media.thumbnail,
      media.type,
      user_id,
      shared_post_id || null,
    ]);

    if (result.rowCount === 1) {
      const query = `SELECT
        v.id AS NEWS_id,
        v.name,
        v.description,
        v.category,
        v.sub_category,
        v.image,
        v.video,
        v.thumbnail,
        v.type,
        v.created_at AS news_created_at,
        v.user_id,
        v.shared_post_id,
        u.username AS username,
        u.image AS userImage,
        u.is_premium AS premium,
        orig.name AS original_name,
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
      FROM NEWS v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN NEWS orig ON v.shared_post_id = orig.id
      LEFT JOIN users orig_u ON orig.user_id = orig_u.id
      WHERE v.id = $1
      GROUP BY v.id, u.username, u.image, u.is_premium, orig.id, orig_u.id, orig_u.is_premium, orig.user_id;
      `;
      const data = await pool.query(query, [result.rows[0].id]);
      const newsData = mapNewsQafiRow(data.rows[0]);

      // Send Push Notification
      try {
        const title = NOTIFICATION_TITLES.NEW_NEWS;
        const body = NOTIFICATION_MESSAGES.NEW_NEWS_DESC(name || "New News Update");
        sendPushNotificationToAll(title, body, { 
          moduleId: 'news', 
          itemId: String(newsData.NEWS_id) 
        }, newsData.original_user_id);
      } catch (err) {
        console.warn('Push notification failed:', err.message);
      }

      return res.status(201).json({
        statusCode: 201,
        message: "NEWS posted successfully",
        data: newsData,
      });
    }

    res.status(400).json({ statusCode: 400, message: "Not uploaded" });
  } catch (error) {
    console.error(error);
    if (error.constraint === "news_category_fkey") {
      return res
        .status(400)
        .json({ statusCode: 400, message: "Category does not exist" });
    } else if (error.constraint === "news_sub_category_fkey") {
      return res
        .status(400)
        .json({ statusCode: 400, message: "Sub-category does not exist" });
    } else if (error.constraint === "news_user_id_fkey") {
      return res.status(400).json({ statusCode: 400, message: "User does not exist" });
    }
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const deleteNews = async (req, res) => {
  const { id } = req.params;
  try {
    const condition = {
      column: "id",
      value: id,
    };
    const oldImage = await getSingleRow("NEWS", condition);
    if (oldImage.length === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "NEWS not found " });
    }
    const oldImageSplit = oldImage[0].image.replace("/newsImages/", "");
    const delQuery = "DELETE FROM NEWS WHERE id=$1";
    const result = await pool.query(delQuery, [id]);
    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "NEWS not deleted" });
    }
    handle_delete_photos_from_folder([oldImageSplit], "newsImages");
    res.status(200).json({
      statusCode: 200,
      message: "NEWS deleted successfully",
      deletedNews: oldImage[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};
export const updateNews = async (req, res) => {
  try {
    const { id, name, description, category, sub_category, image, video, thumbnail, type } = req.body;
    const condition = {
      column: "id",
      value: id,
    };
    const oldImage = await getSingleRow("NEWS", condition);
    console.log(oldImage);
    if (oldImage.length === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "NEWS not found" });
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

    const updateType = `UPDATE NEWS SET name=$1, description=$2, category=$3, sub_category=$4, image=$5, video=$6, thumbnail=$7, type=$8, "updated_at"=NOW() WHERE id=$9 RETURNING *`;
    const result = await pool.query(updateType, [
      name,
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
      const query = `SELECT
      v.id AS NEWS_id,
      v.name,
      v.description,
      v.category,
      v.sub_category,
      v.image,
      v.video,
      v.thumbnail,
      v.type,
      v.created_at AS news_created_at,
      v.user_id,
      v.shared_post_id,
      u.username AS username,
      u.image AS userImage,
      u.is_premium AS premium,
      orig.name AS original_name,
      orig.description AS original_description,
      orig.image AS original_image,
        orig.video AS original_video,
        orig.thumbnail AS original_thumbnail,
        orig.type AS original_type,
orig_u.username AS original_username,
      orig_u.image AS original_user_image,
      orig_u.is_premium AS original_premium,
      orig.created_at AS original_created_at
    FROM NEWS v
    JOIN users u ON v.user_id = u.id
    LEFT JOIN NEWS orig ON v.shared_post_id = orig.id
    LEFT JOIN users orig_u ON orig.user_id = orig_u.id
    WHERE v.id = $1
    GROUP BY v.id, u.username, u.image, u.is_premium, orig.id, orig_u.id, orig_u.is_premium;
   `;
      const data = await pool.query(query, [id]);
      const newsData = mapNewsQafiRow(data.rows[0]);
      return res.status(200).json({
        statusCode: 200,
        message: "NEWS updated successfully",
        updateNews: newsData,
      });
    } else {
      res
        .status(404)
        .json({ statusCode: 404, message: "Operation not successful" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteAllNews = async (req, res) => {
  try {
    // Perform a query to delete all users from the database
    const query = "DELETE FROM NEWS RETURNING *";
    const { rows } = await pool.query(query);

    if (rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        message: "No news found to delete",
      });
    }
    const imageFilenames = rows.map((news) =>
      news.image.replace("/newsImages/", "")
    );
    handle_delete_photos_from_folder(imageFilenames, "newsImages");
    res.status(200).json({
      statusCode: 200,
      message: "All News deleted successfully",
      deletedNews: rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};
export const sendComment = async (req, res) => {
  try {
    const { NEWS_id, user_id, comment, parent_comment_id = null } = req.body;
    const checkQuery = "SELECT * FROM NEWS WHERE id = $1";
    const checkResult = await pool.query(checkQuery, [NEWS_id]);

    if (checkResult.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "News not exist" });
    }
    const checkQuery1 =
      "SELECT * FROM users WHERE id = $1 AND is_deleted=FALSE";
    const checkResult1 = await pool.query(checkQuery1, [user_id]);

    if (checkResult1.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "user not exist" });
    }

      if (parent_comment_id) {
        const parentCheckQuery = "SELECT * FROM NEWS_comment WHERE id = $1";
        const parentCheckResult = await pool.query(parentCheckQuery, [parent_comment_id]);
        if (parentCheckResult.rowCount === 0) {
          return res.status(404).json({ statusCode: 404, message: "parent comment not found" });
        }
      }

      const createQuery =
        "INSERT INTO NEWS_comment (NEWS_id,user_id,comment,parent_comment_id) VALUES($1,$2,$3,$4) RETURNING *";
      const result = await pool.query(createQuery, [NEWS_id, user_id, comment, parent_comment_id]);
    if (result.rowCount === 1) {
      // Send Push Notification to News Owner
      try {
        const newsOwnerId = checkResult.rows[0].user_id;
        const commenterName = checkResult1.rows[0].username;
        
        if (newsOwnerId && newsOwnerId !== user_id) {
          const title = NOTIFICATION_TITLES.NEW_COMMENT;
          const body = NOTIFICATION_MESSAGES.NEW_COMMENT_DESC(commenterName);
          
          notifyUser({
            sender_id: user_id,
            receiver_id: newsOwnerId,
            title,
            body,
            moduletype: "news",
            item_id: String(NEWS_id),
            action: "comment"
          });
        }
      } catch (pushErr) {
        console.error("Comment push notification failed:", pushErr.message);
      }

      let commentQuery = `SELECT 
      nc.id AS commentId,
      nc.parent_comment_id AS parentCommentId,
      nc.comment AS comment,
      nc.created_at AS commentCreatedAt,
      nc.user_id AS userId,
      u.username AS username,
      u.image AS userImage,
      u.is_premium AS premium,
      u.is_subscribed,
      u.badge,
      n.shared_post_id,
      orig.name AS original_name,
      orig.description AS original_description,
      orig.image AS original_image,
        orig.video AS original_video,
        orig.thumbnail AS original_thumbnail,
        orig.type AS original_type,
orig_u.username AS original_username,
      orig_u.image AS original_user_image,
      orig_u.is_premium AS original_premium,
      orig.created_at AS original_created_at
    FROM NEWS_comment nc
    LEFT JOIN users u ON nc.user_id = u.id
    LEFT JOIN NEWS n ON nc.NEWS_id = n.id
    LEFT JOIN NEWS orig ON n.shared_post_id = orig.id
    LEFT JOIN users orig_u ON orig.user_id = orig_u.id
    WHERE nc.id=$1
    ORDER BY nc.created_at DESC;
        `;
      const { rows } = await pool.query(commentQuery, [result.rows[0].id]);
      const commentData = rows[0];
      if (commentData && commentData.shared_post_id) {
        commentData.original_post = {
          id: commentData.shared_post_id,
          name: commentData.original_name,
          description: commentData.original_description,
          image: commentData.original_image,
          username: commentData.original_username,
          user_image: commentData.original_user_image,
          premium: commentData.original_premium,
          created_at: commentData.original_created_at,
        };
      } else if (commentData) {
        commentData.original_post = null;
      }
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
export const getAllCommentsByNews = async (req, res) => {
  try {
    const postId = toSafeInt(req.params.id);
    if (postId === null) {
      return res.status(400).json({ statusCode: 400, message: "Invalid id" });
    }

    const checkResult = await pool.query("SELECT id FROM NEWS WHERE id = $1", [postId]);
    if (checkResult.rowCount === 0) {
      return res.status(404).json({ statusCode: 404, message: "News does not exist" });
    }

    // Shared reader: hides moderated comments, keeps replies under their parent,
    // marks deleted comments / users, adds like counts.
    const result = await fetchCommentTree({
      table: "news_comment",
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


export const likeUnlikeNews = async (req, res) => {
  try {
    const { NEWS_id, user_id } = req.body;
    const checkQafiQuery = "SELECT * FROM NEWS WHERE id = $1";
    const checkQafiResult = await pool.query(checkQafiQuery, [NEWS_id]);

    if (checkQafiResult.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "News not exist" });
    }
    const checkQuery1 =
      "SELECT * FROM users WHERE id = $1 AND is_deleted=FALSE";
    const checkResult1 = await pool.query(checkQuery1, [user_id]);

    if (checkResult1.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "user not exist" });
    }
    // Check if the user has already liked the video
    const checkQuery =
      "SELECT * FROM like_NEWS WHERE NEWS_id = $1 AND user_id = $2";
    const checkResult = await pool.query(checkQuery, [NEWS_id, user_id]);

    if (checkResult.rowCount > 0) {
      const createQuery =
        "DELETE FROM like_NEWS WHERE user_id=$1 AND NEWS_id=$2 RETURNING *";
      const result = await pool.query(createQuery, [user_id, NEWS_id]);
      if (result.rowCount === 1) {
        return res.status(200).json({
          statusCode: 201,
          message: "News Unlike successfully",
          data: result.rows[0],
        });
      }
    }
    const createQuery = "INSERT INTO like_NEWS (NEWS_id, user_id) VALUES($1, $2) RETURNING *";
    const result = await pool.query(createQuery, [NEWS_id, user_id]);
    if (result.rowCount === 1) {
      // Send Push Notification to owner
      try {
        const postOwnerId = checkQafiResult.rows[0].user_id;
        const likerName = checkResult1.rows[0].username;

        if (postOwnerId && postOwnerId !== user_id) {
          const title = NOTIFICATION_TITLES.POST_LIKED;
          const body = NOTIFICATION_MESSAGES.POST_LIKED_DESC(likerName);
          
          notifyUser({
            sender_id: user_id,
            receiver_id: postOwnerId,
            title,
            body,
            moduletype: 'news',
            item_id: String(NEWS_id),
            action: 'like'
          });
        }
      } catch (err) {
        console.warn('Push notification for like failed:', err.message);
      }

      return res.status(201).json({
        statusCode: 201,
        message: "NEWS like successfully",
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
export const getAllLikesByNews = async (req, res) => {
  try {
    const { id } = req.params;

    let likeQuery = `
      SELECT
        l.*,
        u.username AS username,
        u.image AS userImage,
        u.is_premium AS premium,
        n.name,
        n.description,
        n.category AS category_id,
        n.sub_category AS sub_category_id,
        n.image AS news_image,
        n.created_at AS news_created_at,
        c.name AS category_name,
        sc.name AS sub_category_name,
        n.shared_post_id,
        orig.name AS original_name,
        orig.description AS original_description,
        orig.image AS original_image,
        orig.video AS original_video,
        orig.thumbnail AS original_thumbnail,
        orig.type AS original_type,
        orig_u.username AS original_username,
        orig_u.image AS original_user_image,
        orig_u.is_premium AS original_premium,
        orig.created_at AS original_created_at
      FROM like_NEWS l
      LEFT JOIN users u ON l.user_id = u.id
      LEFT JOIN NEWS n ON l.NEWS_id = n.id
      LEFT JOIN NEWS_category c ON n.category = c.id
      LEFT JOIN NEWS_sub_category sc ON n.sub_category = sc.id
      LEFT JOIN NEWS orig ON n.shared_post_id = orig.id
      LEFT JOIN users orig_u ON orig.user_id = orig_u.id
      WHERE l.NEWS_id = $1 AND u.is_deleted=FALSE
      ORDER BY l.created_at DESC;
    `;

    const { rows } = await pool.query(likeQuery, [id]);
    const likesWithOriginalPost = rows.map(row => {
      if (row.shared_post_id) {
        row.original_post = {
          id: row.shared_post_id,
          name: row.original_name,
          description: row.original_description,
          image: row.original_image,
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
    res.status(200).json({
      statusCode: 200,
      totalLikes: likesWithOriginalPost.length,
      AllLikes: likesWithOriginalPost,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error", error });
  }
};

export const getSpecificNews = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.query;

    const query = `SELECT
    v.id AS News_id,
    v.description,
    v.category AS disc_category,
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
    (
      SELECT COALESCE(json_agg(
        json_build_object(
          'comment_id', c.id,
          'comment', c.comment,
          'user_id', c.user_id,
          'username', cu.username,
          'userimage', cu.image,
          'premium', cu.is_premium,
          'is_subscribed', cu.is_subscribed,
          'badge', cu.badge,
          'comment_created_at', c.created_at
        )
      ), '[]'::json)
      FROM NEWS_comment c
      JOIN users cu ON c.user_id = cu.id
      WHERE c.NEWS_id = v.id
    ) AS comments,
    (
      SELECT COALESCE(json_agg(
        json_build_object(
          'like_id', l.id,
          'user_id', l.user_id,
          'username', lu.username,
          'userimage', lu.image,
          'premium', lu.is_premium,
          'is_subscribed', lu.is_subscribed,
          'badge', lu.badge
        )
      ), '[]'::json)
      FROM like_NEWS l
      JOIN users lu ON l.user_id = lu.id
      WHERE l.NEWS_id = v.id
    ) AS likes,
    orig.name AS original_name,
    orig.description AS original_description,
    orig.image AS original_image,
        orig.video AS original_video,
        orig.thumbnail AS original_thumbnail,
        orig.type AS original_type,
orig_u.username AS original_username,
    orig_u.image AS original_user_image,
    orig_u.is_premium AS original_premium,
    orig_u.badge AS original_badge,
    orig_u.is_subscribed AS original_is_subscribed,
    orig.created_at AS original_created_at,
    bool_or(sn.id IS NOT NULL) AS is_saved,
    bool_or(lv.id IS NOT NULL) AS is_liked
    FROM NEWS v
    JOIN users u ON v.user_id = u.id
    LEFT JOIN NEWS orig ON v.shared_post_id = orig.id
    LEFT JOIN users orig_u ON orig.user_id = orig_u.id
    LEFT JOIN save_item_general sn ON sn.module = 'news' AND sn.module_item_id::int = v.id AND sn.user_id = $2
    LEFT JOIN like_NEWS lv ON lv.NEWS_id = v.id AND lv.user_id = $2
    WHERE v.id = $1 AND u.is_deleted=FALSE 
    GROUP BY v.id, u.username, u.image, u.is_premium, u.badge, u.is_subscribed, orig.id, orig_u.id, orig_u.is_premium, orig_u.badge, orig_u.is_subscribed;`;

    const params = [id, user_id || null];

    const { rows } = await pool.query(query, params);

    if (rows.length > 0) {
      const newsData = mapNewsQafiRow(rows[0]);
      return res.status(200).json({ statusCode: 200, News: newsData });
    } else {
      res.status(404).json({ statusCode: 404, message: "No news found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const getAllNews = async (req, res) => {
  try {
    let page = parseInt(req.query.page); // Get the page number from the query parameters
    const perPage = parseInt(req.query.limit);
    const offset = (page - 1) * perPage;

    let getQuery = `SELECT
      v.id AS NEWS_id,
      v.name,
      v.description,
      v.category AS category_id,
      v.sub_category AS sub_category_id,
      v.image,
      v.video,
      v.thumbnail,
      v.type,
      v.created_at AS news_created_at,
      v.user_id,
      v.shared_post_id,
      u.username AS username,
      u.image AS userImage,
      u.is_premium AS premium,
      c.name AS category_name,
      sc.name AS sub_category_name,
      c.french_name AS category_french_name,
      sc.french_name AS sub_category_french_name,
      orig.name AS original_name,
      orig.description AS original_description,
      orig.image AS original_image,
        orig.video AS original_video,
        orig.thumbnail AS original_thumbnail,
        orig.type AS original_type,
orig_u.username AS original_username,
      orig_u.image AS original_user_image,
      orig.created_at AS original_created_at,
      bool_or(sn.id IS NOT NULL) AS is_saved,
      bool_or(lv.id IS NOT NULL) AS is_liked
    FROM NEWS v
    JOIN users u ON v.user_id = u.id
    LEFT JOIN NEWS_category c ON v.category = c.id
    LEFT JOIN NEWS_sub_category sc ON v.sub_category = sc.id
    LEFT JOIN NEWS orig ON v.shared_post_id = orig.id
    LEFT JOIN users orig_u ON orig.user_id = orig_u.id
    LEFT JOIN save_item_general sn ON sn.module = 'news' AND sn.module_item_id::int = v.id AND sn.user_id = $3
    LEFT JOIN like_NEWS lv ON lv.NEWS_id = v.id AND lv.user_id = $3
    WHERE u.is_deleted=FALSE
    GROUP BY v.id, u.username, u.image, u.is_premium, c.id, sc.id, orig.id, orig_u.id
    ORDER BY v.created_at DESC`;

    if (req.query.page !== undefined && req.query.limit !== undefined) {
      getQuery += ` LIMIT $1 OFFSET $2;`;
    }

    let queryParameters = [
      isNaN(perPage) ? null : perPage,
      isNaN(offset) ? null : offset,
      req.query.user_id || null
    ];

    const { rows } = await pool.query(getQuery, queryParameters);

    if (req.query.page === undefined && req.query.limit === undefined) {
      // If no pagination is applied, don't calculate totalCategories and totalPages
      res.status(200).json({
        statusCode: 200,
        totalNEWS: rows.length,
        News: rows.map((row) => mapNewsQafiRow(row)),
      });
    } else {
      // Calculate the total number of NEWS (without pagination)
      const countQuery = `SELECT COUNT(*) FROM NEWS JOIN users u ON NEWS.user_id = u.id WHERE u.is_deleted = FALSE;`;

      const totalNEWSResult = await pool.query(countQuery);
      const totalNEWS = totalNEWSResult.rows[0].count;
      const totalPages = Math.ceil(totalNEWS / perPage);

      res.status(200).json({
        statusCode: 200,
        totalNEWS,
        totalPages,
        AllNEWS: rows.map((row) => mapNewsQafiRow(row)),
      });
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error", error });
  }
};
export const getAllNewsByUser = async (req, res) => {
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

    const countQuery = `SELECT COUNT(*) FROM NEWS WHERE user_id=$1;`;
    const countResult = await pool.query(countQuery, [id]);
    const totalNews = parseInt(countResult.rows[0].count);

    const totalPages = Math.ceil(totalNews / perPage);

    const query = `SELECT
      v.id AS NEWS_id,
      v.name,
      v.description,
      v.category AS category_id,
      v.sub_category AS sub_category_id,
      v.image,
      v.video,
      v.thumbnail,
      v.type,
      v.created_at AS news_created_at,
      v.user_id,
      u.username AS username,
      u.image AS userImage,
      u.is_premium AS premium,
      u.badge AS badge,
      u.is_subscribed AS is_subscribed,
      c.name AS category_name,
      sc.name AS sub_category_name,
      c.french_name AS category_french_name,
      sc.french_name AS sub_category_french_name,
      v.shared_post_id,
      orig.name AS original_name,
      orig.description AS original_description,
      orig.image AS original_image,
        orig.video AS original_video,
        orig.thumbnail AS original_thumbnail,
        orig.type AS original_type,
orig_u.username AS original_username,
      orig_u.image AS original_user_image,
      orig_u.is_premium AS original_premium,
      orig_u.badge AS original_badge,
      orig_u.is_subscribed AS original_is_subscribed,
      orig.created_at AS original_created_at,
      bool_or(sn.id IS NOT NULL) AS is_saved,
      bool_or(lv.id IS NOT NULL) AS is_liked
    FROM NEWS v
    JOIN users u ON v.user_id = u.id
    LEFT JOIN NEWS_category c ON v.category = c.id
    LEFT JOIN NEWS_sub_category sc ON v.sub_category = sc.id
    LEFT JOIN NEWS orig ON v.shared_post_id = orig.id
    LEFT JOIN users orig_u ON orig.user_id = orig_u.id
    LEFT JOIN save_item_general sn ON sn.module = 'news' AND sn.module_item_id::int = v.id AND sn.user_id = $4
    LEFT JOIN like_NEWS lv ON lv.NEWS_id = v.id AND lv.user_id = $4
    WHERE v.user_id = $1 AND u.is_deleted=FALSE
    GROUP BY v.id, u.username, u.image, u.is_premium, u.badge, u.is_subscribed, c.id, sc.id, orig.id, orig_u.id, orig_u.badge, orig_u.is_subscribed
    ORDER BY v.created_at DESC
    LIMIT $2 OFFSET $3;`;

    const { rows } = await pool.query(query, [id, perPage, offset, req.query.user_id || null]);

    return res
      .status(200)
      .json({
        statusCode: 200,
        totalPages,
        totalNews,
        News: rows.map((row) => mapNewsQafiRow(row))
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllNewsByCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.query.user_id || null;

    let page = parseInt(req.query.page || 1); // Get the page number from the query parameters
    const perPage = parseInt(req.query.limit || 1000); // Number of results per page
    const offset = (page - 1) * perPage;

    // Count total news in the given category
    const countQuery = `
      SELECT COUNT(*) FROM NEWS v
      LEFT JOIN NEWS orig ON v.shared_post_id = orig.id
      WHERE (v.category = $1 OR (v.shared_post_id IS NOT NULL AND orig.category = $1))
        AND v.status != 'blocked';
    `;
    const countResult = await pool.query(countQuery, [id]);
    const totalNews = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalNews / perPage);

    // Get news in the given category with pagination
    const query = `SELECT
      v.id AS news_id,
      v.name,
      v.description,
      v.category AS category_id,
      v.sub_category AS sub_category_id,
      sc."index" AS sub_category_index,
      orig.sub_category AS original_sub_category_id,
      orig_sc.name AS original_sub_category_name,
      orig_sc.french_name AS original_sub_category_french_name,
      orig_sc."index" AS original_sub_category_index,
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
      u.badge AS badge,
      u.is_subscribed AS is_subscribed,
      c.name AS category_name,
      sc.name AS sub_category_name,
      c.french_name AS category_french_name,
      sc.french_name AS sub_category_french_name,
      (SELECT COUNT(*) FROM NEWS_comment WHERE NEWS_comment.NEWS_id = v.id AND NEWS_comment.is_deleted = FALSE AND NEWS_comment.is_hidden = FALSE) AS comment_count,
      (SELECT COUNT(*) FROM like_NEWS WHERE like_NEWS.NEWS_id = v.id) AS total_likes,
      -- Original post details
      orig.name AS original_name,
      orig.description AS original_description,
      orig.image AS original_image,
        orig.video AS original_video,
        orig.thumbnail AS original_thumbnail,
        orig.type AS original_type,
orig.sub_category AS original_sub_category_id,
      orig_sc.name AS original_sub_category_name,
      orig_sc.french_name AS original_sub_category_french_name,
      orig_sc."index" AS original_sub_category_index,
      orig_u.username AS original_username,
      orig_u.image AS original_user_image,
      orig_u.is_premium AS original_premium,
      orig_u.is_subscribed AS original_is_subscribed,
      orig_u.badge AS original_badge,
      orig.created_at AS original_created_at,
      bool_or(sn.id IS NOT NULL) AS is_saved,
      bool_or(lv.id IS NOT NULL) AS is_liked
    FROM NEWS v
    JOIN users u ON v.user_id = u.id
    LEFT JOIN NEWS_category c ON v.category = c.id
    LEFT JOIN NEWS_sub_category sc ON v.sub_category = sc.id
    LEFT JOIN NEWS orig ON v.shared_post_id = orig.id
    LEFT JOIN users orig_u ON orig.user_id = orig_u.id
    LEFT JOIN NEWS_sub_category orig_sc ON orig.sub_category = orig_sc.id
    LEFT JOIN save_item_general sn ON sn.module = 'news' AND sn.module_item_id::int = v.id AND sn.user_id = $4
    LEFT JOIN like_NEWS lv ON lv.NEWS_id = v.id AND lv.user_id = $4
    WHERE (v.category = $1 OR (v.shared_post_id IS NOT NULL AND orig.category = $1))
      AND u.is_deleted=FALSE AND v.status != 'blocked'
     GROUP BY v.id, u.username, u.image, u.is_premium, u.badge, u.is_subscribed, c.id, sc.id, orig.id, orig_u.id, orig_sc.id, sc."index", orig_sc."index", orig_u.is_premium, orig_u.badge, orig_u.is_subscribed
    ORDER BY v.created_at DESC
    LIMIT $2 OFFSET $3;`;

    const { rows } = await pool.query(query, [id, perPage, offset, user_id]);

    // Group news by sub_category
    const groupedNews = rows.reduce((acc, news) => {
      const subCategoryId = news.sub_category_id || news.original_sub_category_id || null;
      const subCategoryName = news.sub_category_name || news.original_sub_category_name || null;
      const subCategoryFrenchName = news.sub_category_french_name || news.original_sub_category_french_name || null;
      const subCategoryIndex = news.sub_category_index ?? news.original_sub_category_index ?? null;

      if (!acc[subCategoryId]) {
        acc[subCategoryId] = {
          sub_category_name: subCategoryName,
          sub_category_french_name: subCategoryFrenchName,
          sub_category_index: subCategoryIndex,
          sub_category_id: subCategoryId,
          news_result: {
            totalNews: 0,
            totalPages,
            currentPage: page,
            News: [],
          },
        };
      }

      acc[subCategoryId].news_result.News.push(mapNewsQafiRow(news));

      acc[subCategoryId].news_result.totalNews++;

      return acc;
    }, {});

    // Convert grouped news into an array format
    let responseData = Object.values(groupedNews);

    // Sort subcategories by the newest news item's created_at (DESC)
    responseData.sort((a, b) => {
      const aNewest = new Date(a.news_result.News[0]?.created_at || 0);
      const bNewest = new Date(b.news_result.News[0]?.created_at || 0);
      return bNewest - aNewest;
    });

    return res.status(200).json({
      statusCode: 200,
      message: "Subcategories with news retrieved successfully",
      data: responseData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const searchNews = async (req, res) => {
  try {
    const { name } = req.query;

    // Validate that name is provided
    if (!name || typeof name !== 'string') {
      return res.status(200).json({ statusCode: 200, News: [] });
    }

    // Split the search query into individual words
    const searchWords = name.split(/\s+/).filter(Boolean).map(safeSearchWord);

    if (searchWords.length === 0) {
      return res.status(200).json({ statusCode: 200, News: [] });
    }

    // Create an array of conditions for each search word
    const conditions = searchWords.map((word) => {
      const cleanWord = word.replace(/^@+/, "");
      return `(v.name ILIKE '%${word}%' OR v.description ILIKE '%${word}%' OR u.username ILIKE '%${cleanWord}%' OR u.username ILIKE '%${word}%')`;
    });

    const query = `SELECT
      v.id AS NEWS_id,
      v.name,
      v.description,
      v.category AS category_id,
      v.sub_category AS sub_category_id,
      v.image,
      v.video,
      v.thumbnail,
      v.type,
      v.created_at AS news_created_at,
      v.user_id,
      v.shared_post_id,
      u.username AS username,
      u.image AS userImage,
      u.is_premium AS premium,
      u.is_subscribed,
      u.badge,
      c.name AS category_name,
      sc.name AS sub_category_name,
      orig.name AS original_name,
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
      bool_or(sn.id IS NOT NULL) AS is_saved
    FROM NEWS v
    JOIN users u ON v.user_id = u.id
    LEFT JOIN NEWS_category c ON v.category = c.id
    LEFT JOIN NEWS_sub_category sc ON v.sub_category = sc.id
    LEFT JOIN NEWS orig ON v.shared_post_id = orig.id
    LEFT JOIN users orig_u ON orig.user_id = orig_u.id
    LEFT JOIN save_item_general sn ON sn.module = 'news' AND sn.module_item_id::int = v.id AND sn.user_id = $1
    WHERE (${conditions.join(" OR ")}) AND u.is_deleted=FALSE
     GROUP BY v.id, v.name, v.description, v.category, v.sub_category, v.image, v.type, v.created_at, v.user_id, v.shared_post_id, u.username, u.image, u.is_premium, u.is_subscribed, u.badge, c.id, c.name, sc.id, sc.name, orig.id, orig.name, orig.description, orig.image, orig.type, orig.created_at, orig_u.id, orig_u.username, orig_u.image, orig_u.is_premium, orig_u.is_subscribed, orig_u.badge
    ORDER BY v.created_at DESC`;

    const { rows } = await pool.query(query, [req.query.user_id || null]);
    const ordered = interleaveBadgeSearchResults(rows, {
      dateFields: ["news_created_at", "created_at"],
    });

    return res
      .status(200)
      .json({
        statusCode: 200,
        totalNews: ordered.length,
        News: ordered.map((row) => mapNewsQafiRow(row))
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
