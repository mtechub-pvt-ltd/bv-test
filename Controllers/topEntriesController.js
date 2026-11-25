import pool from "../db.config/index.js";
import { fetchCommentTree } from "../utils/commentService.js";
import {
  TOP_LIMIT,
  listTopModules,
  resolveTopModule,
  toPositiveInt,
} from "../utils/topModules.js";

/**
 * Generic Top List controller. One implementation serves every module in
 * utils/topModules.js. All table / column names come from that registry
 * (constants), never from the request; request values are always bound params.
 *
 * Rule: at most TOP_LIMIT top posts per module in total. It is enforced inside a
 * transaction guarded by a per-module advisory lock, so two admins clicking at
 * the same moment cannot exceed it.
 */

const ok = (res, body, status = 200) => res.status(status).json({ statusCode: status, ...body });
const fail = (res, status, message, extra = {}) =>
  res.status(status).json({ statusCode: status, message, ...extra });

const moduleOr404 = (req, res) => {
  const mod = resolveTopModule(req.params.module);
  if (!mod) {
    fail(res, 404, `Unknown module "${req.params.module}"`, {
      validModules: listTopModules().map((m) => m.key),
    });
    return null;
  }
  return mod;
};

/** Pieces shared by every query that returns a full post. `src` is the module table. */
const postJoins = (mod) =>
  [
    `LEFT JOIN users u ON u.id = src.${mod.userColumn}`,
    mod.categoryTable
      ? `LEFT JOIN ${mod.categoryTable} c ON c.id = src.${mod.categoryColumn}`
      : "",
    mod.subCategoryTable
      ? `LEFT JOIN ${mod.subCategoryTable} sc ON sc.id = src.${mod.subCategoryColumn}`
      : "",
  ]
    .filter(Boolean)
    .join("\n      ");

/**
 * SELECT list that returns the FULL post in ONE row, so clients never have to call a second API
 * with an id to get the details:
 *  - item:         every column of the post row, plus the module's extras (images, signature, receiver ...)
 *  - user:         the owner's public profile (never email / password; hidden fields stay hidden)
 *  - category / sub_category: the full category rows
 *  - stats:        likes / comments / views / shares / saves (/ offers) counts
 *  - viewer:       what the logged-in viewer did (liked, saved, owns, viewed). All false for guests
 *  - is_saved:     same as viewer.is_saved (kept for older clients)
 */
const postSelect = (mod, viewerParam) => {
  const v = `${viewerParam}::int`;
  const e = mod.engagement || {};
  const extras = Object.entries(mod.extras || {})
    .map(([name, expr]) => `'${name}', ${expr}`)
    .join(", ");
  const item = extras ? `to_jsonb(src.*) || jsonb_build_object(${extras})` : "to_jsonb(src.*)";

  const isSaved = mod.saveKey
    ? `EXISTS (SELECT 1 FROM save_item_general si
         WHERE si.module = '${mod.saveKey}' AND si.module_item_id = src.id::text AND si.user_id = ${v})`
    : "FALSE";
  const count = (t) => `(SELECT COUNT(*)::int FROM ${t.table} x WHERE x.${t.column} = src.id)`;
  const liveComments = e.comments
    ? `(SELECT COUNT(*)::int FROM ${e.comments.table} x WHERE x.${e.comments.column} = src.id
         AND COALESCE(x.is_deleted, FALSE) = FALSE AND COALESCE(x.is_hidden, FALSE) = FALSE)`
    : "0";
  const stats = [
    `'likes_count', ${e.likes ? count(e.likes) : "0"}`,
    `'comments_count', ${liveComments}`,
    `'views_count', ${e.views ? count(e.views) : "NULL"}`,
    `'shares_count', ${mod.hasShares === false ? "0" : `(SELECT COUNT(*)::int FROM ${mod.table} x WHERE x.shared_post_id = src.id)`}`,
    `'saves_count', ${mod.saveKey ? `(SELECT COUNT(*)::int FROM save_item_general x WHERE x.module = '${mod.saveKey}' AND x.module_item_id = src.id::text)` : "0"}`,
    ...(e.offers ? [`'offers_count', ${count(e.offers)}`] : []),
  ].join(", ");
  const viewer = [
    `'is_liked', ${e.likes ? `(${v} IS NOT NULL AND EXISTS (SELECT 1 FROM ${e.likes.table} x WHERE x.${e.likes.column} = src.id AND x.user_id = ${v}))` : "FALSE"}`,
    `'is_saved', ${isSaved}`,
    `'is_owner', (${v} IS NOT NULL AND src.${mod.userColumn} = ${v})`,
    `'has_viewed', ${e.views ? `(${v} IS NOT NULL AND EXISTS (SELECT 1 FROM ${e.views.table} x WHERE x.${e.views.column} = src.id AND x.user_id = ${v}))` : "FALSE"}`,
  ].join(", ");

  return `
      src.id AS item_id,
      ${item} AS item,
      ${USER_JSON} AS "user",
      ${mod.categoryTable ? "to_jsonb(c.*)" : "NULL::jsonb"} AS category,
      ${mod.subCategoryTable ? "to_jsonb(sc.*)" : "NULL::jsonb"} AS sub_category,
      jsonb_build_object(${stats}) AS stats,
      jsonb_build_object(${viewer}) AS viewer,
      ${isSaved} AS is_saved`;
};

