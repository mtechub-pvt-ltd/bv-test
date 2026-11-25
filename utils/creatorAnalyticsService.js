import pool from "../db.config/index.js";
import {
  CREATOR_ANALYTICS_MODULES,
  getModuleByKey,
  getModulesForQuery,
} from "./creatorAnalyticsRegistry.js";

export function buildDateRange(days) {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const toIsoDate = (d) => d.toISOString().slice(0, 10);
  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
  };
}

export function zeroFillSeries(days, rows) {
  const map = new Map(rows.map((r) => [r.date, r]));
  const { startDate, endDate } = buildDateRange(days);
  const out = [];
  const cur = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  while (cur <= end) {
    const date = cur.toISOString().slice(0, 10);
    const row = map.get(date) || { date, views: 0, likes: 0, comments: 0, shares: 0 };
    out.push({
      date,
      views: Number(row.views) || 0,
      likes: Number(row.likes) || 0,
      comments: Number(row.comments) || 0,
      shares: Number(row.shares) || 0,
    });
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

function dateWindowClause(alias, startIdx) {
  return `${alias}.created_at >= $${startIdx}::date AND ${alias}.created_at < ($${
    startIdx + 1
  }::date + interval '1 day')`;
}

function buildLikeFragment(mod, userIdIdx, startIdx, postId = null) {
  const postFilter = postId != null ? ` AND e.${mod.likeFk} = $${startIdx + 2}` : "";
  const paramsNote = postId != null ? startIdx + 2 : null;
  return {
    sql: `
      SELECT date_trunc('day', e.created_at)::date AS day,
        0 AS views, 1 AS likes, 0 AS comments, 0 AS shares
      FROM ${mod.likeTable} e
      INNER JOIN ${mod.contentTable} c ON c.id = e.${mod.likeFk}
      WHERE c.user_id = $${userIdIdx}
        AND ${dateWindowClause("e", startIdx)}
        ${postFilter}
    `,
    extraParam: paramsNote,
  };
}

function buildCommentFragment(mod, userIdIdx, startIdx, postId = null) {
  const postFilter = postId != null ? ` AND e.${mod.commentFk} = $${startIdx + 2}` : "";
  return {
    sql: `
      SELECT date_trunc('day', e.created_at)::date AS day,
        0 AS views, 0 AS likes, 1 AS comments, 0 AS shares
      FROM ${mod.commentTable} e
      INNER JOIN ${mod.contentTable} c ON c.id = e.${mod.commentFk}
      WHERE c.user_id = $${userIdIdx}
        AND ${dateWindowClause("e", startIdx)}
        ${postFilter}
    `,
  };
}

function buildShareFragment(mod, userIdIdx, startIdx, postId = null) {
  const postFilter = postId != null ? ` AND share.shared_post_id = $${startIdx + 2}` : "";
  return {
    sql: `
      SELECT date_trunc('day', share.created_at)::date AS day,
        0 AS views, 0 AS likes, 0 AS comments, 1 AS shares
      FROM ${mod.contentTable} share
      INNER JOIN ${mod.contentTable} orig ON share.shared_post_id = orig.id
      WHERE orig.user_id = $${userIdIdx}
        AND ${dateWindowClause("share", startIdx)}
        ${postFilter}
    `,
  };
}

function buildViewFragment(mod, userIdIdx, startIdx, postId = null) {
  if (!mod.viewTable) return null;
  const postFilter = postId != null ? ` AND e.${mod.viewFk} = $${startIdx + 2}` : "";
  return {
    sql: `
      SELECT date_trunc('day', e.created_at)::date AS day,
        1 AS views, 0 AS likes, 0 AS comments, 0 AS shares
      FROM ${mod.viewTable} e
      INNER JOIN ${mod.contentTable} c ON c.id = e.${mod.viewFk}
      WHERE c.user_id = $${userIdIdx}
        AND ${dateWindowClause("e", startIdx)}
        ${postFilter}
    `,
  };
}

function buildEventUnion(modules, userIdIdx, startIdx, postId = null) {
  const parts = [];
  for (const mod of modules) {
    parts.push(buildLikeFragment(mod, userIdIdx, startIdx, postId).sql);
    parts.push(buildCommentFragment(mod, userIdIdx, startIdx, postId).sql);
    parts.push(buildShareFragment(mod, userIdIdx, startIdx, postId).sql);
    const viewFrag = buildViewFragment(mod, userIdIdx, startIdx, postId);
    if (viewFrag) parts.push(viewFrag.sql);
  }
  return parts.join("\nUNION ALL\n");
}

function buildSummaryParams(userId, startDate, endDate, postId = null) {
  const params = [userId, startDate, endDate];
  if (postId != null) params.push(postId);
  return params;
}

async function queryDailySeries(userId, days, { moduleKey = "all", postId = null } = {}) {
  const modules =
    postId != null && moduleKey !== "all"
      ? getModulesForQuery(moduleKey)
      : getModulesForQuery(moduleKey);
  if (postId != null && modules.length !== 1) {
    return [];
  }
  const { startDate, endDate } = buildDateRange(days);
  const unionSql = buildEventUnion(modules, 1, 2, postId);
  const query = `
    SELECT day::text AS date,
      COALESCE(SUM(views), 0)::int AS views,
      COALESCE(SUM(likes), 0)::int AS likes,
      COALESCE(SUM(comments), 0)::int AS comments,
      COALESCE(SUM(shares), 0)::int AS shares
    FROM (${unionSql}) events
    GROUP BY day
    ORDER BY day
  `;
  const params = buildSummaryParams(userId, startDate, endDate, postId);
  const { rows } = await pool.query(query, params);
  return rows;
}

function sumTotals(series) {
  return series.reduce(
    (acc, row) => ({
      views: acc.views + (Number(row.views) || 0),
      likes: acc.likes + (Number(row.likes) || 0),
      comments: acc.comments + (Number(row.comments) || 0),
      shares: acc.shares + (Number(row.shares) || 0),
    }),
    { views: 0, likes: 0, comments: 0, shares: 0 }
  );
}

export async function fetchCreatorSummarySeries(userId, days) {
  const rows = await queryDailySeries(userId, days, { moduleKey: "all" });
  const series = zeroFillSeries(days, rows);
  return { totals: sumTotals(series), series };
}

export async function fetchCreatorTopPosts(userId, days, { module = "all", limit = 20, offset = 0 } = {}) {
  const modules = getModulesForQuery(module);
  const { startDate, endDate } = buildDateRange(days);
  const unions = [];

  for (const mod of modules) {
    const viewSub = mod.viewTable
      ? `(SELECT COUNT(*)::int FROM ${mod.viewTable} vv
          WHERE vv.${mod.viewFk} = c.id
          AND vv.created_at >= $2::date
          AND vv.created_at < ($3::date + interval '1 day'))`
      : "0";

    unions.push(`
      SELECT
        '${mod.key}' AS module,
        '${mod.routeSlug}' AS route_slug,
        c.id AS post_id,
        COALESCE(${mod.titleExpr}, '') AS title,
        COALESCE(${mod.imageExpr}, '') AS image,
        c.created_at AS published_at,
        ${viewSub} AS views,
        (SELECT COUNT(*)::int FROM ${mod.likeTable} lv
          WHERE lv.${mod.likeFk} = c.id
          AND lv.created_at >= $2::date
          AND lv.created_at < ($3::date + interval '1 day')) AS likes,
        (SELECT COUNT(*)::int FROM ${mod.commentTable} cm
          WHERE cm.${mod.commentFk} = c.id
          AND cm.created_at >= $2::date
          AND cm.created_at < ($3::date + interval '1 day')) AS comments,
        (SELECT COUNT(*)::int FROM ${mod.contentTable} sh
          WHERE sh.shared_post_id = c.id
          AND sh.created_at >= $2::date
          AND sh.created_at < ($3::date + interval '1 day')) AS shares
      FROM ${mod.contentTable} c
      WHERE c.user_id = $1
    `);
  }

  const query = `
    SELECT module, route_slug, post_id, title, image, published_at, views, likes, comments, shares,
      (views + likes + comments + shares) AS engagements
    FROM (${unions.join("\nUNION ALL\n")}) posts
    ORDER BY engagements DESC, published_at DESC
    LIMIT $4 OFFSET $5
  `;

  const { rows } = await pool.query(query, [userId, startDate, endDate, limit, offset]);
  return rows.map((r) => ({
    module: r.module,
    routeSlug: r.route_slug,
    postId: Number(r.post_id),
    title: r.title || "",
    image: r.image || "",
    publishedAt: r.published_at,
    views: Number(r.views) || 0,
    likes: Number(r.likes) || 0,
    comments: Number(r.comments) || 0,
    shares: Number(r.shares) || 0,
    engagements: Number(r.engagements) || 0,
  }));
}

export async function fetchCreatorPostDetail(userId, moduleKey, postId, days) {
  const mod = getModuleByKey(moduleKey);
  if (!mod) return null;

  const ownerCheck = await pool.query(
    `SELECT c.id,
            ${mod.titleExpr} AS title,
            COALESCE(${mod.imageExpr}, '') AS image,
            c.created_at AS published_at
     FROM ${mod.contentTable} c
     WHERE c.id = $1 AND c.user_id = $2`,
    [postId, userId]
  );
  if (ownerCheck.rowCount === 0) return null;

  const post = ownerCheck.rows[0];
  const rows = await queryDailySeries(userId, days, { moduleKey, postId: Number(postId) });
  const series = zeroFillSeries(days, rows);
  const totals = sumTotals(series);

  return {
    module: moduleKey,
    routeSlug: mod.routeSlug,
    postId: Number(postId),
    title: post.title || "",
    image: post.image || "",
    publishedAt: post.published_at,
    totals,
    series,
  };
}

export { CREATOR_ANALYTICS_MODULES };
