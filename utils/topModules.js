/**
 * Single source of truth for the Top List feature.
 *
 * Every module that can have "top" posts is described ONCE here. The generic
 * controller (Controllers/topEntriesController.js) builds all of its SQL from
 * these entries, so adding a module = adding one object. No new routes, no new
 * controller, no new table.
 *
 * Rule: a module can hold at most TOP_LIMIT top posts in total (not per category).
 *
 * SECURITY: table / column names below are interpolated into SQL. They must stay
 * hard-coded constants in this file and never come from a request.
 *
 * NOTE: keep this file free of database imports so it can be unit tested.
 *
 * Fields
 *  - key:        canonical module key (what clients send in the URL)
 *  - aliases:    other spellings accepted in the URL
 *  - label:      human readable name for admin screens
 *  - table:      table that holds the real posts (top entries point to these rows)
 *  - categoryTable / categoryColumn:       optional category join
 *  - subCategoryTable / subCategoryColumn: optional sub-category join
 *  - userColumn: column holding the post owner (joined to users)
 *  - eligibleSql: optional SQL predicate (alias `src`) a post must satisfy to be top-able
 *  - titleColumns: columns tried in order for the admin search box / label
 *  - extras:     optional { name: SQL expression (alias `src`) } merged into each returned `item`
 *  - engagement: where comments / likes / views / offers live (see ENGAGEMENT above)
 *  - hasShares:  false for modules whose table has no shared_post_id (default true)
 *  - saveKey:    module string used by save_item_general (adds `is_saved` for a viewer)
 */
export const TOP_LIMIT = 3;

/**
 * Where each module keeps its engagement data (all constants, used in SQL):
 *   comments: { table, column }  table must be a key of COMMENT_MODULES (utils/commentModules.js)
 *   likes:    { table, column }
 *   views:    { table, column }  only some modules track views, others leave it out (stats.views_count = null)
 *   offers:   { table, column }  Mondo Market offers
 * A module without an entry (Mass Apps) has no comments / likes.
 */
const ENGAGEMENT = {
  video_mania: { comments: { table: "video_comment", column: "video_id" }, likes: { table: "like_video", column: "video_id" }, views: { table: "viewed_video", column: "video_id" } },
  pic_tours: { comments: { table: "pic_comment", column: "pic_tours_id" }, likes: { table: "like_pic", column: "pic_tours_id" }, views: { table: "viewed_pic", column: "pic_tours_id" } },
  open_letters: { comments: { table: "comment_post_letter", column: "letter_id" }, likes: { table: "like_post_letter", column: "letter_id" } },
  mondo_market: { comments: { table: "mondon_market_comment", column: "item_id" }, likes: { table: "mondon_market_like", column: "item_id" }, offers: { table: "send_offer", column: "item_id" } },
  on_news: { comments: { table: "news_comment", column: "news_id" }, likes: { table: "like_news", column: "news_id" } },
  qafi: { comments: { table: "qafi_comment", column: "qafi_id" }, likes: { table: "like_qafi", column: "qafi_id" } },
  gebc: { comments: { table: "gebc_comment", column: "gebc_id" }, likes: { table: "like_gebc", column: "gebc_id" } },
  sports: { comments: { table: "sport_comment", column: "sport_id" }, likes: { table: "sport_like", column: "sport_id" } },
  cinematics: { comments: { table: "cinematics_video_comment", column: "video_id" }, likes: { table: "cinematics_video_like", column: "video_id" }, views: { table: "cinematics_video_viewed", column: "video_id" } },
  fan_star: { comments: { table: "fan_star_video_comment", column: "video_id" }, likes: { table: "fan_star_video_like", column: "video_id" }, views: { table: "fan_star_video_viewed", column: "video_id" } },
  tv_progmax: { comments: { table: "tv_progmax_video_comment", column: "video_id" }, likes: { table: "tv_progmax_video_like", column: "video_id" }, views: { table: "tv_progmax_video_viewed", column: "video_id" } },
  kid_vids: { comments: { table: "kid_vids_video_comment", column: "video_id" }, likes: { table: "kid_vids_video_like", column: "video_id" }, views: { table: "kid_vids_video_viewed", column: "video_id" } },
  learning_hobbies: { comments: { table: "learning_hobbies_video_comment", column: "video_id" }, likes: { table: "learning_hobbies_video_like", column: "video_id" }, views: { table: "learning_hobbies_video_viewed", column: "video_id" } },
  mass_apps: null,
};

