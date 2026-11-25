export const UPLOAD_LIMITS = {
  free: {
    badgeTier: "free",
    maxFileSizeBytes: 20 * 1024 * 1024,
    maxVideoDurationSec: 120,
    maxVideosPerDay: 3,
  },
  blue: {
    badgeTier: "blue",
    maxFileSizeBytes: 50 * 1024 * 1024,
    maxVideoDurationSec: 600,
    maxVideosPerDay: 6,
  },
  blue_premium: {
    badgeTier: "blue_premium",
    maxFileSizeBytes: 50 * 1024 * 1024,
    maxVideoDurationSec: 600,
    maxVideosPerDay: 10,
  },
  gold: {
    badgeTier: "gold",
    maxFileSizeBytes: 200 * 1024 * 1024,
    maxVideoDurationSec: 3600,
    maxVideosPerDay: 20,
  },
  gold_premium: {
    badgeTier: "gold_premium",
    maxFileSizeBytes: 200 * 1024 * 1024,
    maxVideoDurationSec: 3600,
    maxVideosPerDay: 50,
  },
};

export function getUploadLimits(userRow = {}) {
  const subscribed =
    userRow?.is_subscribed === true || userRow?.is_subscribed === "true";
  const badge = String(userRow?.badge || "").toLowerCase().trim();
  const subKey = String(userRow?.badge_subscription_key || "").toLowerCase().trim();

  if (!subscribed) {
    return { ...UPLOAD_LIMITS.free };
  }

  // 1. Gold Badges
  if (badge.includes("gold") || subKey.includes("gold")) {
    if (badge.includes("premium") || subKey.includes("premium")) {
      return { ...UPLOAD_LIMITS.gold_premium };
    }
    return { ...UPLOAD_LIMITS.gold };
  }

  // 2. Blue Badges
  if (badge.includes("blue") || subKey.includes("blue")) {
    if (badge.includes("premium") || subKey.includes("premium")) {
      return { ...UPLOAD_LIMITS.blue_premium };
    }
    return { ...UPLOAD_LIMITS.blue };
  }

  return { ...UPLOAD_LIMITS.free };
}

export function formatFileSizeLabel(bytes) {
  const mb = bytes / (1024 * 1024);
  return `${Math.round(mb)} MB`;
}

export function formatDurationLabel(seconds) {
  const min = seconds / 60;
  return Number.isInteger(min) ? `${min} min` : `${min.toFixed(1)} min`;
}

export function formatUploadTierLabel(badgeTier) {
  const tier = String(badgeTier || "free").toLowerCase();
  if (tier === "gold_premium") return "Gold Premium badge";
  if (tier === "gold") return "Basic Gold badge";
  if (tier === "blue_premium") return "Blue Premium badge";
  if (tier === "blue") return "Basic Blue badge";
  return "Free account";
}

export async function getTodayUploadedVideoCount(pool, userId) {
  if (!userId) return 0;
  const query = `
    SELECT (
      (SELECT COUNT(*) FROM xpi_videos WHERE user_id = $1 AND created_at >= CURRENT_DATE) +
      (SELECT COUNT(*) FROM cinematics_videos WHERE user_id = $1 AND created_at >= CURRENT_DATE) +
      (SELECT COUNT(*) FROM fan_star_videos WHERE user_id = $1 AND created_at >= CURRENT_DATE) +
      (SELECT COUNT(*) FROM kid_vids_videos WHERE user_id = $1 AND created_at >= CURRENT_DATE) +
      (SELECT COUNT(*) FROM learning_hobbies_videos WHERE user_id = $1 AND created_at >= CURRENT_DATE) +
      (SELECT COUNT(*) FROM tv_progmax_videos WHERE user_id = $1 AND created_at >= CURRENT_DATE)
    ) AS total_today;
  `;
  const res = await pool.query(query, [userId]);
  return Number(res.rows[0]?.total_today || 0);
}

export async function checkDailyVideoUploadLimit(pool, userId) {
  if (!userId) return { allowed: true, totalToday: 0 };
  const userRes = await pool.query(
    "SELECT is_subscribed, badge, badge_subscription_key FROM users WHERE id = $1 AND is_deleted = FALSE",
    [userId]
  );
  const limits = getUploadLimits(userRes.rows[0] || {});
  const totalToday = await getTodayUploadedVideoCount(pool, userId);
  const tierLabel = formatUploadTierLabel(limits.badgeTier);

  if (totalToday >= limits.maxVideosPerDay) {
    return {
      allowed: false,
      totalToday,
      maxVideosPerDay: limits.maxVideosPerDay,
      tierLabel,
      message: `Daily video upload limit reached: maximum ${limits.maxVideosPerDay} videos per day for ${tierLabel}. Upgrade to a Badge to unlock higher daily video uploads.`
    };
  }

  return {
    allowed: true,
    totalToday,
    maxVideosPerDay: limits.maxVideosPerDay,
    tierLabel,
  };
}
