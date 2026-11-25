import pool from "../db.config/index.js";
import { COMMENT_MODULES, toSafeInt } from "../utils/commentModules.js";
import { afterCommentCreated } from "../utils/commentService.js";

const reject = (res, status, message) =>
  res.status(status).json({ statusCode: status, success: false, message });

const isEmptyParent = (v) =>
  v === undefined || v === null || v === "" || v === 0 || v === "0" || v === "null" || v === "undefined";

/** Which column of the comment table holds the post id for this request. */
const scopeColumnFor = (table) => COMMENT_MODULES[table].postColumn;

/**
 * Runs in front of EVERY "add comment" endpoint (all 13 modules).
 *
 *  1. identity comes from the login token - a user_id in the body is overwritten
 *  2. the text is trimmed and must not be empty
 *  3. a reply must point to an existing, visible comment of the SAME post;
 *     replies to replies are attached to the top-level comment (1 tier)
 *  4. after a successful create, reply + @mention notifications are sent
 *
 * Mount it AFTER requireUser:  router.post("/addComment", requireUser, commentCreateGuard("fan_star_video_comment"), addComment)
 */
export const commentCreateGuard = (table) => {
  const meta = COMMENT_MODULES[table];
  if (!meta) throw new Error(`commentCreateGuard: unknown comment table '${table}'`);

  return async (req, res, next) => {
    try {
      if (!req.authUser?.id) return reject(res, 401, "Please log in to comment");
      req.body = req.body && typeof req.body === "object" ? req.body : {};
      const body = req.body;

      // 1. identity
      body.user_id = req.authUser.id;
      body.userId = req.authUser.id;

      // 2. text
      const raw = body.comment ?? body.text;
      const text = typeof raw === "string" ? raw.trim() : "";
      if (!text) return reject(res, 400, "Comment cannot be empty");
      body.comment = text;

      // 3. parent
      const column = scopeColumnFor(table);
      const postKey = meta.bodyKeys.find((k) => body[k] !== undefined && body[k] !== null && body[k] !== "");
      const postId = postKey ? toSafeInt(body[postKey]) : null;
      if (postKey && postId === null) return reject(res, 400, "Invalid post id");

      const rawParent = body.parent_comment_id ?? body.parentCommentId ?? body.parent_id;
      delete body.parentCommentId;
      delete body.parent_id;

      let parentId = null;
      if (!isEmptyParent(rawParent)) {
        parentId = toSafeInt(rawParent);
        if (parentId === null) return reject(res, 400, "Invalid parent comment");

        const parent = await pool.query(
          `SELECT id, parent_comment_id, user_id, is_hidden, is_deleted, ${column} AS scope_id
             FROM public.${table} WHERE id = $1`,
          [parentId]
        );
        if (parent.rowCount === 0) return reject(res, 404, "The comment you are replying to no longer exists");
        const p = parent.rows[0];
        if (p.is_hidden || p.is_deleted) return reject(res, 400, "You can no longer reply to this comment");
        if (postId !== null && p.scope_id !== null && Number(p.scope_id) !== postId) {
          return reject(res, 400, "That comment belongs to a different post");
        }
        // one level of replies only: answer the top-level comment instead
        if (p.parent_comment_id) parentId = Number(p.parent_comment_id);
      }
      body.parent_comment_id = parentId;

      // 4. after-create notifications (reply / @mention)
      const originalJson = res.json.bind(res);
      res.json = (payload) => {
        const sent = originalJson(payload);
        try {
          if (res.statusCode === 201 && payload) {
            const created = payload.data || payload.comment || payload;
            const newId = toSafeInt(created?.id ?? created?.commentId ?? created?.commentid ?? created?.comment_id);
            if (newId) {
              setImmediate(() =>
                afterCommentCreated({
                  table,
                  commentId: newId,
                  authorId: req.authUser.id,
                  authorName: req.authUser.username,
                  parentId,
                  text,
                  postId,
                })
              );
            }
          }
        } catch (hookErr) {
          console.error("comment after-create hook failed:", hookErr.message);
        }
        return sent;
      };

      return next();
    } catch (err) {
      console.error("commentCreateGuard error:", err.message);
      return reject(res, 500, "Could not post your comment. Please try again");
    }
  };
};

/** Public "get comments" endpoints: read the viewer (for "liked by me") but allow guests. */
export { optionalUser } from "./auth.js";