/** The owner's public profile. Fields the user chose to hide (location / profession) come back null. */
const USER_JSON = `CASE WHEN u.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', u.id, 'username', u.username, 'image', u.image, 'badge', u.badge,
        'is_premium', u.is_premium, 'is_subscribed', u.is_subscribed, 'bio', u.bio,
        'profession', CASE WHEN COALESCE(u.hide_profession, FALSE) THEN NULL ELSE u.profession END,
        'city', CASE WHEN COALESCE(u.hide_location, FALSE) THEN NULL ELSE u.city END,
        'state', CASE WHEN COALESCE(u.hide_location, FALSE) THEN NULL ELSE u.state END,
        'province', CASE WHEN COALESCE(u.hide_location, FALSE) THEN NULL ELSE u.province END,
        'country', CASE WHEN COALESCE(u.hide_location, FALSE) THEN NULL ELSE u.country END,
        'region', CASE WHEN COALESCE(u.hide_location, FALSE) THEN NULL ELSE u.region END,
        'joined_at', u.created_at
      ) END`;

const shapeEntry = (mod, row) => ({
  top_entry_id: row.top_entry_id ?? null,
  module: mod.key,
  position: row.position ?? null,
  top_added_at: row.top_added_at ?? null,
  added_by: row.added_by ?? null,
  item_id: row.item_id,
  item: row.item,
  user: row.user,
  category: row.category,
  sub_category: row.sub_category,
  original_post: null,
  stats: row.stats,
  viewer: row.viewer,
  likes: null,
  comments: null,
  is_saved: row.is_saved,
});

const moduleInfo = (mod) => ({ key: mod.key, label: mod.label, limit: TOP_LIMIT });

/** Posts that were shared from another post: attach the source post (same shape, no nested lists). */
const attachOriginalPosts = async (db, mod, entries, viewerId) => {
  const ids = [...new Set(entries.map((e) => e.item?.shared_post_id).filter(Boolean))];
  if (!ids.length) return;
  const { rows } = await db.query(
    `SELECT ${postSelect(mod, "$2")}
       FROM ${mod.table} src
      ${postJoins(mod)}
      WHERE src.id = ANY($1::int[])`,
    [ids, viewerId]
  );
  const byId = new Map(rows.map((r) => [r.item_id, shapeEntry(mod, r)]));
  for (const e of entries) {
    const original = byId.get(e.item?.shared_post_id);
    e.original_post = original ? { ...original, module: undefined, top_entry_id: undefined, position: undefined, top_added_at: undefined, added_by: undefined } : null;
  }
};

