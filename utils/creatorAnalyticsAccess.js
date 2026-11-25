export const BLUE_DAYS = [7, 14, 30];
export const GOLD_DAYS = [7, 14, 30, 90, 365];

export function resolveCreatorBadgeTier(userRow = {}) {
  const subscribed =
    userRow.is_subscribed === true ||
    userRow.is_subscribed === "true" ||
    userRow.is_subscribed === 1;

  if (!subscribed) return "free";

  const key = String(userRow.badge_subscription_key || "").toLowerCase();
  const badge = String(userRow.badge || "").toLowerCase();

  // Gold Basic & Gold Premium -> Gold tier access
  if (key.includes("gold") || badge.includes("gold")) {
    return "gold";
  }

  // Blue Basic & Blue Premium -> Blue tier access
  if (key.includes("blue") || badge.includes("blue")) {
    return "blue";
  }

  return "free";
}

export function getAllowedDays(tier) {
  if (tier === "gold") return GOLD_DAYS;
  if (tier === "blue") return BLUE_DAYS;
  return [];
}

export function parseDaysQuery(raw, tier) {
  const days = Number.parseInt(String(raw ?? "30"), 10);
  const allowed = getAllowedDays(tier);
  if (!allowed.includes(days)) {
    return { ok: false, message: `Invalid days for ${tier} tier.` };
  }
  return { ok: true, days };
}
