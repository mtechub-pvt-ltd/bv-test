import pool from "../db.config/index.js";

const buildILikeClause = (columns, patterns, startIndex = 1) => {
  const parts = [];
  const params = [];
  let idx = startIndex;
  for (const col of columns) {
    for (const p of patterns) {
      parts.push(`${col} ILIKE $${idx}`);
      params.push(p);
      idx++;
    }
  }
  return { clause: parts.length ? `(${parts.join(" OR ")})` : "(1=0)", params, nextIndex: idx };
};

export const globalSearch = async (req, res) => {
  try {
    const q = (req.query.q || req.query.name || "").trim();
    const words = q.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      return res.status(200).json({ statusCode: 200, totalResults: 0, results: {} });
    }

    const patterns = words.map((w) => `%${w}%`);

    const parentCategoryTables = [
      "app_category", "item_category", "disc_category", "video_category", "pic_category", "NEWS_category",
      "cinematics_category", "fan_star_category", "tv_progmax_category", "kid_vids_category", "learning_hobbies_category",
      "sports_category", "QAFI_category", "GEBC_category",
    ];

    const subCategoryTables = [
      "app_sub_category", "item_sub_category", "disc_sub_category", "video_sub_category", "pic_sub_category", "NEWS_sub_category",
      "cinematics_sub_category", "fan_star_sub_category", "tv_progmax_sub_category", "kid_vids_sub_category", "learning_hobbies_sub_category",
      "sport_sub_category", "QAFI_sub_category", "GEBC_sub_category",
    ];

    const allCategoryQueries = [];

    const parentForSub = (subTable) => {
      if (subTable === "sport_sub_category") return "sports_category";
      return subTable.replace(/_sub_category$/i, "_category");
    };

    const subForParent = (parentTable) => {
      if (parentTable === "sports_category") return "sport_sub_category";
      return parentTable.replace(/_category$/i, "_sub_category");
    };

    for (const t of parentCategoryTables) {
      const c = buildILikeClause(["name"], patterns, 1);
      const subTable = subForParent(t);
      const qstr = `SELECT c.id, c.name, (SELECT COUNT(*) FROM ${subTable} st WHERE st.category_id = c.id)::int AS sub_count FROM ${t} c WHERE ${c.clause} ORDER BY c.name ASC LIMIT 10`;
      allCategoryQueries.push({ table: t, q: qstr, p: c.params });
    }

    for (const t of subCategoryTables) {
      const c = buildILikeClause(["name"], patterns, 1);
      const parentTable = parentForSub(t);
      const qstr = `SELECT s.id, s.name, s.category_id, (SELECT p.name FROM ${parentTable} p WHERE p.id = s.category_id) AS category_name FROM ${t} s WHERE ${c.clause} ORDER BY s.name ASC LIMIT 10`;
      allCategoryQueries.push({ table: t, q: qstr, p: c.params });
    }

    const contentQueries = [];

    const addContentQuery = (key, qstr, cols, extraWhere = "TRUE") => {
      const c = buildILikeClause(cols, patterns, 1);
      contentQueries.push({ key, q: `${qstr} WHERE ${c.clause} AND (${extraWhere}) ORDER BY 1 ASC LIMIT 10`, p: c.params });
    };

    addContentQuery(
      "users",
      "SELECT id, username AS name, email FROM users",
      ["username", "email"],
      "is_deleted = FALSE"
    );

    addContentQuery(
      "deleted_users",
      "SELECT id, username AS name, email FROM users",
      ["username", "email"],
      "is_deleted = TRUE"
    );

    addContentQuery(
      "subscribed_users",
      "SELECT id, username AS name, email FROM users",
      ["username", "email"],
      "is_deleted = FALSE AND is_subscribed = TRUE"
    );

    addContentQuery(
      "blogs",
      "SELECT id, title AS name FROM blogs",
      ["title"]
    );

    {
      const c = buildILikeClause(["banner.banner_link", "users.username"], patterns, 1);
      contentQueries.push({
        key: "banner",
        q: `SELECT banner.id, COALESCE(users.username, banner.banner_link) AS name, banner.banner_link FROM banner LEFT JOIN users ON banner.user_id = users.id WHERE ${c.clause} AND users.is_deleted = FALSE ORDER BY banner.created_at DESC LIMIT 10`,
        p: c.params,
      });
    }

    addContentQuery(
      "contact_us",
      "SELECT id, full_name AS name, email_address AS email FROM contact_us",
      ["full_name", "email_address", "message"]
    );

    addContentQuery(
      "mass_app",
      "SELECT id, name FROM mass_app",
      ["name"]
    );

    {
      const c = buildILikeClause(["item.title", "item.description", "users.username"], patterns, 1);
      contentQueries.push({
        key: "item",
        q: `SELECT item.id, item.title AS name FROM item LEFT JOIN users ON item.user_id = users.id WHERE ${c.clause} ORDER BY item.created_at DESC LIMIT 10`,
        p: c.params,
      });
    }

    {
      const c = buildILikeClause(["xpi_videos.name", "xpi_videos.description", "users.username"], patterns, 1);
      contentQueries.push({
        key: "xpi_videos",
        q: `SELECT xpi_videos.id, xpi_videos.name FROM xpi_videos LEFT JOIN users ON xpi_videos.user_id = users.id WHERE ${c.clause} ORDER BY xpi_videos.created_at DESC LIMIT 10`,
        p: c.params,
      });
    }

    {
      const c = buildILikeClause(["pic_tours.name", "pic_tours.description", "users.username"], patterns, 1);
      contentQueries.push({
        key: "pic_tours",
        q: `SELECT pic_tours.id, pic_tours.name FROM pic_tours LEFT JOIN users ON pic_tours.user_id = users.id WHERE ${c.clause} ORDER BY pic_tours.created_at DESC LIMIT 10`,
        p: c.params,
      });
    }

    addContentQuery(
      "post_letters",
      "SELECT id, name, email, subject_place FROM post_letters",
      ["name", "email", "subject_place"]
    );

    {
      const c = buildILikeClause(["r.reason", "ru.username", "uu.username"], patterns, 1);
      contentQueries.push({
        key: "reported_user",
        q: `SELECT r.id, COALESCE(uu.username, ru.username, r.reason) AS name, r.reason FROM reported_user r LEFT JOIN users ru ON r.reporter_id = ru.id LEFT JOIN users uu ON r.reported_user_id = uu.id WHERE ${c.clause} ORDER BY r.created_at DESC LIMIT 10`,
        p: c.params,
      });
    }

    const execs = [
      ...allCategoryQueries.map((item) => pool.query(item.q, item.p)),
      ...contentQueries.map((item) => pool.query(item.q, item.p)),
    ];
    const resultsArr = await Promise.all(execs);

    const results = {};
    let idx = 0;
    for (const item of allCategoryQueries) {
      results[item.table] = resultsArr[idx].rows;
      idx++;
    }
    for (const item of contentQueries) {
      results[item.key] = resultsArr[idx].rows;
      idx++;
    }

    const totalResults = Object.values(results).reduce((s, a) => s + a.length, 0);

    return res.status(200).json({ statusCode: 200, totalResults, results });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export default { globalSearch };
