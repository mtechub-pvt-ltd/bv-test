import pool from "../db.config/index.js";
import { notifyUser } from "./notificationService.js";
import { buildNestedCommentTree, countLiveComments } from "./commentUtils.js";
import { COMMENT_MODULES, toSafeInt } from "./commentModules.js";

const metaFor = (table) => {
  const meta = COMMENT_MODULES[table];
  if (!meta) throw new Error(`Unknown comment table '${table}'`);
  return meta;
};

/* ------------------------------------------------------------------ */
/* Reading comments                                                    */
/* ------------------------------------------------------------------ */

/**
 * ONE way to read the comments of a post, used by every module so that all
 * of them behave the same:
 *  - hidden (moderated) comments and their replies are never returned
 *  - deleted comments / deleted users become a "This comment was deleted" placeholder
 *  - replies always stay under the comment they answer (paging is done on top-level comments)
 *  - like count and "liked by me" are included
 */
export const fetchCommentTree = async ({
  table,
  scopeColumn,
  scopeId,
  viewerId = null,
  page = 1,
  limit = 500,
  sort = "newest",
}) => {
  const meta = metaFor(table);
  const column = scopeColumn || meta.postColumn;
  if (column !== meta.postColumn) {
    throw new Error(`Invalid scope column '${column}' for ${table}`);
  }

  const safePage = Math.max(1, toSafeInt(page) || 1);
  const safeLimit = Math.min(1000, Math.max(1, toSafeInt(limit) || 500));
  const extraCols = `c.${meta.postColumn}`;

  const buildSql = (withLikes) => `
    SELECT
      c.id, c.id AS "commentId", c.id AS comment_id,
      c.parent_comment_id, c.parent_comment_id AS "parentCommentId",
      c.comment, c.is_edited, c.edited_at, c.is_deleted, c.deleted_at, c.is_hidden,
      c.created_at, c.created_at AS "commentCreatedAt", c.created_at AS commentcreatedat, c.updated_at,
      c.user_id, c.user_id AS "userId",
      u.username, u.image AS "userImage", u.image AS user_image, u.image AS userimage,
      u.is_premium AS premium, u.is_subscribed, u.badge,
      COALESCE(u.is_deleted, FALSE) AS user_is_deleted,
      ${extraCols}
      ${
        withLikes
          ? `, (SELECT COUNT(*) FROM public.comment_likes cl WHERE cl.comment_table = $2 AND cl.comment_id = c.id) AS like_count,
              ($3::int IS NOT NULL AND EXISTS (SELECT 1 FROM public.comment_likes cl WHERE cl.comment_table = $2 AND cl.comment_id = c.id AND cl.user_id = $3::int)) AS is_liked`
          : ""
      }
    FROM public.${table} c
    LEFT JOIN public.users u ON u.id = c.user_id
    WHERE c.${column} = $1
    ORDER BY c.created_at DESC, c.id DESC
    LIMIT 5000
  `;

  let rows;
  try {
    ({ rows } = await pool.query(buildSql(true), [scopeId, table, viewerId]));
  } catch (err) {
    // 42P01 = comment_likes table not created yet: still serve the comments.
    if (err?.code !== "42P01") throw err;
    ({ rows } = await pool.query(buildSql(false), [scopeId]));
  }

  const prepared = rows.map((r) => ({
    ...r,
    module: meta.key,
    like_count: Number(r.like_count || 0),
    is_liked: Boolean(r.is_liked),
    username: r.user_is_deleted ? "Deleted user" : r.username,
    userImage: r.user_is_deleted ? null : r.userImage,
    user_image: r.user_is_deleted ? null : r.user_image,
    userimage: r.user_is_deleted ? null : r.userimage,
  }));

  let roots = buildNestedCommentTree(prepared); // newest first
  if (String(sort).toLowerCase() === "oldest") roots = roots.slice().reverse();

  const totalComments = countLiveComments(roots);
  const totalRoots = roots.length;
  const start = (safePage - 1) * safeLimit;
  const pageRoots = roots.slice(start, start + safeLimit);

  return {
    comments: pageRoots,
    totalComments,
    totalRoots,
    totalPages: Math.max(1, Math.ceil(totalRoots / safeLimit)),
    currentPage: safePage,
    hasMore: start + safeLimit < totalRoots,
  };
};

/** Express helper: standard response body for every module's "get comments" endpoint. */
export const commentTreeResponse = (result) => ({
  statusCode: 200,
  totalComments: result.totalComments,
  totalRoots: result.totalRoots,
  totalPages: result.totalPages,
  currentPage: result.currentPage,
  hasMore: result.hasMore,
  comments: result.comments,
  AllComments: result.comments,
  AllComents: result.comments, // legacy spelling still read by some clients
});

