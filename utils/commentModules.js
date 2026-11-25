/**
 * Single source of truth for the comment feature.
 *
 * Every module (Pic Tours, News, Fan Star ...) stores comments in its own table.
 * This registry describes those tables once, so that the comment controller,
 * the report/moderation controller, the shared comment fetcher and the
 * admin tools all agree on names, columns and notification types.
 *
 * NOTE: this file must stay free of database imports so it can be unit tested.
 */

/**
 * Canonical module definitions, keyed by comment table.
 *  - key:        canonical module key (also what the frontend should send)
 *  - label:      human readable name (admin screens, notifications)
 *  - postColumn: column of the comment table that points to the post
 *  - bodyKeys:   request body keys the add-comment endpoints use for the post id
 *  - notifyType: moduletype string understood by the notification dropdown
 *  - postTable / ownerColumn: used to find the post owner (for notifications)
 */
export const COMMENT_MODULES = {
  video_comment: {
    key: "xpi",
    label: "Video Mania",
    postColumn: "video_id",
    bodyKeys: ["video_id"],
    notifyType: "xpi",
    postTable: "xpi_videos",
  },
  pic_comment: {
    key: "picTour",
    label: "Pic Tours",
    postColumn: "pic_tours_id",
    bodyKeys: ["pic_tours_id"],
    notifyType: "picTour",
    postTable: "pic_tours",
  },
  news_comment: {
    key: "news",
    label: "On News",
    postColumn: "news_id",
    bodyKeys: ["NEWS_id", "news_id"],
    notifyType: "news",
    postTable: "news",
  },
  gebc_comment: {
    key: "gebc",
    label: "EBIC",
    postColumn: "gebc_id",
    bodyKeys: ["GEBC_id", "gebc_id"],
    notifyType: "GEBC",
    postTable: "gebc",
  },
  qafi_comment: {
    key: "qafi",
    label: "QAFI",
    postColumn: "qafi_id",
    bodyKeys: ["QAFI_id", "qafi_id"],
    notifyType: "QAFI",
    postTable: "qafi",
  },
  sport_comment: {
    key: "sports",
    label: "Sports & Sports",
    postColumn: "sport_id",
    bodyKeys: ["sport_id"],
    notifyType: "sports",
    postTable: "sports",
  },
  mondon_market_comment: {
    key: "mondonMarket",
    label: "Mondo Market",
    postColumn: "item_id",
    bodyKeys: ["item_id", "mondon_market_id"],
    notifyType: "mondonMarket",
    postTable: "item",
  },
  comment_post_letter: {
    key: "letter",
    label: "Open Letters",
    postColumn: "letter_id",
    bodyKeys: ["letter_id"],
    notifyType: "post_letters",
    postTable: "post_letters",
  },
  cinematics_video_comment: {
    key: "cinematics",
    label: "Cinematic",
    postColumn: "video_id",
    bodyKeys: ["video_id"],
    notifyType: "cinematics",
    postTable: "cinematics_videos",
  },
  fan_star_video_comment: {
    key: "fanStar",
    label: "Fan Star Zone",
    postColumn: "video_id",
    bodyKeys: ["video_id"],
    notifyType: "fanStar",
    postTable: "fan_star_videos",
  },
  kid_vids_video_comment: {
    key: "kidVids",
    label: "Kid Vids",
    postColumn: "video_id",
    bodyKeys: ["video_id"],
    notifyType: "kidVids",
    postTable: "kid_vids_videos",
  },
  learning_hobbies_video_comment: {
    key: "learningHobbies",
    label: "Learning & Hobbies",
    postColumn: "video_id",
    bodyKeys: ["video_id"],
    notifyType: "learningHobbies",
    postTable: "learning_hobbies_videos",
  },
  tv_progmax_video_comment: {
    key: "tvProgmax",
    label: "TV ProgMax",
    postColumn: "video_id",
    bodyKeys: ["video_id"],
    notifyType: "tvProgmax",
    postTable: "tv_progmax_videos",
  },
};

export const COMMENT_TABLES = Object.keys(COMMENT_MODULES);

