/** Placement tier per module (home scroll + module pages). */
export const BANNER_TIERS = ["premium", "middle", "lower"];

export const MODULE_BANNER_TIER = {
  video_category: "premium",
  pic_category: "middle",
  news_category: "middle",
  sports_category: "middle",
  disc_category: "middle",
  tv_progmax_category: "middle",
  qafi_category: "middle",
  learning_hobbies_category: "middle",
  kid_vids_category: "lower",
  fan_star_category: "lower",
  cinematics_category: "lower",
  gebc_category: "lower",
  item_category: "lower",
  mass_app: "lower",
};

/** USD per 3-second exposure (client-approved base rates). */
export const TIER_RATE_USD_PER_3SEC = {
  premium: 0.05,
  middle: 0.025,
  lower: 0.01,
};

export function getTierForModule(moduleKey) {
  return MODULE_BANNER_TIER[moduleKey] || "middle";
}

export function isTierAllowedForModule(moduleKey, tier) {
  if (!tier || !BANNER_TIERS.includes(tier)) return false;
  return getTierForModule(moduleKey) === tier;
}

export function topBannerFlagForTier(tier) {
  return tier === "premium";
}

/** Legacy rows without banner_tier column value. */
export function resolveStoredTier(row) {
  if (row?.banner_tier && BANNER_TIERS.includes(row.banner_tier)) {
    return row.banner_tier;
  }
  if (row?.top_banner === true) return "premium";
  return getTierForModule(row?.category_table);
}
