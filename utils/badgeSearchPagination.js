/** 50% Gold · 30% Blue · 20% Normal — repeating slot pattern per 10 results. */
const BADGE_SLOT_PATTERN = [
  "gold",
  "gold",
  "gold",
  "gold",
  "gold",
  "blue",
  "blue",
  "blue",
  "normal",
  "normal",
];

const TIER_PRIORITY = ["gold", "blue", "normal"];

const DEFAULT_DATE_FIELDS = [
  "created_at",
  "news_created_at",
  "video_created_at",
  "tour_created_at",
  "post_date",
];

export function getBadgeTierFromRow(row) {
  if (!row) return "normal";
  const key = String(row.badge_subscription_key || row.subscription_key || "").toLowerCase();
  const badge = String(row.badge || row.user_badge || "").toLowerCase();
  const subscribed =
    row.is_subscribed === true ||
    row.is_subscribed === "true" ||
    row.is_subscribed === "t" ||
    row.is_subscribed === 1;

  if (badge.includes("gold") || key.includes("gold")) return "gold";
  if (badge.includes("blue") || key.includes("blue") || subscribed) return "blue";

  return "normal";
}

function resolveRowDate(row, dateFields = DEFAULT_DATE_FIELDS) {
  for (const field of dateFields) {
    const value = row?.[field];
    if (value != null && value !== "") {
      const time = new Date(value).getTime();
      if (!Number.isNaN(time)) return time;
    }
  }
  return 0;
}

function sortRowsByDateDesc(rows, dateFields = DEFAULT_DATE_FIELDS) {
  return [...rows].sort(
    (a, b) => resolveRowDate(b, dateFields) - resolveRowDate(a, dateFields)
  );
}

/**
 * Order all search and record sets strictly by Badge Tier:
 * 1st: ALL Gold Badge items (newest first)
 * 2nd: ALL Blue Badge items (newest first)
 * 3rd: ALL Free / Normal User items (newest first)
 */
export function interleaveBadgeSearchResults(rows, { dateFields } = {}) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const fields = dateFields || DEFAULT_DATE_FIELDS;
  const buckets = { gold: [], blue: [], normal: [] };

  for (const row of sortRowsByDateDesc(rows, fields)) {
    buckets[getBadgeTierFromRow(row)].push(row);
  }

  return [...buckets.gold, ...buckets.blue, ...buckets.normal];
}

/** Paginate an interleaved badge search result set. */
export function paginateBadgeSearchResults(rows, page = 1, limit = 10, options = {}) {
  const interleaved = interleaveBadgeSearchResults(rows, options);
  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const pageLimit = Math.max(1, parseInt(limit, 10) || 10);
  const offset = (currentPage - 1) * pageLimit;

  return {
    rows: interleaved.slice(offset, offset + pageLimit),
    total: interleaved.length,
    totalPages: Math.ceil(interleaved.length / pageLimit) || 0,
    currentPage,
    limit: pageLimit,
  };
}

/** Full list or paginated slice with badge mix applied. */
export function applyBadgeSearchOrdering(rows, { page, limit } = {}, options = {}) {
  if (page != null && limit != null) {
    return paginateBadgeSearchResults(rows, page, limit, options);
  }
  const ordered = interleaveBadgeSearchResults(rows, options);
  return {
    rows: ordered,
    total: ordered.length,
  };
}
