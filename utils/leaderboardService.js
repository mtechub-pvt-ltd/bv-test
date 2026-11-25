import { CREATOR_ANALYTICS_MODULES } from "./creatorAnalyticsRegistry.js";
import { getOrSetCache, clearCache } from "./cacheService.js";

export function resolveBadgeTier(userRow = {}) {
  const subscribed =
    userRow?.is_subscribed === true || userRow?.is_subscribed === "true";
  const badge = String(userRow?.badge || "").toLowerCase();
  if (subscribed && badge === "gold") return "gold";
  if (subscribed && badge === "blue") return "blue";
  return "free";
}

export function assignRanks(rows = []) {
  return rows.map((row, index) => ({
    ...row,
    rank: index + 1,
    badge_tier: resolveBadgeTier(row),
  }));
}

/**
 * Build UNION ALL fragments that score each creator by:
 * likes on their posts + comments on their posts + shares of their posts + views + followers.
 */
export function buildEngagementScoreSql(modules = CREATOR_ANALYTICS_MODULES) {
  const parts = [];

  for (const mod of modules) {
    parts.push(`
      SELECT c.user_id,
        COUNT(l.id)::bigint AS likes,
        0::bigint AS comments,
        0::bigint AS shares,
        0::bigint AS views,
        0::bigint AS followers
      FROM ${mod.contentTable} c
      LEFT JOIN ${mod.likeTable} l ON l.${mod.likeFk} = c.id
      WHERE c.user_id IS NOT NULL
      GROUP BY c.user_id
    `);

    parts.push(`
      SELECT c.user_id,
        0::bigint AS likes,
        COUNT(cm.id)::bigint AS comments,
        0::bigint AS shares,
        0::bigint AS views,
        0::bigint AS followers
      FROM ${mod.contentTable} c
      LEFT JOIN ${mod.commentTable} cm ON cm.${mod.commentFk} = c.id
      WHERE c.user_id IS NOT NULL
      GROUP BY c.user_id
    `);

    // A share is a content row whose shared_post_id points at an original post.
    parts.push(`
      SELECT orig.user_id,
        0::bigint AS likes,
        0::bigint AS comments,
        COUNT(share.id)::bigint AS shares,
        0::bigint AS views,
        0::bigint AS followers
      FROM ${mod.contentTable} share
      INNER JOIN ${mod.contentTable} orig ON share.shared_post_id = orig.id
      WHERE orig.user_id IS NOT NULL
        AND share.shared_post_id IS NOT NULL
      GROUP BY orig.user_id
    `);

    if (mod.viewTable) {
      parts.push(`
        SELECT c.user_id,
          0::bigint AS likes,
          0::bigint AS comments,
          0::bigint AS shares,
          COUNT(v.id)::bigint AS views,
          0::bigint AS followers
        FROM ${mod.contentTable} c
        LEFT JOIN ${mod.viewTable} v ON v.${mod.viewFk} = c.id
        WHERE c.user_id IS NOT NULL
        GROUP BY c.user_id
      `);
    }
  }

  // Add followers fragment
  parts.push(`
    SELECT f.following_id AS user_id,
      0::bigint AS likes,
      0::bigint AS comments,
      0::bigint AS shares,
      0::bigint AS views,
      COUNT(f.id)::bigint AS followers
    FROM follow f
    WHERE f.following_id IS NOT NULL
    GROUP BY f.following_id
  `);

  return parts.join("\nUNION ALL\n");
}

export async function refreshLeaderboardMaterializedView(pool) {
  try {
    await pool.query("REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_creator_engagement");
    clearCache("leaderboard_top_10");
  } catch (error) {
    try {
      await pool.query("REFRESH MATERIALIZED VIEW public.mv_creator_engagement");
      clearCache("leaderboard_top_10");
    } catch (e) {
      console.error("Failed to refresh mv_creator_engagement:", e.message);
    }
  }
}

export function initLeaderboardRefreshScheduler(pool, intervalMinutes = 15) {
  refreshLeaderboardMaterializedView(pool);

  const intervalMs = intervalMinutes * 60 * 1000;
  setInterval(() => {
    refreshLeaderboardMaterializedView(pool);
  }, intervalMs);
}

export async function fetchTopLeaderboard(pool, limit = 10) {
  const cacheKey = `leaderboard_top_${limit}`;

  return getOrSetCache(cacheKey, 900, async () => {
    try {
      const { rows } = await pool.query(
        `
        SELECT
          u.id,
          u.username,
          u.image,
          u.is_subscribed,
          u.badge,
          COALESCE(mv.post_likes, 0) AS post_likes,
          COALESCE(mv.post_comments, 0) AS post_comments,
          COALESCE(mv.post_shares, 0) AS post_shares,
          COALESCE(mv.post_views, 0) AS post_views,
          COALESCE(mv.followers, 0) AS followers,
          COALESCE(mv.engagement_score, 0) AS engagement_score
        FROM users u
        LEFT JOIN public.mv_creator_engagement mv ON mv.user_id = u.id
        WHERE u.is_deleted = FALSE
          AND (u.block IS NULL OR u.block = FALSE)
        ORDER BY engagement_score DESC, u.id ASC
        LIMIT $1
        `,
        [limit]
      );

      return assignRanks(rows);
    } catch (err) {
      const engagementUnion = buildEngagementScoreSql();

      const { rows } = await pool.query(
        `
        WITH module_scores AS (
          ${engagementUnion}
        ),
        totals AS (
          SELECT
            user_id,
            COALESCE(SUM(likes), 0)::int AS post_likes,
            COALESCE(SUM(comments), 0)::int AS post_comments,
            COALESCE(SUM(shares), 0)::int AS post_shares,
            COALESCE(SUM(views), 0)::int AS post_views,
            COALESCE(SUM(followers), 0)::int AS followers,
            (COALESCE(SUM(likes), 0) + COALESCE(SUM(comments), 0) + COALESCE(SUM(shares), 0) + COALESCE(SUM(views), 0) + COALESCE(SUM(followers), 0))::int
              AS engagement_score
          FROM module_scores
          GROUP BY user_id
        )
        SELECT
          u.id,
          u.username,
          u.image,
          u.is_subscribed,
          u.badge,
          COALESCE(t.post_likes, 0) AS post_likes,
          COALESCE(t.post_comments, 0) AS post_comments,
          COALESCE(t.post_shares, 0) AS post_shares,
          COALESCE(t.post_views, 0) AS post_views,
          COALESCE(t.followers, 0) AS followers,
          COALESCE(t.engagement_score, 0) AS engagement_score
        FROM users u
        LEFT JOIN totals t ON t.user_id = u.id
        WHERE u.is_deleted = FALSE
          AND (u.block IS NULL OR u.block = FALSE)
        ORDER BY engagement_score DESC, u.id ASC
        LIMIT $1
        `,
        [limit]
      );

      return assignRanks(rows);
    }
  });
}

