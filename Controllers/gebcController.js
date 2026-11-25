import pool from "../db.config/index.js";
import { fetchCommentTree, commentTreeResponse } from "../utils/commentService.js";
import { toSafeInt } from "../utils/commentModules.js";
import { buildNestedCommentTree } from "../utils/commentUtils.js";
import { getAllRows, getSingleRow } from "../queries/common.js";
import { handle_delete_photos_from_folder } from "../utils/handleDeletePhoto.js";
import { sendPushNotificationToAll, notifyUser } from "../utils/notificationService.js";
import { NOTIFICATION_TITLES, NOTIFICATION_MESSAGES } from "../utils/notificationStrings.js";
import { interleaveBadgeSearchResults, paginateBadgeSearchResults } from "../utils/badgeSearchPagination.js";
import { safeSearchWord } from "../utils/sqlSafe.js";
export const createGEBC = async (req, res) => {
  try {
    const { name, description, category, category_id, main_category_id, sub_category, sub_category_id, user_id, image, shared_post_id } = req.body;
    const categoryVal = category_id || category || main_category_id || null;
    const subCategoryVal = sub_category_id || sub_category || null;

    // Check if the user exists
    const userCheckQuery =
      "SELECT * FROM users WHERE id=$1 AND is_deleted=FALSE";
    const userCheckResult = await pool.query(userCheckQuery, [user_id]);

    if (userCheckResult.rowCount === 0) {
      return res.status(404).json({
        statusCode: 404,
        message: "user not exist",
      });
    }


    const createQuery =
      "INSERT INTO GEBC (name, description, category, sub_category, image, user_id, shared_post_id) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *";
    const result = await pool.query(createQuery, [
      name || "",
      description || "",
      categoryVal,
      subCategoryVal,
      image || "",
      user_id,
      shared_post_id || null,
    ]);

    if (result.rowCount === 1) {
      const query = `SELECT
        v.id AS gebc_id,
        v.description,
        v.category,
        v.sub_category,
        v.image,
        v.created_at AS tour_created_at,
        v.user_id,
        v.shared_post_id,
        u.username AS username,
        u.image AS userImage,
        u.is_premium AS premium,
        orig.description AS original_description,
        orig.image AS original_image,
        orig_u.username AS original_username,
        orig_u.image AS original_user_image,
        orig_u.is_premium AS original_premium,
        orig.user_id AS original_user_id,
        orig.created_at AS original_created_at
      FROM GEBC v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN GEBC orig ON v.shared_post_id = orig.id
      LEFT JOIN users orig_u ON orig.user_id = orig_u.id
      WHERE v.id = $1
      GROUP BY v.id, u.username, u.image, u.is_premium, orig.id, orig_u.id, orig_u.is_premium, orig.user_id;`;
      const data = await pool.query(query, [result.rows[0].id]);
      const gebcData = data.rows[0];
      if (gebcData.shared_post_id) {
        gebcData.original_post = {
          id: gebcData.shared_post_id,
          name: gebcData.original_name,
          description: gebcData.original_description,
          image: gebcData.original_image,
          username: gebcData.original_username,
          user_image: gebcData.original_user_image,
          premium: gebcData.original_premium,
          created_at: gebcData.original_created_at,
        };
      } else {
        gebcData.original_post = null;
      }

      // Send Push Notification
      try {
        const title = NOTIFICATION_TITLES.NEW_EBIC;
        const body = NOTIFICATION_MESSAGES.NEW_EBIC_DESC(name || "New EBIC post");
        sendPushNotificationToAll(title, body, { 
          moduleId: 'GEBC', 
          itemId: String(gebcData.gebc_id) 
        }, gebcData.original_user_id);
      } catch (err) {
        console.warn('Push notification failed:', err.message);
      }

      return res.status(201).json({
        statusCode: 201,
        message: "GEBC posted successfully",
        data: gebcData,
      });
    }

    res.status(400).json({ statusCode: 400, message: "Not uploaded" });
  } catch (error) {
    console.error(error);
    if (error.constraint === "gebc_category_fkey") {
      return res
        .status(400)
        .json({ statusCode: 400, message: "Disc category does not exist" });
    } else if (error.constraint === "gebc_sub_category_fkey") {
      return res.status(400).json({
        statusCode: 400,
        message:
          "Sub-category does not exist or does not belong to the category",
      });
    } else if (error.constraint === "gebc_user_id_fkey") {
      return res.status(400).json({ statusCode: 400, message: "user not exist" });
    }
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const deleteGEBC = async (req, res) => {
  const { id } = req.params;
  try {
    const condition = {
      column: "id",
      value: id,
    };
    const oldImage = await getSingleRow("GEBC", condition);
    if (oldImage.length === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "GEBC not found " });
    }
    const oldImageSplit = oldImage[0].image.replace("/gebcImages/", "");
    const delQuery = "DELETE FROM GEBC WHERE id=$1";
    const result = await pool.query(delQuery, [id]);
    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "GEBC not deleted" });
    }
    handle_delete_photos_from_folder([oldImageSplit], "gebcImages");
    res.status(200).json({
      statusCode: 200,
      message: "GEBC deleted successfully",
      deletedGEBC: oldImage[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};
export const updateGEBC = async (req, res) => {
  try {
    const { id, name, description, category, sub_category, image } = req.body;
    const condition = {
      column: "id",
      value: id,
    };
    const oldImage = await getSingleRow("gebc", condition);
    console.log(oldImage);
    if (oldImage.length === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "GEBC not found" });
    }

    // Check if the category exists
    const categoryCheckQuery = "SELECT * FROM public.GEBC_category WHERE id=$1";
    const categoryCheckResult = await pool.query(categoryCheckQuery, [
      category,
    ]);

    if (categoryCheckResult.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "Category not exist" });
    }

    // Check if the sub-category exists
    const subCategoryCheckQuery =
      "SELECT * FROM public.GEBC_sub_category WHERE id=$1 AND category_id=$2";
    const subCategoryCheckResult = await pool.query(subCategoryCheckQuery, [
      sub_category,
      category,
    ]);

    if (subCategoryCheckResult.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "Category not exist" });
    }

    let updateData = {
      image: oldImage[0].image,
    };
    if (image) {
      updateData.image = image;
      const imageSplit = oldImage[0].image.replace("/fileUpload/", "");
      handle_delete_photos_from_folder([imageSplit], "fileUpload");
    }

    const updateType = `UPDATE GEBC SET name=$1, description=$2, category=$3, sub_category=$4, image=$5, "updated_at"=NOW() WHERE id=$6 RETURNING *`;
    const result = await pool.query(updateType, [
      name,
      description,
      category,
      sub_category,
      updateData.image,
      id,
    ]);
    if (result.rowCount === 1) {
      const query = `SELECT
        v.id AS gebc_id,
        v.description,
        v.category,
        v.sub_category,
        v.image,
        v.created_at AS tour_created_at,
        v.user_id,
        v.shared_post_id,
        u.username AS username,
        u.image AS userImage,
        u.is_premium AS premium,
        orig.description AS original_description,
        orig.image AS original_image,
        orig_u.username AS original_username,
        orig_u.image AS original_user_image,
        orig_u.is_premium AS original_premium,
        orig.user_id AS original_user_id, orig.created_at AS original_created_at
      FROM GEBC v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN GEBC orig ON v.shared_post_id = orig.id
      LEFT JOIN users orig_u ON orig.user_id = orig_u.id
      WHERE v.id = $1
      GROUP BY v.id, u.username, u.image, u.is_premium, orig.id, orig_u.id, orig_u.is_premium, orig.user_id;`;
      const data = await pool.query(query, [id]);
      const gebcData = data.rows[0];
      if (gebcData.shared_post_id) {
        gebcData.original_post = {
          id: gebcData.shared_post_id,
          name: gebcData.original_name,
          description: gebcData.original_description,
          image: gebcData.original_image,
          username: gebcData.original_username,
          user_image: gebcData.original_user_image,
          premium: gebcData.original_premium,
          created_at: gebcData.original_created_at,
        };
      } else {
        gebcData.original_post = null;
      }
      return res.status(200).json({
        statusCode: 200,
        message: "GEBC updated successfully",
        updateGEBC: gebcData,
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

export const deleteAllGEBCs = async (req, res) => {
  try {
    // Perform a query to delete all users from the database
    const query = "DELETE FROM GEBC RETURNING *";
    const { rows } = await pool.query(query);

    if (rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        message: "No GEBC found to delete",
      });
    }
    const imageFilenames = rows.map((news) =>
      news.image.replace("/gebcImages/", "")
    );
    handle_delete_photos_from_folder(imageFilenames, "gebcImages");
    res.status(200).json({
      statusCode: 200,
      message: "All GEBC deleted successfully",
      deletedGEBC: rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};
export const sendComment = async (req, res) => {
  try {
    const { GEBC_id, user_id, comment, parent_comment_id = null } = req.body;
    const checkQuery = "SELECT * FROM GEBC WHERE id = $1";
    const checkResult = await pool.query(checkQuery, [GEBC_id]);

    if (checkResult.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "GEBC not exist" });
    }
    const checkQuery1 = "SELECT * FROM users WHERE id = $1";
    const checkResult1 = await pool.query(checkQuery1, [user_id]);

    if (checkResult1.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "user not exist" });
    }

      if (parent_comment_id) {
        const parentCheckQuery = "SELECT * FROM GEBC_comment WHERE id = $1";
        const parentCheckResult = await pool.query(parentCheckQuery, [parent_comment_id]);
        if (parentCheckResult.rowCount === 0) {
          return res.status(404).json({ statusCode: 404, message: "parent comment not found" });
        }
      }

      const createQuery =
        "INSERT INTO GEBC_comment (GEBC_id,user_id,comment,parent_comment_id) VALUES($1,$2,$3,$4) RETURNING *";
      const result = await pool.query(createQuery, [GEBC_id, user_id, comment, parent_comment_id]);
    if (result.rowCount === 1) {
      // Send Push Notification to GEBC Owner
      try {
        const gebcOwnerId = checkResult.rows[0].user_id;
        const commenterName = checkResult1.rows[0].username;
        
        if (gebcOwnerId && gebcOwnerId !== user_id) {
          const title = NOTIFICATION_TITLES.NEW_COMMENT;
          const body = NOTIFICATION_MESSAGES.NEW_COMMENT_DESC(commenterName);
          
          notifyUser({
            sender_id: user_id,
            receiver_id: gebcOwnerId,
            title,
            body,
            moduletype: "GEBC",
            item_id: String(GEBC_id),
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
            orig.name AS original_name,
            orig.description AS original_description,
            orig.image AS original_image,
            orig_u.username AS original_username,
            orig_u.image AS original_user_image,
            orig_u.is_premium AS original_premium,
            orig.created_at AS original_created_at
            FROM GEBC_comment v
            LEFT JOIN users u ON v.user_id = u.id
            LEFT JOIN GEBC g ON v.GEBC_id = g.id
            LEFT JOIN GEBC orig ON g.shared_post_id = orig.id
            LEFT JOIN users orig_u ON orig.user_id = orig_u.id
            WHERE v.id=$1
            ORDER BY v.created_at DESC;
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
export const getAllCommentsByGEBC = async (req, res) => {
  try {
    const postId = toSafeInt(req.params.id);
    if (postId === null) {
      return res.status(400).json({ statusCode: 400, message: "Invalid id" });
    }

    const checkResult = await pool.query("SELECT id FROM GEBC WHERE id = $1", [postId]);
    if (checkResult.rowCount === 0) {
      return res.status(404).json({ statusCode: 404, message: "GEBC does not exist" });
    }

    // Shared reader: hides moderated comments, keeps replies under their parent,
    // marks deleted comments / users, adds like counts.
    const result = await fetchCommentTree({
      table: "gebc_comment",
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


export const likeUnlikeGEBC = async (req, res) => {
  try {
    const { GEBC_id, user_id } = req.body;
    const checkQafiQuery = "SELECT * FROM GEBC WHERE id = $1";
    const checkQafiResult = await pool.query(checkQafiQuery, [GEBC_id]);

    if (checkQafiResult.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "GEBC not exist" });
    }

    // Check if the user has already liked the video
    const checkQuery =
      "SELECT * FROM like_GEBC WHERE GEBC_id = $1 AND user_id = $2";
    const checkResult = await pool.query(checkQuery, [GEBC_id, user_id]);

    if (checkResult.rowCount > 0) {
      const createQuery =
        "DELETE FROM like_GEBC WHERE user_id=$1 AND GEBC_id=$2 RETURNING *";
      const result = await pool.query(createQuery, [user_id, GEBC_id]);
      if (result.rowCount === 1) {
        return res.status(200).json({
          statusCode: 201,
          message: "GEBC Unlike successfully",
          data: result.rows[0],
        });
      }
    }
    const createQuery = "INSERT INTO like_GEBC (GEBC_id, user_id) VALUES($1, $2) RETURNING *";
    const result = await pool.query(createQuery, [GEBC_id, user_id]);
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
            moduletype: 'GEBC',
            item_id: String(GEBC_id),
            action: 'like'
          });
        }
      } catch (err) {
        console.warn('Push notification for like failed:', err.message);
      }

      return res.status(201).json({
        statusCode: 201,
        message: "GEBC like successfully",
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
export const getAllLikesByGBEC = async (req, res) => {
  try {
    const { id } = req.params;
     let likeQuery = `SELECT v.*, u.username, u.image AS userImage, u.is_premium AS premium
       FROM like_GEBC v
       LEFT JOIN users u ON v.user_id = u.id
       WHERE GEBC_id=$1
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

export const getSpecificGEBC = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.query;
    const query = `SELECT
        v.id AS gebc_id,
        v.name,
        v.description,
        v.category,
        v.image,
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
                    'is_subscribed', cu.is_subscribed,
                    'badge', cu.badge,
                    'comment_created_at', c.created_at
                )
            ), '[]'::json)
            FROM GEBC_comment c
            JOIN users cu ON c.user_id = cu.id
            WHERE c.GEBC_id = v.id
        ) AS comments,
        (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'id', lv.id,
                    'user_id', lv.user_id,
                    'GEBC_id', v.id,
                    'premium', lu.is_premium,
                    'created_at', lu.created_at,
                    'updated_at', lu.updated_at
                )
            ), '[]'::json)
            FROM like_GEBC lv
            JOIN users lu ON lv.user_id = lu.id
            WHERE lv.GEBC_id = v.id
        ) AS likes,
        orig.name AS original_name,
        orig.description AS original_description,
        orig.image AS original_image,
        orig_u.username AS original_username,
        orig_u.image AS original_user_image,
        orig_u.is_premium AS original_premium,
        orig_u.badge AS original_badge,
        orig_u.is_subscribed AS original_is_subscribed,
        orig.user_id AS original_user_id, orig.created_at AS original_created_at,
        bool_or(sn.id IS NOT NULL) AS is_saved,
        bool_or(lv.id IS NOT NULL) AS is_liked
    FROM GEBC v
    JOIN users u ON v.user_id = u.id
    LEFT JOIN GEBC orig ON v.shared_post_id = orig.id
    LEFT JOIN users orig_u ON orig.user_id = orig_u.id
    LEFT JOIN save_item_general sn ON sn.module = 'gebc' AND sn.module_item_id::int = v.id AND sn.user_id = $2
    LEFT JOIN like_GEBC lv ON lv.GEBC_id = v.id AND lv.user_id = $2
    WHERE v.id = $1 AND u.is_deleted=FALSE
    GROUP BY v.id, u.username, u.image, u.is_premium, u.badge, u.is_subscribed, orig.id, orig_u.id, orig_u.is_premium, orig_u.badge, orig_u.is_subscribed;
 `;

    const { rows } = await pool.query(query, [id, user_id || null]);
    if (rows.length > 0) {
      const gebcData = rows[0];
      if (gebcData.shared_post_id) {
        gebcData.original_post = {
          id: gebcData.shared_post_id,
          name: gebcData.original_name,
          description: gebcData.original_description,
          image: gebcData.original_image,
          username: gebcData.original_username,
          user_image: gebcData.original_user_image,
          premium: gebcData.original_premium,
          badge: gebcData.original_badge,
          is_subscribed: gebcData.original_is_subscribed,
          created_at: gebcData.original_created_at,
        };
      } else {
        gebcData.original_post = null;
      }
      return res.status(200).json({ statusCode: 200, GEBC: gebcData });
    } else {
      res.status(404).json({ statusCode: 404, message: "No GEBC found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const getAllGEBCs = async (req, res) => {
  try {
    let page = parseInt(req.query.page); // Get the page number from the query parameters
    const perPage = parseInt(req.query.limit);
    const offset = (page - 1) * perPage;

    let getQuery = `SELECT
      v.id AS gebc_id,
      v.name,
      v.description,
      v.category AS category_id,
      v.sub_category AS sub_category_id,
      v.image,
      v.created_at AS tour_created_at,
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
      orig_u.username AS original_username,
      orig_u.image AS original_user_image,
      orig_u.is_premium AS original_premium,
      orig.user_id AS original_user_id, orig.created_at AS original_created_at,
      bool_or(sn.id IS NOT NULL) AS is_saved,
      bool_or(lv.id IS NOT NULL) AS is_liked
    FROM GEBC v
    JOIN users u ON v.user_id = u.id
    LEFT JOIN GEBC_category c ON v.category = c.id
    LEFT JOIN GEBC_sub_category sc ON v.sub_category = sc.id
    LEFT JOIN GEBC orig ON v.shared_post_id = orig.id
    LEFT JOIN users orig_u ON orig.user_id = orig_u.id
    LEFT JOIN save_item_general sn ON sn.module = 'gebc' AND sn.module_item_id::int = v.id AND sn.user_id = $3
    LEFT JOIN like_GEBC lv ON lv.GEBC_id = v.id AND lv.user_id = $3
    WHERE u.is_deleted=FALSE
    GROUP BY v.id, u.username, u.image, u.is_premium, c.id, sc.id, orig.id, orig_u.id, orig_u.is_premium
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

    const responseRows = rows.map((row) => {
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

    if (req.query.page === undefined && req.query.limit === undefined) {
      // If no pagination is applied, don't calculate totalCategories and totalPages
      res.status(200).json({
        statusCode: 200,
        totalGEBC: responseRows.length,
        AllGEBCs: responseRows,
      });
    } else {
      // Calculate the total number of GEBCs (without pagination)
      const countQuery = `SELECT COUNT(*) FROM GEBC JOIN users u ON GEBC.user_id = u.id WHERE u.is_deleted = FALSE;`;

      const totalGEBCResult = await pool.query(countQuery);
      const totalGEBC = totalGEBCResult.rows[0].count;
      const totalPages = Math.ceil(totalGEBC / perPage);

      const responseRows = rows.map((row) => {
        if (row.shared_post_id) {
          row.original_post = {
            id: row.shared_post_id,
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
        totalGEBC,
        totalPages,
        AllGEBCs: responseRows,
      });
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error", error });
  }
};

export const getAllGEBCByUser = async (req, res) => {
  try {
    const { id } = req.params;
    const checkQuery =
      "SELECT * FROM users WHERE id = $1 AND users.is_deleted=FALSE";
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "User does not exist" });
    }

    const page = parseInt(req.query.page || 1); // Get the page number from the query parameters
    const perPage = parseInt(req.query.limit || 100); // Number of results per page
    const offset = (page - 1) * perPage;

    const countQuery = `SELECT COUNT(*) FROM GEBC WHERE user_id=$1;`;
    const countResult = await pool.query(countQuery, [id]);
    const totalGEBCs = parseInt(countResult.rows[0].count);

    const totalPages = Math.ceil(totalGEBCs / perPage);

    const query = `SELECT
      v.id AS gebc_id,
      v.name,
      v.description,
      v.category AS category_id,
      v.sub_category AS sub_category_id,
      v.image,
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
      orig.name AS original_name,
      orig.description AS original_description,
      orig.image AS original_image,
      orig_u.username AS original_username,
      orig_u.image AS original_user_image,
      orig_u.is_premium AS original_premium,
      orig_u.badge AS original_badge,
      orig_u.is_subscribed AS original_is_subscribed,
      orig.user_id AS original_user_id, orig.created_at AS original_created_at,
      bool_or(sn.id IS NOT NULL) AS is_saved,
      bool_or(lv.id IS NOT NULL) AS is_liked
    FROM GEBC v
    JOIN users u ON v.user_id = u.id
    LEFT JOIN GEBC_category c ON v.category = c.id
    LEFT JOIN GEBC_sub_category sc ON v.sub_category = sc.id
    LEFT JOIN GEBC orig ON v.shared_post_id = orig.id
    LEFT JOIN users orig_u ON orig.user_id = orig_u.id
    LEFT JOIN save_item_general sn ON sn.module = 'gebc' AND sn.module_item_id::int = v.id AND sn.user_id = $4
    LEFT JOIN like_GEBC lv ON lv.GEBC_id = v.id AND lv.user_id = $4
    WHERE v.user_id = $1 AND u.is_deleted=FALSE
    GROUP BY v.id, u.username, u.image, u.is_premium, u.badge, u.is_subscribed, c.id, sc.id, orig.id, orig_u.id, orig_u.is_premium, orig_u.badge, orig_u.is_subscribed
    ORDER BY v.created_at DESC
    LIMIT $2 OFFSET $3;`;

    const { rows } = await pool.query(query, [id, perPage, offset, req.query.user_id || null]);

    const responseRows = rows.map((row) => {
      if (row.shared_post_id) {
        row.original_post = {
          id: row.shared_post_id,
          name: row.original_name,
          description: row.original_description,
          image: row.original_image,
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
    });

    return res
      .status(200)
      .json({ statusCode: 200, totalPages, totalGEBCs, GEBCs: responseRows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllGEBCsByCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.query.user_id || null;



    const page = parseInt(req.query.page || 1); // Get the page number from the query parameters
    const perPage = parseInt(req.query.limit || 1000); // Number of results per page
    const offset = (page - 1) * perPage;

    // Count total GEBCs in the given category
    const countQuery = `
      SELECT COUNT(*) FROM GEBC v
      LEFT JOIN GEBC orig ON v.shared_post_id = orig.id
      WHERE (v.category = $1 OR (v.shared_post_id IS NOT NULL AND orig.category = $1))
        AND v.status != 'blocked';
    `;
    const countResult = await pool.query(countQuery, [id]);
    const totalGEBCs = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalGEBCs / perPage);

    // Get GEBCs in the given category with pagination
    const query = `SELECT
      v.id AS id,
      v.name,
      v.description,
      v.category AS category_id,
      v.sub_category AS sub_category_id,
      sc."index" AS sub_category_index,
      v.image,
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
      (SELECT COUNT(*) FROM GEBC_comment WHERE GEBC_comment.GEBC_id = v.id AND GEBC_comment.is_deleted = FALSE AND GEBC_comment.is_hidden = FALSE) AS comment_count,
      (SELECT COUNT(*) FROM like_GEBC WHERE like_GEBC.GEBC_id = v.id) AS total_likes,
      -- Original post details
      orig.name AS original_name,
      orig.description AS original_description,
      orig.image AS original_image,
      orig_u.username AS original_username,
      orig_u.image AS original_user_image,
      orig_u.is_premium AS original_premium,
      orig.user_id AS original_user_id, orig.created_at AS original_created_at,
      bool_or(si.id IS NOT NULL) AS is_saved,
      bool_or(lv.id IS NOT NULL) AS is_liked
    FROM GEBC v
    JOIN users u ON v.user_id = u.id
    LEFT JOIN GEBC_category c ON v.category = c.id
    LEFT JOIN GEBC_sub_category sc ON v.sub_category = sc.id
    LEFT JOIN GEBC orig ON v.shared_post_id = orig.id
    LEFT JOIN users orig_u ON orig.user_id = orig_u.id
    LEFT JOIN save_item_general si ON si.module = 'gebc' AND si.module_item_id::int = v.id AND si.user_id = $4
    LEFT JOIN like_GEBC lv ON lv.GEBC_id = v.id AND lv.user_id = $4
    WHERE (v.category = $1 OR (v.shared_post_id IS NOT NULL AND orig.category = $1)) AND u.is_deleted=FALSE AND v.status != 'blocked'
    GROUP BY v.id, u.username, u.image, u.is_premium, c.name, sc.name, c.french_name, sc.french_name, sc."index", orig.id, orig_u.id, orig_u.is_premium
    ORDER BY v.created_at DESC
    LIMIT $2 OFFSET $3;`;

    const { rows } = await pool.query(query, [id, perPage, offset, user_id]);

    // Group GEBCs by sub_category
    const groupedGEBCs = rows.reduce((acc, gebc) => {
      const subCategoryId = gebc.sub_category_id;
      if (!acc[subCategoryId]) {
        acc[subCategoryId] = {
          sub_category_name: gebc.sub_category_name,
          sub_category_french_name: gebc.sub_category_french_name,
          sub_category_id: subCategoryId,
          sub_category_index: gebc.sub_category_index,
          GEBC_result: {
            totalGEBCs: 0,
            totalPages,
            currentPage: page,
            GEBCs: [],
          },
        };
      }

      acc[subCategoryId].GEBC_result.GEBCs.push({
        gebc_id: gebc.id, // Use 'id' instead of 'GEBC_id'
        name: gebc.name,
        description: gebc.description,
        image: gebc.image,
        user_id: gebc.user_id,
        username: gebc.username,
        user_image: gebc.user_image,
        created_at: gebc.created_at,
        comment_count: gebc.comment_count,
        total_likes: gebc.total_likes,
        is_saved: gebc.is_saved,
        is_liked: gebc.is_liked,

        shared_post_id: gebc.shared_post_id,
        original_post: gebc.shared_post_id ? {
          id: gebc.shared_post_id,
          name: gebc.original_name,
          description: gebc.original_description,
          image: gebc.original_image,
          username: gebc.original_username,
          user_image: gebc.original_user_image,
          premium: gebc.original_premium,
          created_at: gebc.original_created_at
        } : null
      });

      acc[subCategoryId].GEBC_result.totalGEBCs++;

      return acc;
    }, {});

    // Convert grouped GEBCs into an array format
    const responseData = Object.values(groupedGEBCs);

    // Sort subcategories by index ascending
    responseData.sort((a, b) => (a.sub_category_index ?? 9999) - (b.sub_category_index ?? 9999));

    return res.status(200).json({
      statusCode: 200,
      message: "Subcategories with GEBCs retrieved successfully",
      data: responseData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const searchGEBCs = async (req, res) => {
  try {
    const { name } = req.query;

    // Validate that name is provided
    if (!name || typeof name !== 'string') {
      return res.status(200).json({ statusCode: 200, GEBCs: [] });
    }

    // Split the search query into individual words
    const searchWords = name.split(/\s+/).filter(Boolean).map(safeSearchWord);

    if (searchWords.length === 0) {
      return res.status(200).json({ statusCode: 200, GEBCs: [] });
    }

    // Create an array of conditions for each search word
    const conditions = searchWords.map((word) => {
      const cleanWord = word.replace(/^@+/, "");
      return `(v.name ILIKE '%${word}%' OR v.description ILIKE '%${word}%' OR u.username ILIKE '%${cleanWord}%' OR u.username ILIKE '%${word}%' OR orig_u.username ILIKE '%${cleanWord}%' OR orig_u.username ILIKE '%${word}%')`;
    });

    const query = `SELECT
      v.id AS gebc_id,
      v.description,
      v.category AS category_id,
      v.sub_category AS sub_category_id,
      v.image,
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
      orig.description AS original_description,
      orig.image AS original_image,
      orig_u.username AS original_username,
      orig_u.image AS original_user_image,
      orig_u.is_subscribed AS original_is_subscribed,
      orig_u.badge AS original_badge,
      orig.user_id AS original_user_id, orig.created_at AS original_created_at,
      bool_or(sn.id IS NOT NULL) AS is_saved,
      bool_or(lv.id IS NOT NULL) AS is_liked
    FROM GEBC v
    JOIN users u ON v.user_id = u.id
    LEFT JOIN GEBC_category c ON v.category = c.id
    LEFT JOIN GEBC_sub_category sc ON v.sub_category = sc.id
    LEFT JOIN GEBC orig ON v.shared_post_id = orig.id
    LEFT JOIN users orig_u ON orig.user_id = orig_u.id
    LEFT JOIN save_item_general sn ON sn.module = 'gebc' AND sn.module_item_id::int = v.id AND sn.user_id = $1
    LEFT JOIN like_GEBC lv ON lv.GEBC_id = v.id AND lv.user_id = $1
    WHERE (${conditions.join(" OR ")}) AND u.is_deleted=FALSE
    GROUP BY v.id, u.username, u.image, u.is_premium, u.is_subscribed, u.badge, c.id, sc.id, orig.id, orig_u.id, orig_u.is_subscribed, orig_u.badge
    ORDER BY v.created_at DESC`;

    const { rows } = await pool.query(query, [req.query.user_id || null]);
    const ordered = interleaveBadgeSearchResults(rows, {
      dateFields: ["tour_created_at", "created_at"],
    });

    const responseRows = ordered.map((row) => {
      if (row.shared_post_id) {
        row.original_post = {
          id: row.shared_post_id,
          name: row.original_name,
          description: row.original_description,
          image: row.original_image,
          username: row.original_username,
          user_image: row.original_user_image,
          is_subscribed: row.original_is_subscribed,
          badge: row.original_badge,
          created_at: row.original_created_at,
        };
      } else {
        row.original_post = null;
      }
      return row;
    });

    return res
      .status(200)
      .json({ statusCode: 200, totalGEBCs: responseRows.length, GEBCs: responseRows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