/**
 * Every spelling the apps are known to send, normalised
 * (lower-case, only [a-z0-9_]) and mapped to a comment table.
 */
const aliases = (table, names) => names.reduce((acc, n) => ({ ...acc, [n]: table }), {});

export const MODULE_TABLE_MAP = Object.freeze({
  // Video Mania
  ...aliases("video_comment", [
    "video", "videos", "xpi", "top", "topvideo", "top_video",
    "xpi_video", "xpi_videos", "videomania", "video_mania", "videomanias",
  ]),
  // Pic Tours
  ...aliases("pic_comment", [
    "pictour", "pictours", "pic_tour", "pic_tours", "toptour", "toptours", "top_tour", "top_tours",
  ]),
  // Open Letters
  ...aliases("comment_post_letter", [
    "letter", "letters", "postletter", "postletters", "post_letter", "post_letters",
    "openletter", "openletters", "open_letter", "open_letters", "topletter", "top_letter", "top_letters", "topletters",
  ]),
  // Mondo Market
  ...aliases("mondon_market_comment", [
    "mondonmarket", "mondon_market", "mondomarket", "mondo_market", "item", "items", "toppost", "top_post",
  ]),
  // QAFI
  ...aliases("qafi_comment", ["qafi", "topqafi", "top_qafi"]),
  // EBIC / GEBC
  ...aliases("gebc_comment", ["gebc", "ebic", "topgebc", "top_gebc", "topebic", "top_ebic"]),
  // News
  ...aliases("news_comment", ["news", "onnews", "on_news", "topnews", "top_news"]),
  // Cinematic
  ...aliases("cinematics_video_comment", [
    "cinematics", "cinematic", "cinematics_video", "cinematics_videos",
  ]),
  // Fan Star
  ...aliases("fan_star_video_comment", [
    "fanstar", "fan_star", "fanstarzone", "fan_star_zone", "fan_star_video", "fan_star_videos",
  ]),
  // Kid Vids
  ...aliases("kid_vids_video_comment", [
    "kidvids", "kid_vids", "kidvid", "kid_vids_video", "kid_vids_videos",
  ]),
  // Learning & Hobbies
  ...aliases("learning_hobbies_video_comment", [
    "learninghobbies", "learning_hobbies", "learningandhobbies", "learning_and_hobbies",
    "learning_hobbies_video", "learning_hobbies_videos",
  ]),
  // TV ProgMax
  ...aliases("tv_progmax_video_comment", [
    "tvprogmax", "tv_progmax", "tv_progmax_video", "tv_progmax_videos",
  ]),
  // Sports
  ...aliases("sport_comment", [
    "sports", "sport", "sportssports", "sports_sports", "sports_and_sports", "sportsandsports", "top_sports", "topsports",
  ]),
});

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

/** Normalise a module string the way every client may send it. */
export const normalizeModuleName = (moduleName) =>
  String(moduleName ?? "")
    .trim()
    .toLowerCase()
    // "sports-&-sports" / "fan-star-zone": keep the words, drop the punctuation
    .replace(/&/g, "")
    .replace(/[^a-z0-9_]/g, "");

/**
 * Resolve a module name (any known alias) or an exact comment table name to a
 * comment table. Always returns a string from COMMENT_TABLES, or null.
 */
export const getCommentTableName = (moduleName) => {
  if (!moduleName) return null;
  const normalized = normalizeModuleName(moduleName);
  if (!normalized) return null;
  if (hasOwn(MODULE_TABLE_MAP, normalized)) return MODULE_TABLE_MAP[normalized];
  if (hasOwn(COMMENT_MODULES, normalized)) return normalized; // already a table name
  return null;
};

export const getModuleMeta = (tableOrModule) => {
  const table = hasOwn(COMMENT_MODULES, tableOrModule)
    ? tableOrModule
    : getCommentTableName(tableOrModule);
  return table ? { table, ...COMMENT_MODULES[table] } : null;
};

/** True when a value is a positive integer that fits a Postgres INT. */
export const toSafeInt = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string" && !/^\d+$/.test(value.trim())) return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0 || n > 2147483647) return null;
  return n;
};

export const COMMENT_PLACEHOLDER = "This comment was deleted";