export const TOP_MODULES = Object.freeze({
  video_mania: {
    key: "video_mania",
    aliases: ["xpi", "videomania", "video-mania", "video"],
    label: "Video Mania",
    table: "xpi_videos",
    categoryTable: "video_category",
    categoryColumn: "video_category",
    subCategoryTable: "video_sub_category",
    subCategoryColumn: "sub_category",
    userColumn: "user_id",
    engagement: ENGAGEMENT.video_mania,
    titleColumns: ["name", "description"],
    saveKey: "xpi",
  },
  pic_tours: {
    key: "pic_tours",
    aliases: ["pictour", "pictours", "pic-tours", "pic_tour"],
    label: "Pic Tours",
    table: "pic_tours",
    categoryTable: "pic_category",
    categoryColumn: "pic_category",
    subCategoryTable: "pic_sub_category",
    subCategoryColumn: "sub_category",
    userColumn: "user_id",
    engagement: ENGAGEMENT.pic_tours,
    titleColumns: ["name", "description"],
    saveKey: "picTour",
  },
  open_letters: {
    key: "open_letters",
    aliases: ["openletters", "open-letters", "letters", "postletter", "post_letters"],
    label: "Open Letters",
    table: "post_letters",
    categoryTable: "disc_category",
    categoryColumn: "disc_category",
    subCategoryTable: "disc_sub_category",
    subCategoryColumn: "disc_sub_category",
    userColumn: "user_id",
    engagement: ENGAGEMENT.open_letters,
    titleColumns: ["name", "subject_place", "body"],
    extras: {
      images: `(SELECT COALESCE(jsonb_agg(pli.image), '[]'::jsonb)
          FROM post_letters_images pli WHERE pli.letter_id = src.id)`,
      signature: `(SELECT jsonb_build_object('id', sg.id, 'image', sg.image) FROM signature sg WHERE sg.id = src.signature_id)`,
      receiver: `(SELECT jsonb_build_object('id', ru.id, 'username', ru.username, 'image', ru.image, 'address', lri.address)
          FROM letter_reciever_info lri JOIN users ru ON ru.id = lri.reciever_id WHERE lri.letter_id = src.id LIMIT 1)`,
    },
    saveKey: "openLetters",
  },
  mondo_market: {
    key: "mondo_market",
    aliases: ["mondomarket", "mondo-market", "item", "items", "mondon_market", "marketzone"],
    label: "Mondo Market",
    table: "item",
    categoryTable: "item_category",
    categoryColumn: "item_category",
    subCategoryTable: "item_sub_category",
    subCategoryColumn: "sub_category",
    userColumn: "user_id",
    engagement: ENGAGEMENT.mondo_market,
    // only paid listings are shown in the market, so only those can be top
    eligibleSql: "src.paid_status = TRUE",
    titleColumns: ["title", "description"],
    extras: {
      images: `(SELECT COALESCE(jsonb_agg(jsonb_build_object('id', ii.id, 'image', ii.image)), '[]'::jsonb)
          FROM item_images ii WHERE ii.item_id = src.id)`,
    },
    saveKey: "item",
  },
  on_news: {
    key: "on_news",
    aliases: ["news", "onnews", "on-news"],
    label: "On News",
    table: "news",
    categoryTable: "news_category",
    categoryColumn: "category",
    subCategoryTable: "news_sub_category",
    subCategoryColumn: "sub_category",
    userColumn: "user_id",
    engagement: ENGAGEMENT.on_news,
    titleColumns: ["description"],
    saveKey: "news",
  },
  qafi: {
    key: "qafi",
    aliases: [],
    label: "QAFI",
    table: "qafi",
    categoryTable: "qafi_category",
    categoryColumn: "category",
    subCategoryTable: "qafi_sub_category",
    subCategoryColumn: "sub_category",
    userColumn: "user_id",
    engagement: ENGAGEMENT.qafi,
    titleColumns: ["description"],
    saveKey: "qafi",
  },
  gebc: {
    key: "gebc",
    aliases: ["ebic"],
    label: "EBIC",
    table: "gebc",
    categoryTable: "gebc_category",
    categoryColumn: "category",
    subCategoryTable: "gebc_sub_category",
    subCategoryColumn: "sub_category",
    userColumn: "user_id",
    engagement: ENGAGEMENT.gebc,
    titleColumns: ["description"],
    saveKey: "gebc",
  },
  sports: {
    key: "sports",
    aliases: ["sport"],
    label: "Sports",
    table: "sports",
    categoryTable: "sports_category",
    categoryColumn: "category_id",
    subCategoryTable: "sport_sub_category",
    subCategoryColumn: "sub_category_id",
    userColumn: "user_id",
    engagement: ENGAGEMENT.sports,
    titleColumns: ["name", "description"],
    saveKey: "sports",
  },
  cinematics: {
    key: "cinematics",
    aliases: [],
    label: "Cinematics",
    table: "cinematics_videos",
    categoryTable: "cinematics_category",
    categoryColumn: "category_id",
    subCategoryTable: "cinematics_sub_category",
    subCategoryColumn: "sub_category_id",
    userColumn: "user_id",
    engagement: ENGAGEMENT.cinematics,
    titleColumns: ["name", "description"],
    saveKey: "cinematics",
  },
  fan_star: {
    key: "fan_star",
    aliases: ["fanstar", "fan-star"],
    label: "Fan Star",
    table: "fan_star_videos",
    categoryTable: "fan_star_category",
    categoryColumn: "category_id",
    subCategoryTable: "fan_star_sub_category",
    subCategoryColumn: "sub_category_id",
    userColumn: "user_id",
    engagement: ENGAGEMENT.fan_star,
    titleColumns: ["name", "description"],
    saveKey: "fanStar",
  },
  tv_progmax: {
    key: "tv_progmax",
    aliases: ["tvprogmax", "tv-progmax"],
    label: "TV ProgMax",
    table: "tv_progmax_videos",
    categoryTable: "tv_progmax_category",
    categoryColumn: "category_id",
    subCategoryTable: "tv_progmax_sub_category",
    subCategoryColumn: "sub_category_id",
    userColumn: "user_id",
    engagement: ENGAGEMENT.tv_progmax,
    titleColumns: ["name", "description"],
    saveKey: "tvProgmax",
  },
  kid_vids: {
    key: "kid_vids",
    aliases: ["kidvids", "kid-vids"],
    label: "Kid Vids",
    table: "kid_vids_videos",
    categoryTable: "kid_vids_category",
    categoryColumn: "category_id",
    subCategoryTable: "kid_vids_sub_category",
    subCategoryColumn: "sub_category_id",
    userColumn: "user_id",
    engagement: ENGAGEMENT.kid_vids,
    titleColumns: ["name", "description"],
    saveKey: "kidVids",
  },
  learning_hobbies: {
    key: "learning_hobbies",
    aliases: ["learninghobbies", "learning-hobbies"],
    label: "Learning & Hobbies",
    table: "learning_hobbies_videos",
    categoryTable: "learning_hobbies_category",
    categoryColumn: "category_id",
    subCategoryTable: "learning_hobbies_sub_category",
    subCategoryColumn: "sub_category_id",
    userColumn: "user_id",
    engagement: ENGAGEMENT.learning_hobbies,
    titleColumns: ["name", "description"],
    saveKey: "learningHobbies",
  },
  mass_apps: {
    key: "mass_apps",
    aliases: ["massapp", "massapps", "mass-apps", "mass_app"],
    label: "Mass Apps",
    table: "mass_app",
    categoryTable: "app_category",
    categoryColumn: "app_category_id",
    userColumn: "user_id",
    engagement: ENGAGEMENT.mass_apps,
    hasShares: false,
    titleColumns: ["name"],
  },
});

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

/** "Video-Mania" / "video mania" / "videoMania" -> "videomania" */
const squash = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const ALIAS_MAP = (() => {
  const map = {};
  for (const mod of Object.values(TOP_MODULES)) {
    map[squash(mod.key)] = mod.key;
    for (const alias of mod.aliases) map[squash(alias)] = mod.key;
  }
  return Object.freeze(map);
})();

/** Resolve any accepted spelling to a registry entry, or null. */
export const resolveTopModule = (name) => {
  const squashed = squash(name);
  if (!squashed || !hasOwn(ALIAS_MAP, squashed)) return null;
  return TOP_MODULES[ALIAS_MAP[squashed]];
};

export const listTopModules = () => Object.values(TOP_MODULES);

/** True when a value is a positive integer that fits a Postgres INT. */
export const toPositiveInt = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string" && !/^\d+$/.test(value.trim())) return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0 || n > 2147483647) return null;
  return n;
};