/** Everything that is a list, per entry: who liked it and the full comment thread. */
const attachEngagementLists = async (db, mod, entries, viewerId, { commentsLimit, likersLimit }) => {
  const e = mod.engagement || {};
  await Promise.all(
    entries.map(async (entry) => {
      // comments: the same reader the normal comment endpoints use (hidden hidden, replies nested, like counts, "liked by me")
      if (e.comments) {
        const tree = await fetchCommentTree({
          table: e.comments.table,
          scopeColumn: e.comments.column,
          scopeId: entry.item_id,
          viewerId,
          page: 1,
          limit: commentsLimit,
          sort: "newest",
        });
        entry.comments = { total: tree.totalComments, root_total: tree.totalRoots, has_more: tree.hasMore, items: tree.comments };
        entry.stats.comments_count = tree.totalComments;
      } else {
        entry.comments = { total: 0, root_total: 0, has_more: false, items: [] };
      }

      // likes: total + the most recent likers
      if (e.likes && likersLimit > 0) {
        const { rows } = await db.query(
          `SELECT u.id, u.username, u.image, u.badge, u.is_premium, u.is_subscribed, l.created_at AS liked_at
             FROM ${e.likes.table} l JOIN users u ON u.id = l.user_id AND COALESCE(u.is_deleted, FALSE) = FALSE
            WHERE l.${e.likes.column} = $1
            ORDER BY l.created_at DESC, l.id DESC
            LIMIT $2`,
          [entry.item_id, likersLimit]
        );
        entry.likes = { total: entry.stats.likes_count, users: rows };
      } else {
        entry.likes = { total: entry.stats.likes_count, users: [] };
      }
    })
  );
};

/**
 * Current top posts of one module, ordered by position. Used by GET and after writes.
 * options.lite = true  -> counts + viewer state only (no comment thread, no likers, no original post)
 */
const fetchTopEntries = async (db, mod, viewerId, { lite = false, commentsLimit = 200, likersLimit = 50 } = {}) => {
  const { rows } = await db.query(
    `SELECT te.id AS top_entry_id, te.position, te.created_at AS top_added_at,
            te.created_by AS added_by,
            ${postSelect(mod, "$2")}
       FROM top_entries te
       JOIN ${mod.table} src ON src.id = te.item_id
      ${postJoins(mod)}
      WHERE te.module = $1
        AND (u.id IS NULL OR u.is_deleted = FALSE)
      ORDER BY te.position ASC`,
    [mod.key, viewerId]
  );
  const entries = rows.map((row) => shapeEntry(mod, row));
  if (!lite) {
    await Promise.all([
      attachEngagementLists(db, mod, entries, viewerId, { commentsLimit, likersLimit }),
      mod.hasShares === false ? null : attachOriginalPosts(db, mod, entries, viewerId),
    ]);
  }
  return entries;
};

/** Drop top entries whose post (or owner) no longer exists so they cannot hold a slot. */
const pruneDeadEntries = (client, mod) =>
  client.query(
    `DELETE FROM top_entries te
      WHERE te.module = $1
        AND NOT EXISTS (
          SELECT 1 FROM ${mod.table} src
          LEFT JOIN users u ON u.id = src.${mod.userColumn}
          WHERE src.id = te.item_id AND (u.id IS NULL OR u.is_deleted = FALSE)
        )`,
    [mod.key]
  );

/** GET /top/modules : every module with its live top count (admin tabs / dashboards). */
export const listModules = async (req, res) => {
  try {
    const mods = listTopModules();
    const sql = mods
      .map(
        (m, i) => `SELECT $${i + 1}::text AS module, COUNT(*)::int AS count
          FROM top_entries te
          JOIN ${m.table} src ON src.id = te.item_id
          LEFT JOIN users u ON u.id = src.${m.userColumn}
          WHERE te.module = $${i + 1} AND (u.id IS NULL OR u.is_deleted = FALSE)`
      )
      .join("\nUNION ALL\n");
    const { rows } = await pool.query(sql, mods.map((m) => m.key));
    const counts = Object.fromEntries(rows.map((r) => [r.module, r.count]));
    return ok(res, {
      limit: TOP_LIMIT,
      modules: mods.map((m) => ({
        ...moduleInfo(m),
        count: counts[m.key] ?? 0,
        full: (counts[m.key] ?? 0) >= TOP_LIMIT,
      })),
    });
  } catch (error) {
    console.error("listModules error:", error);
    return fail(res, 500, "Internal server error");
  }
};

