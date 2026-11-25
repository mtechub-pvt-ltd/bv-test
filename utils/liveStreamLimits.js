export const AUDIENCE_TOKEN_TTL_SEC = 14400;

export const LIVE_STREAM_LIMITS = {
  free: { badgeTier: "free", quality: "480p", maxDurationSec: 3600, expiresIn: 3600 },
  blue: { badgeTier: "blue", quality: "720p", maxDurationSec: 9000, expiresIn: 9000 },
  gold: { badgeTier: "gold", quality: "1080p", maxDurationSec: 14400, expiresIn: 14400 },
};

export function getLiveStreamLimits(userRow = {}) {
  const subscribed = userRow?.is_subscribed === true || userRow?.is_subscribed === "true";
  const badge = String(userRow?.badge || "").toLowerCase();

  if (subscribed && (badge === "gold" || badge.includes("gold"))) return { ...LIVE_STREAM_LIMITS.gold };
  if (subscribed && (badge === "blue" || badge.includes("blue"))) return { ...LIVE_STREAM_LIMITS.blue };
  return { ...LIVE_STREAM_LIMITS.free };
}