/* ------------------------------------------------------------------ */
/* Deleting comments                                                   */
/* ------------------------------------------------------------------ */

/**
 * Delete a comment together with every reply under it (same as YouTube).
 * Likes on the removed comments are removed as well.
 */
export const removeComment = async (table, commentId) => {
  metaFor(table);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const found = await client.query(`SELECT id FROM public.${table} WHERE id = $1 FOR UPDATE`, [commentId]);
    if (found.rowCount === 0) {
      await client.query("ROLLBACK");
      return { status: "not_found" };
    }

    // the comment + all replies (also follows older, deeper reply chains)
    const tree = await client.query(
      `WITH RECURSIVE tree AS (
         SELECT id FROM public.${table} WHERE id = $1
         UNION ALL
         SELECT c.id FROM public.${table} c JOIN tree t ON c.parent_comment_id = t.id
       ) SELECT id FROM tree`,
      [commentId]
    );
    const deletedIds = tree.rows.map((r) => Number(r.id));

    await client.query(`DELETE FROM public.${table} WHERE id = ANY($1::int[])`, [deletedIds]);
    try {
      await client.query("DELETE FROM public.comment_likes WHERE comment_table = $1 AND comment_id = ANY($2::int[])", [table, deletedIds]);
    } catch (likeErr) {
      if (likeErr?.code !== "42P01") throw likeErr;
    }

    await client.query("COMMIT");
    return { status: "ok", soft: false, deletedIds };
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw err;
  } finally {
    client.release();
  }
};

/* ------------------------------------------------------------------ */
/* Notifications for replies and mentions                              */
/* ------------------------------------------------------------------ */

const MENTION_RE = /(^|[\s(])@([A-Za-z0-9_.-]{2,40})/g;

export const extractMentions = (text) => {
  const names = new Set();
  let m;
  const re = new RegExp(MENTION_RE.source, "g");
  while ((m = re.exec(String(text || ""))) !== null) {
    names.add(m[2].replace(/[.-]+$/, "").toLowerCase());
  }
  return [...names].filter(Boolean).slice(0, 10);
};

/**
 * Called after a comment has been created (any module).
 * Tells the author of the parent comment about a reply and tells
 * @mentioned users. The post owner is notified by each module controller.
 * Never throws: notifications must not break posting a comment.
 */
export const afterCommentCreated = async ({
  table,
  commentId,
  authorId,
  authorName,
  parentId = null,
  text = "",
  postId = null,
}) => {
  try {
    const meta = metaFor(table);
    const moduletype = meta.notifyType;
    const already = new Set([Number(authorId)]);
    const name = authorName || "Someone";

    if (parentId) {
      const parent = await pool.query(`SELECT user_id FROM public.${table} WHERE id = $1`, [parentId]);
      const parentAuthor = parent.rows[0]?.user_id;
      if (parentAuthor && !already.has(Number(parentAuthor))) {
        already.add(Number(parentAuthor));
        await notifyUser({
          sender_id: authorId,
          receiver_id: parentAuthor,
          title: "New reply!",
          body: `${name} replied to your comment`,
          moduletype,
          item_id: postId != null ? String(postId) : "",
          action: "reply",
          reference_table: table,
          reference_id: commentId,
        });
      }
    }

    const mentioned = extractMentions(text);
    if (mentioned.length > 0) {
      const users = await pool.query(
        "SELECT id, username FROM public.users WHERE LOWER(username) = ANY($1::text[]) AND is_deleted = FALSE LIMIT 10",
        [mentioned]
      );
      for (const u of users.rows) {
        if (already.has(Number(u.id))) continue;
        already.add(Number(u.id));
        await notifyUser({
          sender_id: authorId,
          receiver_id: u.id,
          title: "You were mentioned!",
          body: `${name} mentioned you in a comment`,
          moduletype,
          item_id: postId != null ? String(postId) : "",
          action: "mention",
          reference_table: table,
          reference_id: commentId,
        });
      }
    }
  } catch (err) {
    console.error("afterCommentCreated failed:", err.message);
  }
};

/* ------------------------------------------------------------------ */
/* Admin helpers                                                       */
/* ------------------------------------------------------------------ */

export const getAdminUserIds = async () => {
  const { rows } = await pool.query(
    "SELECT id FROM public.users WHERE LOWER(role) = 'admin' AND is_deleted = FALSE"
  );
  return rows.map((r) => r.id);
};
