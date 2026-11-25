import { COMMENT_PLACEHOLDER } from "./commentModules.js";

const isBlankId = (v) =>
  v == null ||
  String(v).trim() === "" ||
  String(v) === "0" ||
  String(v) === "null" ||
  String(v) === "undefined";

const rowId = (row) => row.commentId ?? row.commentid ?? row.id ?? row.comment_id;
const rowParentId = (row) => row.parentCommentId ?? row.parentcommentid ?? row.parent_comment_id;
const rowTime = (row) => {
  const t = row.commentCreatedAt || row.commentcreatedat || row.created_at || row.createdAt;
  const ms = t ? new Date(t).getTime() : NaN;
  return Number.isNaN(ms) ? 0 : ms;
};

/**
 * Turn a flat list of comment rows into a two-level tree (comment -> replies).
 *
 *  - hidden comments (moderation), comments of deleted users and deleted comments
 *    disappear together with their replies
 *  - replies to replies are attached to the top-level comment (1 tier)
 *  - replies are ordered oldest -> newest, roots keep the order of the input
 *  - runs in O(n) (the previous version was O(n^2) for long reply chains)
 */
const buildNestedCommentTree = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const byId = new Map();
  rows.forEach((row) => {
    const rawId = rowId(row);
    if (rawId != null) byId.set(String(rawId), row);
  });

  // 1. Work out which rows are hidden, including everything below a hidden row.
  const hiddenCache = new Map();
  const isHiddenRow = (row, guard = new Set()) => {
    const id = String(rowId(row));
    if (hiddenCache.has(id)) return hiddenCache.get(id);
    if (row.is_hidden || row.is_deleted || row.deleted_at || row.user_is_deleted) {
      hiddenCache.set(id, true);
      return true;
    }
    const parentId = rowParentId(row);
    let hidden = false;
    if (!isBlankId(parentId) && !guard.has(id)) {
      const parent = byId.get(String(parentId));
      if (parent && parent !== row) {
        guard.add(id);
        hidden = isHiddenRow(parent, guard);
      }
    }
    hiddenCache.set(id, hidden);
    return hidden;
  };

  const commentMap = new Map();
  const order = [];

  rows.forEach((row) => {
    const rawId = rowId(row);
    if (rawId == null) return;
    const idStr = String(rawId);
    if (commentMap.has(idStr)) return;
    if (isHiddenRow(row)) return;

    const isDeleted =
      Boolean(row.is_deleted) || Boolean(row.deleted_at) || Boolean(row.user_is_deleted);

    commentMap.set(idStr, {
      ...row,
      comment: isDeleted ? COMMENT_PLACEHOLDER : row.comment,
      is_edited: isDeleted ? false : Boolean(row.is_edited),
      edited_at: isDeleted ? null : row.edited_at || null,
      is_deleted: isDeleted,
      deleted_at: row.deleted_at || null,
      can_edit: !isDeleted,
      replies: [],
    });
    order.push(idStr);
  });

  // 2. Find the top-level ancestor of every comment (memoised).
  const rootOf = new Map();
  const findRoot = (idStr) => {
    if (rootOf.has(idStr)) return rootOf.get(idStr);
    const chain = [];
    let current = idStr;
    let root = null;
    const seen = new Set();
    while (current != null) {
      if (rootOf.has(current)) {
        root = rootOf.get(current);
        break;
      }
      if (seen.has(current)) {
        root = chain[chain.length - 1]; // cycle: stop at the last distinct node
        break;
      }
      seen.add(current);
      chain.push(current);
      const node = commentMap.get(current);
      const parentId = node ? rowParentId(node) : null;
      if (!node || isBlankId(parentId)) {
        root = current;
        break;
      }
      const parentStr = String(parentId);
      if (!commentMap.has(parentStr) || parentStr === current) {
        root = current; // parent not available -> treat as top level
        break;
      }
      current = parentStr;
    }
    chain.forEach((c) => rootOf.set(c, root));
    return root;
  };

  const roots = [];
  order.forEach((idStr) => {
    const comment = commentMap.get(idStr);
    const rootStr = findRoot(idStr);
    if (rootStr === idStr) {
      roots.push(comment);
    } else {
      commentMap.get(rootStr).replies.push(comment);
    }
  });

  roots.forEach((root) => root.replies.sort((a, b) => rowTime(a) - rowTime(b)));
  return roots;
};

/** Number of comments (roots + replies) a viewer can actually read. */
export const countLiveComments = (tree) => {
  let n = 0;
  const walk = (list) =>
    list.forEach((c) => {
      if (!c.is_deleted) n += 1;
      if (c.replies?.length) walk(c.replies);
    });
  walk(Array.isArray(tree) ? tree : []);
  return n;
};

export { buildNestedCommentTree };
