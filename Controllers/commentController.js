import pool from "../db.config/index.js";
import {
  MODULE_TABLE_MAP,
  getCommentTableName,
  toSafeInt,
} from "../utils/commentModules.js";
import { removeComment } from "../utils/commentService.js";

// Re-exported so existing imports (generalReportController, routers) keep working.
export { MODULE_TABLE_MAP, getCommentTableName };

const fail = (res, status, message, extra = {}) =>
  res.status(status).json({ statusCode: status, success: false, message, ...extra });

/** module + comment id + logged in user, validated. Returns null after answering with an error. */
const readCommentRequest = (req, res) => {
  const rawModule = req.params.module || req.body?.module || req.query?.module;
  if (!rawModule) {
    fail(res, 400, "Module name is required (e.g. picTour, letter, news, gebc, qafi, cinematics, etc.)");
    return null;
  }
  const table = getCommentTableName(rawModule);
  if (!table) {
    fail(res, 400, `Invalid module name '${rawModule}'`);
    return null;
  }
  const rawId = req.params.commentId ?? req.params.id ?? req.body?.commentId ?? req.body?.comment_id ?? req.body?.id;
  if (rawId === undefined || rawId === null || rawId === "") {
    fail(res, 400, "commentId is required");
    return null;
  }
  const commentId = toSafeInt(rawId);
  if (commentId === null) {
    fail(res, 400, "Invalid comment id");
    return null;
  }
  // identity comes from the login token only (routes are protected by requireUser)
  const userId = toSafeInt(req.authUser?.id ?? req.user?.userId);
  if (userId === null) {
    fail(res, 401, "Please log in to continue");
    return null;
  }
  return { table, commentId, userId };
};

/**
 * Edit your own comment.
 * There is no time limit: an edited comment is marked "edited" with the date.
 */
export const editComment = async (req, res) => {
  try {
    const ctx = readCommentRequest(req, res);
    if (!ctx) return;
    const { table, commentId, userId } = ctx;

    const raw = req.body?.comment ?? req.body?.content;
    const newContent = typeof raw === "string" ? raw.trim() : "";
    if (!newContent) return fail(res, 400, "Comment text cannot be empty");

    const found = await pool.query(
      `SELECT id, user_id, comment, is_deleted, is_hidden FROM public.${table} WHERE id = $1`,
      [commentId]
    );
    if (found.rowCount === 0) return fail(res, 404, "Comment not found");
    const current = found.rows[0];

    if (Number(current.user_id) !== userId) {
      return fail(res, 403, "Unauthorized: You can only edit your own comments");
    }
    if (current.is_deleted) return fail(res, 400, "Cannot edit a deleted comment");
    if (current.is_hidden) return fail(res, 403, "This comment was removed by a moderator and can't be edited");

    if (current.comment === newContent) {
      return res.status(200).json({
        statusCode: 200,
        success: true,
        message: "Comment unchanged",
        data: { commentId, id: commentId, comment: newContent, is_deleted: false },
      });
    }

    const updated = await pool.query(
      `UPDATE public.${table}
          SET comment = $1,
              is_edited = TRUE,
              edited_at = (NOW() AT TIME ZONE 'UTC'),
              updated_at = (NOW() AT TIME ZONE 'UTC')
        WHERE id = $2 AND user_id = $3
        RETURNING *`,
      [newContent, commentId, userId]
    );
    const row = updated.rows[0];

    return res.status(200).json({
      statusCode: 200,
      success: true,
      message: "Comment edited successfully",
      data: { ...row, commentId: row.id, is_edited: true, edited_at: row.edited_at, is_deleted: false },
    });
  } catch (error) {
    console.error("editComment error:", error);
    return fail(res, 500, "Could not edit the comment. Please try again");
  }
};

/**
 * Delete your own comment.
 * Deleting a comment also deletes every reply under it (same as YouTube).
 */
export const deleteComment = async (req, res) => {
  try {
    const ctx = readCommentRequest(req, res);
    if (!ctx) return;
    const { table, commentId, userId } = ctx;

    const found = await pool.query(`SELECT id, user_id, is_deleted FROM public.${table} WHERE id = $1`, [commentId]);
    if (found.rowCount === 0) return fail(res, 404, "Comment not found");
    if (Number(found.rows[0].user_id) !== userId) {
      return fail(res, 403, "Unauthorized: You can only delete your own comments");
    }
    if (found.rows[0].is_deleted) return fail(res, 400, "Comment already deleted");

    const result = await removeComment(table, commentId);
    if (result.status === "not_found") return fail(res, 404, "Comment not found");
    if (result.status === "already_deleted") return fail(res, 400, "Comment already deleted");

    return res.status(200).json({
      statusCode: 200,
      success: true,
      message: result.deletedIds.length > 1 ? "Comment and its replies deleted successfully" : "Comment deleted successfully",
      data: {
        commentId,
        deleted_ids: result.deletedIds,
        deleted_count: result.deletedIds.length,
        is_deleted: true,
        soft: false,
      },
    });
  } catch (error) {
    console.error("deleteComment error:", error);
    return fail(res, 500, "Could not delete the comment. Please try again");
  }
};

/** Like / unlike a comment (toggle). */
export const toggleCommentLike = async (req, res) => {
  try {
    const ctx = readCommentRequest(req, res);
    if (!ctx) return;
    const { table, commentId, userId } = ctx;

    const found = await pool.query(
      `SELECT id, is_deleted, is_hidden FROM public.${table} WHERE id = $1`,
      [commentId]
    );
    if (found.rowCount === 0) return fail(res, 404, "Comment not found");
    if (found.rows[0].is_deleted || found.rows[0].is_hidden) {
      return fail(res, 400, "This comment is no longer available");
    }

    const removed = await pool.query(
      "DELETE FROM public.comment_likes WHERE comment_table = $1 AND comment_id = $2 AND user_id = $3",
      [table, commentId, userId]
    );
    let liked = false;
    if (removed.rowCount === 0) {
      await pool.query(
        `INSERT INTO public.comment_likes (comment_table, comment_id, user_id)
         VALUES ($1, $2, $3) ON CONFLICT (comment_table, comment_id, user_id) DO NOTHING`,
        [table, commentId, userId]
      );
      liked = true;
    }
    const count = await pool.query(
      "SELECT COUNT(*)::int AS n FROM public.comment_likes WHERE comment_table = $1 AND comment_id = $2",
      [table, commentId]
    );
    return res.status(200).json({
      statusCode: 200,
      success: true,
      message: liked ? "Comment liked" : "Like removed",
      data: { commentId, liked, is_liked: liked, like_count: count.rows[0].n },
    });
  } catch (error) {
    console.error("toggleCommentLike error:", error);
    return fail(res, 500, "Could not update the like. Please try again");
  }
};

/**
 * Helper to attach the edit / delete / like endpoints to a module router in one line.
 * Every route requires a login (identity comes from the token).
 */
export const moduleCommentRouter = (moduleName) => {
  const setModule = (req, res, next) => {
    req.params.module = moduleName;
    next();
  };
  return {
    editComment: [setModule, editComment],
    deleteComment: [setModule, deleteComment],
    likeComment: [setModule, toggleCommentLike],
  };
};