/** GET /top/entries/:module : the module's current top posts (public, full response). */
export const getTopEntries = async (req, res) => {
  const mod = moduleOr404(req, res);
  if (!mod) return;
  try {
    const lite = ["1", "true", "yes"].includes(String(req.query.lite ?? "").toLowerCase());
    const commentsLimit = Math.min(toPositiveInt(req.query.comments_limit) ?? 200, 500);
    const likersLimit = req.query.likers_limit === "0" ? 0 : Math.min(toPositiveInt(req.query.likers_limit) ?? 50, 200);
    const entries = await fetchTopEntries(pool, mod, req.authUser?.id ?? null, { lite, commentsLimit, likersLimit });
    return ok(res, { module: moduleInfo(mod), total: entries.length, entries });
  } catch (error) {
    console.error("getTopEntries error:", error);
    return fail(res, 500, "Internal server error");
  }
};

/**
 * GET /top/entries/:module/candidates : admin picker. Every eligible post of the module
 * (top ones first) with `is_top` / `top_position`. Query: search, page, limit.
 */
export const listCandidates = async (req, res) => {
  const mod = moduleOr404(req, res);
  if (!mod) return;
  try {
    const page = toPositiveInt(req.query.page) ?? 1;
    const limit = Math.min(toPositiveInt(req.query.limit) ?? 20, 100);
    const search = String(req.query.search ?? "").trim();
    const searchParam = search ? `%${search.replace(/[%_\\]/g, "\\$&")}%` : null;

    // `p` is the placeholder number of the search term in the query it is used in.
    const whereFor = (p) => `
        WHERE (u.id IS NULL OR u.is_deleted = FALSE)
          ${mod.eligibleSql ? `AND ${mod.eligibleSql}` : ""}
          AND ($${p}::text IS NULL OR (${mod.titleColumns
            .map((col) => `src.${col}::text ILIKE $${p}`)
            .join(" OR ")}))`;

    const [data, count] = await Promise.all([
      pool.query(
        `SELECT te.id AS top_entry_id, te.position, te.created_at AS top_added_at,
                te.created_by AS added_by, (te.id IS NOT NULL) AS is_top,
                ${postSelect(mod, "$5")}
           FROM ${mod.table} src
           LEFT JOIN top_entries te ON te.module = $1 AND te.item_id = src.id
          ${postJoins(mod)}
          ${whereFor(2)}
          ORDER BY (te.id IS NULL), te.position ASC, src.created_at DESC, src.id DESC
          LIMIT $3 OFFSET $4`,
        [mod.key, searchParam, limit, (page - 1) * limit, req.authUser?.id ?? null]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total
           FROM ${mod.table} src
          ${postJoins(mod)}
          ${whereFor(1)}`,
        [searchParam]
      ),
    ]);

    const total = count.rows[0].total;
    return ok(res, {
      module: moduleInfo(mod),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      posts: data.rows.map((row) => {
        // the picker shows counts only; the lists (likers, comment thread, original post) belong to GET /entries/:module
        const { likes, comments, original_post, ...light } = shapeEntry(mod, row);
        return { ...light, is_top: row.is_top, top_position: row.position ?? null };
      }),
    });
  } catch (error) {
    console.error("listCandidates error:", error);
    return fail(res, 500, "Internal server error");
  }
};

/** POST /top/entries/:module  body { item_id } : add a post to the module's top list (admin). */
export const addTopEntry = async (req, res) => {
  const mod = moduleOr404(req, res);
  if (!mod) return;
  const itemId = toPositiveInt(req.body?.item_id);
  if (!itemId) return fail(res, 400, "item_id is required and must be a positive integer");

  const client = await pool.connect();
  let outcome;
  try {
    await client.query("BEGIN");
    // One writer per module at a time: makes count-then-insert race free.
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`top_entries:${mod.key}`]);
    await pruneDeadEntries(client, mod);

    const post = await client.query(
      `SELECT ${mod.eligibleSql ? `(${mod.eligibleSql})` : "TRUE"} AS eligible
         FROM ${mod.table} src
         LEFT JOIN users u ON u.id = src.${mod.userColumn}
        WHERE src.id = $1 AND (u.id IS NULL OR u.is_deleted = FALSE)`,
      [itemId]
    );
    if (post.rowCount === 0) {
      outcome = { status: 404, message: `${mod.label} post not found` };
    } else if (!post.rows[0].eligible) {
      outcome = { status: 400, message: `This ${mod.label} post is not eligible to be a top post` };
    } else {
      const current = await client.query(
        "SELECT item_id, position FROM top_entries WHERE module = $1",
        [mod.key]
      );
      const taken = new Set(current.rows.map((r) => r.position));
      if (current.rows.some((r) => r.item_id === itemId)) {
        outcome = { status: 409, code: "ALREADY_TOP", message: "This post is already a top post" };
      } else if (current.rowCount >= TOP_LIMIT) {
        outcome = {
          status: 409,
          code: "TOP_LIMIT_REACHED",
          message: `${mod.label} already has ${TOP_LIMIT} top posts. Remove one before adding another.`,
        };
      } else {
        let position = 1;
        while (taken.has(position)) position += 1;
        await client.query(
          `INSERT INTO top_entries (module, item_id, position, created_by)
           VALUES ($1, $2, $3, $4)`,
          [mod.key, itemId, position, req.authUser?.id ?? null]
        );
        outcome = { status: 201 };
      }
    }
    await client.query(outcome.status === 201 ? "COMMIT" : "ROLLBACK");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("addTopEntry error:", error);
    return fail(res, 500, "Internal server error");
  } finally {
    client.release();
  }

  try {
    const entries = await fetchTopEntries(pool, mod, req.authUser?.id ?? null);
    if (outcome.status !== 201) {
      return fail(res, outcome.status, outcome.message, {
        code: outcome.code,
        module: moduleInfo(mod),
        total: entries.length,
        entries,
      });
    }
    return ok(
      res,
      {
        message: "Added to top list",
        module: moduleInfo(mod),
        total: entries.length,
        entry: entries.find((e) => e.item_id === itemId) ?? null,
        entries,
      },
      201
    );
  } catch (error) {
    console.error("addTopEntry response error:", error);
    return fail(res, 500, "Internal server error");
  }
};

/** DELETE /top/entries/:module/:itemId : remove one post from the top list (admin). */
export const removeTopEntry = async (req, res) => {
  const mod = moduleOr404(req, res);
  if (!mod) return;
  const itemId = toPositiveInt(req.params.itemId);
  if (!itemId) return fail(res, 400, "itemId must be a positive integer");

  const client = await pool.connect();
  let removed;
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`top_entries:${mod.key}`]);
    removed = await client.query(
      "DELETE FROM top_entries WHERE module = $1 AND item_id = $2 RETURNING id, position",
      [mod.key, itemId]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("removeTopEntry error:", error);
    return fail(res, 500, "Internal server error");
  } finally {
    client.release();
  }

  if (removed.rowCount === 0) return fail(res, 404, "This post is not in the top list");
  try {
    const entries = await fetchTopEntries(pool, mod, req.authUser?.id ?? null);
    return ok(res, {
      message: "Removed from top list",
      module: moduleInfo(mod),
      removed: { top_entry_id: removed.rows[0].id, item_id: itemId, position: removed.rows[0].position },
      total: entries.length,
      entries,
    });
  } catch (error) {
    console.error("removeTopEntry response error:", error);
    return fail(res, 500, "Internal server error");
  }
};
