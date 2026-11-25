import pool from "../db.config/index.js";
import { mapItemRow } from "../utils/mapItemRow.js";

const normalizeModuleName = (module) => {
  if (!module) return module;
  const m = module.toLowerCase().trim();

  // Cinematics
  if (m === "cinematic" || m === "cinematics" || m === "cinematics_videos") return "cinematics";

  // XPI
  if (m === "xpi" || m === "xpi_videos" || m === "xpivideos" || m === "xpi videos" || m === "video_mania" || m === "xpi_video") return "xpi";

  // News
  if (m === "news" || m === "on_news" || m === "news articles" || m === "news article") return "news";

  // Qafi
  if (m === "qafi" || m === "qafi module") return "qafi";

  // Pic Tour
  if (m === "pictour" || m === "pic_tours" || m === "pictourimages" || m === "picture tours" || m === "pic_tour") return "picTour";

  // Items / Mondo Market
  if (m === "item" || m === "items" || m === "mondo market") return "item";

  // Sports
  if (m === "sports" || m === "sport") return "sports";

  // TV Progmax
  if (m === "tvprogmax" || m === "tv_progmax_videos" || m === "tv") return "tvProgmax";

  // Gebc
  if (m === "gebc") return "gebc";

  // Learning & Hobbies
  if (m === "learninghobbies" || m === "learning_hobbies" || m === "learning_hobbies_videos" || m === "learning") return "learningHobbies";

  // Kid Vids
  if (m === "kidvids" || m === "kids" || m === "kid_vids_videos" || m === "kid") return "kidVids";

  // Fan Star
  if (m === "fanstar" || m === "fan_star" || m === "fan_star_videos" || m === "fan") return "fanStar";

  // Open Letters
  if (m === "openletters" || m === "open_letters" || m === "open letter" || m === "post_letters" || m === "post_letter") return "openLetters";

  // Mass App
  if (m === "massapp" || m === "mass_apps" || m === "massapps") return "massApp";

  return module; // fallback to original if no match
};

export const toggleSaveGeneral = async (req, res) => {
  try {
    let {
      user_id,
      module,
      module_item_id,
      main_category_id = null,
      sub_category_id = null,
    } = req.body;

    module = normalizeModuleName(module);

    if (!user_id || !module || !module_item_id) {
      return res
        .status(400)
        .json({ statusCode: 400, message: "user_id, module and module_item_id required" });
    }

    const checkUser = await pool.query(
      `SELECT * FROM users WHERE id=$1 AND is_deleted=FALSE`,
      [user_id]
    );
    if (checkUser.rows.length === 0) {
      return res.status(404).json({ statusCode: 404, message: "User not exist" });
    }

    const findQuery = `SELECT * FROM save_item_general WHERE user_id=$1 AND module=$2 AND module_item_id=$3`;
    const found = await pool.query(findQuery, [user_id, module, String(module_item_id)]);

    if (found.rows.length > 0) {
      // unsave
      const deleteQuery = `DELETE FROM save_item_general WHERE id=$1 RETURNING *`;
      const deleted = await pool.query(deleteQuery, [found.rows[0].id]);
      return res.status(200).json({ statusCode: 200, message: "Item unsaved successfully", data: deleted.rows[0] });
    }

    const insertQuery = `INSERT INTO save_item_general (user_id, module, module_item_id, main_category_id, sub_category_id) VALUES ($1,$2,$3,$4,$5) RETURNING *`;
    const inserted = await pool.query(insertQuery, [
      user_id,
      module,
      String(module_item_id),
      main_category_id,
      sub_category_id,
    ]);

    return res.status(201).json({ statusCode: 201, message: "Item saved successfully", data: inserted.rows[0] });
  } catch (error) {
    console.error(error);
    if (error.constraint === "uniq_saved_module_item") {
      return res.status(409).json({ statusCode: 409, message: "Item already saved" });
    }
    res.status(500).json({ statusCode: 500, message: "Internal server error", error });
  }
};

export const getSavedByModule = async (req, res) => {
  try {
    let { user_id, module } = req.query;
    module = normalizeModuleName(module);
    let page = parseInt(req.query.page || 1);
    const perPage = parseInt(req.query.limit || 100);
    const offset = (page - 1) * perPage;
    const main_category_id = req.query.main_category_id;

    if (!user_id || !module) {
      return res.status(400).json({ statusCode: 400, message: "user_id and module are required" });
    }

    const checkUser = await pool.query(`SELECT * FROM users WHERE id=$1 AND is_deleted=FALSE`, [user_id]);
    if (checkUser.rows.length === 0) {
      return res.status(404).json({ statusCode: 404, message: "User not exist" });
    }

    // fetch saved entries
    let baseQuery = `SELECT * FROM save_item_general WHERE user_id=$1 AND module=$2`;
    const params = [user_id, module];

    if (main_category_id !== undefined && main_category_id !== null && main_category_id !== "") {
      params.push(main_category_id);
      baseQuery += ` AND main_category_id=$${params.length}`;
    }

    baseQuery += ` ORDER BY created_at DESC`;
    const savedRowsRes = await pool.query(baseQuery, params);
    const savedRows = savedRowsRes.rows;

    // if no saved items, return empty
    if (savedRows.length === 0) {
      return res.status(200).json({ statusCode: 200, totalItems: 0, totalPages: 0, page, perPage, items: [] });
    }

    // map module_item_id array
    const ids = savedRows.map((r) => r.module_item_id).filter(Boolean);

    // helper to run module-specific queries
    const fetchModuleItems = async (moduleName, idsList) => {
      // convert to ints where appropriate
      const intIds = idsList.map((i) => parseInt(i, 10)).filter((v) => !isNaN(v));

      switch (moduleName) {
        case "xpi":
        case "xpi_videos":
        case "xpiVideos": {
          // reuse query pattern from xpiVideoController.getAllVideosByCategory but filter by ids
          const query = `
  SELECT
    v.id AS video_id,
    v.name,
    v.description,
    v.video_category,
    vc.name AS category_name,
    vc.french_name AS category_french_name,
    v.sub_category,
    vsc.name AS sub_category_name,
    v.video,
    v.thumbnail,
    v.created_at AS video_created_at,
    v.user_id,
    v.shared_post_id,
    u.username AS username,
    u.image AS user_image,
    u.is_premium AS premium,
    orig.name AS original_name,
    orig.description AS original_description,
    orig.video AS original_video,
    orig.thumbnail AS original_thumbnail,
    orig_u.username AS original_username,
    orig_u.image AS original_user_image,
    orig.created_at AS original_created_at
  FROM xpi_videos v
  JOIN users u ON v.user_id = u.id
  LEFT JOIN video_category vc ON v.video_category = vc.id
  LEFT JOIN video_sub_category vsc ON v.sub_category = vsc.id
  LEFT JOIN xpi_videos orig ON v.shared_post_id = orig.id
  LEFT JOIN users orig_u ON orig.user_id = orig_u.id
  WHERE (v.id = ANY($1::int[]) OR v.shared_post_id = ANY($1::int[]))
    AND u.is_deleted = FALSE AND v.status != 'blocked'
  GROUP BY v.id, u.username, u.image, u.is_premium, vc.name, vc.french_name, vsc.name, orig.id, orig_u.id
  ORDER BY v.created_at DESC
  LIMIT $2 OFFSET $3;
`;
          const { rows } = await pool.query(query, [intIds, perPage, offset]);

          // group by subcategory similar to original
          const grouped = rows.reduce((acc, row) => {
            const subCategoryId = row.sub_category || null;
            const subCategoryName = row.sub_category_name || "Uncategorized";
            if (!acc[subCategoryId]) {
              acc[subCategoryId] = {
                sub_category_name: subCategoryName,
                sub_category_id: subCategoryId,
                main_category_name: row.category_name,
                main_category_id: row.video_category,
                video_result: { totalVideos: 0, totalPages: 1, currentPage: page, Videos: [] },
              };
            }
            acc[subCategoryId].video_result.Videos.push({
              video_id: row.video_id,
              name: row.name,
              description: row.description,
              video: row.video,
              thumbnail: row.thumbnail,
              user_id: row.user_id,
              username: row.username,
              userimage: row.user_image,
              premium: row.premium,
              created_at: row.video_created_at,
              shared_post_id: row.shared_post_id,
              original_post: row.shared_post_id
                ? {
                    id: row.shared_post_id,
                    name: row.original_name,
                    description: row.original_description,
                    video: row.original_video,
                    thumbnail: row.original_thumbnail,
                    username: row.original_username,
                    user_image: row.original_user_image,
                    created_at: row.original_created_at,
                  }
                : null,
            });
            acc[subCategoryId].video_result.totalVideos += 1;
            return acc;
          }, {});

          return Object.values(grouped);
        }

        case "picTour":
        case "pic_tours":
        case "picTourImages": {
          const query = `
        SELECT
          v.id AS tour_id,
          v.name,
          v.description,
          v.pic_category,
          pc.name AS category_name,
          v.sub_category,
          psc.name AS sub_category_name,
          v.image,
          v.created_at AS tour_created_at,
          v.user_id,
          v.shared_post_id,
          u.username AS username,
          u.image AS userImage,
          u.is_premium AS premium,
          orig.name AS original_name,
          orig.description AS original_description,
          orig.image AS original_image,
          orig_u.username AS original_username,
          orig_u.image AS original_user_image,
          orig.created_at AS original_created_at
        FROM pic_tours v
        JOIN users u ON v.user_id = u.id
        LEFT JOIN pic_category pc ON v.pic_category = pc.id
        LEFT JOIN pic_sub_category psc ON v.sub_category = psc.id
        LEFT JOIN pic_tours orig ON v.shared_post_id = orig.id
        LEFT JOIN users orig_u ON orig.user_id = orig_u.id
        WHERE v.id = ANY($1::int[]) OR v.shared_post_id = ANY($1::int[])
        GROUP BY v.id, u.username, u.image, u.is_premium, pc.name, psc.name, orig.id, orig_u.id
        ORDER BY v.created_at DESC
        LIMIT $2 OFFSET $3;
      `;
          const { rows } = await pool.query(query, [intIds, perPage, offset]);
          // group by subcategory
          const grouped = rows.reduce((acc, row) => {
            const subCategoryId = row.sub_category || null;
            const subCategoryName = row.sub_category_name || "Uncategorized";
            if (!acc[subCategoryId]) {
              acc[subCategoryId] = {
                sub_category_name: subCategoryName,
                sub_category_id: subCategoryId,
                main_category_name: row.category_name,
                main_category_id: row.pic_category,
                tour_result: { totalTours: 0, totalPages: 1, currentPage: page, Tours: [] },
              };
            }
            acc[subCategoryId].tour_result.Tours.push(row);
            acc[subCategoryId].tour_result.totalTours += 1;
            return acc;
          }, {});
          return Object.values(grouped);
        }

        case "on_news":
        case "news":
        case "NEWS": {
          const query = `
        SELECT
          v.id AS news_id,
          v.name,
          v.description,
          v.category AS category_id,
          nc.name AS category_name,
          v.sub_category AS sub_category_id,
          vsc.name AS sub_category_name,
          v.image,
          v.created_at AS news_created_at,
          v.user_id,
          v.shared_post_id,
          u.username AS username,
          u.image AS userImage,
          u.is_premium AS premium,
          orig.name AS original_name,
          orig.description AS original_description,
          orig.image AS original_image,
          orig_u.username AS original_username,
          orig_u.image AS original_user_image,
          orig.created_at AS original_created_at
        FROM NEWS v
        JOIN users u ON v.user_id = u.id
        LEFT JOIN NEWS_category nc ON v.category = nc.id
        LEFT JOIN NEWS_sub_category vsc ON v.sub_category = vsc.id
        LEFT JOIN NEWS orig ON v.shared_post_id = orig.id
        LEFT JOIN users orig_u ON orig.user_id = orig_u.id
        WHERE v.id = ANY($1::int[]) OR v.shared_post_id = ANY($1::int[])
        GROUP BY v.id, u.username, u.image, u.is_premium, orig.id, orig_u.id, vsc.name, nc.name
        ORDER BY v.created_at DESC
        LIMIT $2 OFFSET $3;
      `;
          const { rows } = await pool.query(query, [intIds, perPage, offset]);
          // group by subcategory
          const grouped = rows.reduce((acc, row) => {
              const subCategoryId = row.sub_category || null;
              const subCategoryName = row.sub_category_name || "Uncategorized";
            if (!acc[subCategoryId]) {
              acc[subCategoryId] = {
                sub_category_name: subCategoryName,
                sub_category_id: subCategoryId,
                main_category_name: row.category_name,
                main_category_id: row.category_id,
                news_result: { totalNews: 0, totalPages: 1, currentPage: page, News: [], news: [] },
              };
            }
            acc[subCategoryId].news_result.News.push(row);
            acc[subCategoryId].news_result.news.push(row);
            acc[subCategoryId].news_result.totalNews += 1;
            return acc;
          }, {});
          return Object.values(grouped);
        }

        case "item":
        case "items": {
          const query = `
          SELECT
            i.id,
            i.user_id,
            u.username AS username,
            u.image AS userImage,
            i.item_category AS main_category_id,
            ic.name AS main_category_name,
            i.sub_category AS sub_category_id,
            isc.name AS sub_category_name,
            i.title,
            i.region,
            i.description,
            i.price,
            i.condition,
            i.location,
            i.paid_status,
            i.shared_post_id,
            COALESCE(ARRAY_AGG(DISTINCT JSONB_BUILD_OBJECT('id', ii.id, 'image', ii.image)), ARRAY[]::JSONB[]) AS images,
            orig.title AS original_title,
            orig.description AS original_description,
            orig.price AS original_price,
            orig.condition AS original_condition,
            orig.location AS original_location,
            orig_u.username AS original_username,
            orig_u.image AS original_user_image,
            orig.created_at AS original_created_at
          FROM item i
          JOIN users u ON i.user_id = u.id
          LEFT JOIN item_images ii ON i.id = ii.item_id
          LEFT JOIN item_category ic ON i.item_category = ic.id
          LEFT JOIN item_sub_category isc ON i.sub_category = isc.id
          LEFT JOIN item orig ON i.shared_post_id = orig.id
          LEFT JOIN users orig_u ON orig.user_id = orig_u.id
          WHERE i.id = ANY($1::int[]) OR i.shared_post_id = ANY($1::int[])
          GROUP BY i.id, u.username, u.image, ic.name, isc.name, orig.id, orig_u.id, orig.title, orig.description, orig.price, orig.condition, orig.location, orig_u.username, orig_u.image, orig.created_at
          ORDER BY i.created_at DESC
          LIMIT $2 OFFSET $3;
        `;
          const { rows } = await pool.query(query, [intIds, perPage, offset]);
          const grouped = rows.reduce((acc, row) => {
            const subCategoryId = row.sub_category_id || null;
            const subCategoryName = row.sub_category_name || "Uncategorized";
            if (!acc[subCategoryId]) {
              acc[subCategoryId] = {
                sub_category_name: subCategoryName,
                sub_category_id: subCategoryId,
                main_category_name: row.main_category_name,
                main_category_id: row.main_category_id,
                items: [],
              };
            }
            acc[subCategoryId].items.push(mapItemRow(row));
            return acc;
          }, {});
          return Object.values(grouped);
        }

        case "sports":
        case "sport": {
          const query = `
          SELECT
            v.id AS id,
            v.name AS name,
            v.description AS description,
            v.image AS image,
            v.category_id AS category_id,
            vc.name AS category_name,
            v.sub_category_id AS sub_category_id,
            vsc.name AS sub_category_name,
            v.user_id AS user_id,
            v.shared_post_id,
            u.username AS username,
            u.image AS user_image,
            u.is_premium AS premium,
            v.created_at AS created_at,
            orig.name AS original_name,
            orig.description AS original_description,
            orig.image AS original_image,
            orig_u.username AS original_username,
            orig_u.image AS original_user_image,
            orig.created_at AS original_created_at
          FROM sports v
          JOIN users u ON v.user_id = u.id
          LEFT JOIN sports_category vc ON v.category_id = vc.id
          LEFT JOIN sport_sub_category vsc ON v.sub_category_id = vsc.id
          LEFT JOIN sports orig ON v.shared_post_id = orig.id
          LEFT JOIN users orig_u ON orig.user_id = orig_u.id
          WHERE v.id = ANY($1::int[]) OR v.shared_post_id = ANY($1::int[])
          GROUP BY v.id, u.username, u.image, u.is_premium, vc.name, vsc.name, orig.id, orig_u.id
          ORDER BY v.created_at DESC
          LIMIT $2 OFFSET $3;
        `;
          const { rows } = await pool.query(query, [intIds, perPage, offset]);
          const grouped = rows.reduce((acc, row) => {
            const subCategoryId = row.sub_category_id || null;
            const subCategoryName = row.sub_category_name || "Uncategorized";
            if (!acc[subCategoryId]) {
              acc[subCategoryId] = {
                sub_category_name: subCategoryName,
                sub_category_id: subCategoryId,
                main_category_id: row.category_id,
                main_category_name: row.category_name,
                Sport_result: { totalSports: 0, totalPages: 1, currentPage: page, Sports: [] },
              };
            }
            acc[subCategoryId].Sport_result.Sports.push(row);
            acc[subCategoryId].Sport_result.totalSports += 1;
            return acc;
          }, {});
          return Object.values(grouped);
        }

        case "tvProgmax":
        case "tv_progmax_videos":
        case "tv": {
          const query = `
          SELECT
            v.id AS id,
            v.name AS name,
            v.description AS description,
            v.video AS video,
            v.thumbnail AS thumbnail,
            v.category_id AS category_id,
            vc.name AS category_name,
            v.sub_category_id AS sub_category_id,
            vsc.name AS sub_category_name,
            v.user_id AS user_id,
            v.shared_post_id,
            u.username AS username,
            u.image AS user_image,
            u.is_premium AS premium,
            v.created_at AS created_at,
            orig.name AS original_name,
            orig.description AS original_description,
            orig.video AS original_video,
            orig.thumbnail AS original_thumbnail,
            orig_u.username AS original_username,
            orig_u.image AS original_user_image,
            orig.created_at AS original_created_at
          FROM tv_progmax_videos v
          JOIN users u ON v.user_id = u.id
          LEFT JOIN tv_progmax_category vc ON v.category_id = vc.id
          LEFT JOIN tv_progmax_sub_category vsc ON v.sub_category_id = vsc.id
          LEFT JOIN tv_progmax_videos orig ON v.shared_post_id = orig.id
          LEFT JOIN users orig_u ON orig.user_id = orig_u.id
          WHERE v.id = ANY($1::int[]) OR v.shared_post_id = ANY($1::int[])
          GROUP BY v.id, u.username, u.image, u.is_premium, vc.name, vsc.name, orig.id, orig_u.id
          ORDER BY v.created_at DESC
          LIMIT $2 OFFSET $3;
        `;
          const { rows } = await pool.query(query, [intIds, perPage, offset]);
          const grouped = rows.reduce((acc, row) => {
            const subCategoryId = row.sub_category_id || null;
            const subCategoryName = row.sub_category_name || "Uncategorized";
            if (!acc[subCategoryId]) {
              acc[subCategoryId] = {
                sub_category_name: subCategoryName,
                sub_category_id: subCategoryId,
                main_category_name: row.category_name,
                main_category_id: row.category_id,
                video_result: { totalVideos: 0, totalPages: 1, currentPage: page, Videos: [], videos: [] },
              };
            }
            acc[subCategoryId].video_result.Videos.push(row);
            acc[subCategoryId].video_result.videos.push(row);
            acc[subCategoryId].video_result.totalVideos += 1;
            return acc;
          }, {});
          return Object.values(grouped);
        }

        case "qafi":
        case "QAFI": {
          const query = `
          SELECT
            v.id AS qafi_id,
            v.description,
            v.category AS category_id,
            v.sub_category AS sub_category_id,
            sc."index" AS sub_category_index,
            v.image,
            v.video,
            v.created_at AS created_at,
            v.user_id,
            v.shared_post_id,
            u.username AS username,
            u.image AS user_image,
            u.is_premium AS premium,
            c.name AS category_name,
            sc.name AS sub_category_name,
            c.french_name AS category_french_name,
            sc.french_name AS sub_category_french_name,
            orig.description AS original_description,
            orig.image AS original_image,
            orig.video AS original_video,
            orig_u.username AS original_username,
            orig_u.image AS original_user_image,
            orig.created_at AS original_created_at
          FROM qafi v
          JOIN users u ON v.user_id = u.id
          LEFT JOIN QAFI_category c ON v.category = c.id
          LEFT JOIN QAFI_sub_category sc ON v.sub_category = sc.id
          LEFT JOIN QAFI orig ON v.shared_post_id = orig.id
          LEFT JOIN users orig_u ON orig.user_id = orig_u.id
          WHERE v.id = ANY($1::int[]) OR v.shared_post_id = ANY($1::int[])
          GROUP BY v.id, u.username, u.image, u.is_premium, c.id, sc.id, orig.id, orig_u.id
          ORDER BY v.created_at DESC
          LIMIT $2 OFFSET $3;
        `;
          const { rows } = await pool.query(query, [intIds, perPage, offset]);
          const grouped = rows.reduce((acc, row) => {
            const subCategoryId = row.sub_category_id || null;
            const subCategoryName = row.sub_category_name || "";
            if (!acc[subCategoryId]) {
              acc[subCategoryId] = {
                sub_category_name: subCategoryName,
                sub_category_id: subCategoryId,
                main_category_id: row.category_id,
                main_category_name: row.category_name,
                QAFI_result: { totalQAFIs: 0, totalPages: 1, currentPage: page, QAFIs: [] },
              };
            }
            acc[subCategoryId].QAFI_result.QAFIs.push(row);
            acc[subCategoryId].QAFI_result.totalQAFIs += 1;
            return acc;
          }, {});
          return Object.values(grouped);
        }

        case "learningHobbies":
        case "learning_hobbies_videos":
        case "learning": {
          const query = `
          SELECT
            v.id AS id,
            v.name,
            v.description,
            v.thumbnail AS thumbnail,
            v.video AS video,
            v.category_id AS category_id,
            vc.name AS category_name,
            v.sub_category_id AS sub_category_id,
            vsc.name AS sub_category_name,
            v.user_id AS user_id,
            v.shared_post_id,
            u.username AS username,
            u.image AS user_image,
            u.is_premium AS premium,
            v.created_at AS created_at,
            orig.name AS original_name,
            orig.description AS original_description,
            orig.video AS original_video,
            orig.thumbnail AS original_thumbnail,
            orig_u.username AS original_username,
            orig_u.image AS original_user_image,
            orig.created_at AS original_created_at
          FROM learning_hobbies_videos v
          JOIN users u ON v.user_id = u.id
          LEFT JOIN learning_hobbies_category vc ON v.category_id = vc.id
          LEFT JOIN learning_hobbies_sub_category vsc ON v.sub_category_id = vsc.id
          LEFT JOIN learning_hobbies_videos orig ON v.shared_post_id = orig.id
          LEFT JOIN users orig_u ON orig.user_id = orig_u.id
          WHERE v.id = ANY($1::int[]) OR v.shared_post_id = ANY($1::int[])
          GROUP BY v.id, u.username, u.image, u.is_premium, vc.name, vsc.name, orig.id, orig_u.id
          ORDER BY v.created_at DESC
          LIMIT $2 OFFSET $3;
        `;
          const { rows } = await pool.query(query, [intIds, perPage, offset]);
          const grouped = rows.reduce((acc, row) => {
            const subCategoryId = row.sub_category_id || null;
            const subCategoryName = row.sub_category_name || "Uncategorized";
            if (!acc[subCategoryId]) {
              acc[subCategoryId] = {
                sub_category_name: subCategoryName,
                sub_category_id: subCategoryId,
                main_category_id: row.category_id,
                main_category_name: row.category_name,
                video_result: { totalVideos: 0, totalPages: 1, currentPage: page, Videos: [], videos: [] },
              };
            }
            acc[subCategoryId].video_result.Videos.push(row);
            acc[subCategoryId].video_result.videos.push(row);
            acc[subCategoryId].video_result.totalVideos += 1;
            return acc;
          }, {});
          return Object.values(grouped);
        }

        case "kidVids":
        case "kid_vids_videos":
        case "kid": {
          const query = `
          SELECT
            v.id AS id,
            v.name,
            v.description,
            v.thumbnail AS thumbnail,
            v.video AS video,
            v.category_id AS category_id,
            vc.name AS category_name,
            v.sub_category_id AS sub_category_id,
            vsc.name AS sub_category_name,
            v.user_id AS user_id,
            v.shared_post_id,
            u.username AS username,
            u.image AS user_image,
            u.is_premium AS premium,
            v.created_at AS created_at,
            orig.name AS original_name,
            orig.description AS original_description,
            orig.video AS original_video,
            orig.thumbnail AS original_thumbnail,
            orig_u.username AS original_username,
            orig_u.image AS original_user_image,
            orig.created_at AS original_created_at
          FROM kid_vids_videos v
          JOIN users u ON v.user_id = u.id
          LEFT JOIN kid_vids_category vc ON v.category_id = vc.id
          LEFT JOIN kid_vids_sub_category vsc ON v.sub_category_id = vsc.id
          LEFT JOIN kid_vids_videos orig ON v.shared_post_id = orig.id
          LEFT JOIN users orig_u ON orig.user_id = orig_u.id
          WHERE v.id = ANY($1::int[]) OR v.shared_post_id = ANY($1::int[])
          GROUP BY v.id, u.username, u.image, u.is_premium, vc.name, vsc.name, orig.id, orig_u.id
          ORDER BY v.created_at DESC
          LIMIT $2 OFFSET $3;
        `;
          const { rows } = await pool.query(query, [intIds, perPage, offset]);
          const grouped = rows.reduce((acc, row) => {
            const subCategoryId = row.sub_category_id || null;
            const subCategoryName = row.sub_category_name || "Uncategorized";
            if (!acc[subCategoryId]) {
              acc[subCategoryId] = {
                sub_category_name: subCategoryName,
                sub_category_id: subCategoryId,
                main_category_id: row.category_id,
                main_category_name: row.category_name,
                video_result: { totalVideos: 0, totalPages: 1, currentPage: page, Videos: [], videos: [] },
              };
            }
            acc[subCategoryId].video_result.Videos.push(row);
            acc[subCategoryId].video_result.videos.push(row);
            acc[subCategoryId].video_result.totalVideos += 1;
            return acc;
          }, {});
          return Object.values(grouped);
        }

        case "fanStar":
        case "fan_star_videos":
        case "fan": {
          const query = `
          SELECT
            v.id AS id,
            v.name,
            v.description,
            v.thumbnail AS thumbnail,
            v.video AS video,
            v.category_id AS category_id,
            vc.name AS category_name,
            v.sub_category_id AS sub_category_id,
            vsc.name AS sub_category_name,
            v.user_id AS user_id,
            v.shared_post_id,
            u.username AS username,
            u.image AS user_image,
            u.is_premium AS premium,
            v.created_at AS created_at,
            orig.name AS original_name,
            orig.description AS original_description,
            orig.video AS original_video,
            orig.thumbnail AS original_thumbnail,
            orig_u.username AS original_username,
            orig_u.image AS original_user_image,
            orig.created_at AS original_created_at
          FROM fan_star_videos v
          JOIN users u ON v.user_id = u.id
          LEFT JOIN fan_star_category vc ON v.category_id = vc.id
          LEFT JOIN fan_star_sub_category vsc ON v.sub_category_id = vsc.id
          LEFT JOIN fan_star_videos orig ON v.shared_post_id = orig.id
          LEFT JOIN users orig_u ON orig.user_id = orig_u.id
          WHERE v.id = ANY($1::int[]) OR v.shared_post_id = ANY($1::int[])
          GROUP BY v.id, u.username, u.image, u.is_premium, vc.name, vsc.name, orig.id, orig_u.id
          ORDER BY v.created_at DESC
          LIMIT $2 OFFSET $3;
        `;
          const { rows } = await pool.query(query, [intIds, perPage, offset]);
          const grouped = rows.reduce((acc, row) => {
            const subCategoryId = row.sub_category_id || null;
            const subCategoryName = row.sub_category_name || "Uncategorized";
            if (!acc[subCategoryId]) {
              acc[subCategoryId] = {
                sub_category_name: subCategoryName,
                sub_category_id: subCategoryId,
                main_category_id: row.category_id,
                main_category_name: row.category_name,
                video_result: { totalVideos: 0, totalPages: 1, currentPage: page, Videos: [], videos: [] },
              };
            }
            acc[subCategoryId].video_result.Videos.push(row);
            acc[subCategoryId].video_result.videos.push(row);
            acc[subCategoryId].video_result.totalVideos += 1;
            return acc;
          }, {});
          return Object.values(grouped);
        }

        case "cinematics":
        case "cinematics_videos":
        case "cinematic": {
          const query = `
          SELECT
            v.id AS id,
            v.name,
            v.description,
            v.thumbnail AS thumbnail,
            v.video AS video,
            v.category_id AS category_id,
            vc.name AS category_name,
            v.sub_category_id AS sub_category_id,
            vsc.name AS sub_category_name,
            v.user_id AS user_id,
            v.shared_post_id,
            u.username AS username,
            u.image AS user_image,
            u.is_premium AS premium,
            v.created_at AS created_at,
            orig.name AS original_name,
            orig.description AS original_description,
            orig.video AS original_video,
            orig.thumbnail AS original_thumbnail,
            orig_u.username AS original_username,
            orig_u.image AS original_user_image,
            orig.created_at AS original_created_at
          FROM cinematics_videos v
          JOIN users u ON v.user_id = u.id
          LEFT JOIN cinematics_category vc ON v.category_id = vc.id
          LEFT JOIN cinematics_sub_category vsc ON v.sub_category_id = vsc.id
          LEFT JOIN cinematics_videos orig ON v.shared_post_id = orig.id
          LEFT JOIN users orig_u ON orig.user_id = orig_u.id
          WHERE v.id = ANY($1::int[]) OR v.shared_post_id = ANY($1::int[])
          GROUP BY v.id, u.username, u.image, u.is_premium, vc.name, vsc.name, orig.id, orig_u.id
          ORDER BY v.created_at DESC
          LIMIT $2 OFFSET $3;
        `;
          const { rows } = await pool.query(query, [intIds, perPage, offset]);
          const grouped = rows.reduce((acc, row) => {
            const subCategoryId = row.sub_category_id || null;
            const subCategoryName = row.sub_category_name || "Uncategorized";
            if (!acc[subCategoryId]) {
              acc[subCategoryId] = {
                sub_category_name: subCategoryName,
                sub_category_id: subCategoryId,
                main_category_name: row.category_name,
                main_category_id: row.category_id,
                video_result: { totalVideos: 0, totalPages: 1, currentPage: page, Videos: [], videos: [] },
              };
            }
            acc[subCategoryId].video_result.Videos.push(row);
            acc[subCategoryId].video_result.videos.push(row);
            acc[subCategoryId].video_result.totalVideos += 1;
            return acc;
          }, {});
          return Object.values(grouped);
        }

        case "gebc":
        case "GEBC": {
          const query = `
          SELECT
            v.id AS id,
            v.name,
            v.description,
            v.image,
            v.category AS category_id,
            c.name AS category_name,
            v.sub_category AS sub_category_id,
            sc.name AS sub_category_name,
            sc."index" AS sub_category_index,
            v.user_id AS user_id,
            v.shared_post_id,
            u.username AS username,
            u.image AS user_image,
            u.is_premium AS premium,
            v.created_at AS created_at,
            orig.name AS original_name,
            orig.description AS original_description,
            orig.image AS original_image,
            orig_u.username AS original_username,
            orig_u.image AS original_user_image,
            orig.created_at AS original_created_at,
            (SELECT COUNT(*) FROM GEBC_comment WHERE GEBC_comment.GEBC_id = v.id AND GEBC_comment.is_deleted = FALSE AND GEBC_comment.is_hidden = FALSE) AS comment_count,
            (SELECT COUNT(*) FROM like_GEBC WHERE like_GEBC.GEBC_id = v.id) AS total_likes
          FROM GEBC v
          JOIN users u ON v.user_id = u.id
          LEFT JOIN GEBC_category c ON v.category = c.id
          LEFT JOIN GEBC_sub_category sc ON v.sub_category = sc.id
          LEFT JOIN GEBC orig ON v.shared_post_id = orig.id
          LEFT JOIN users orig_u ON orig.user_id = orig_u.id
          WHERE v.id = ANY($1::int[]) OR v.shared_post_id = ANY($1::int[])
          GROUP BY v.id, u.username, u.image, u.is_premium, c.name, sc.name, orig.id, orig_u.id, sc."index"
          ORDER BY v.created_at DESC
          LIMIT $2 OFFSET $3;
        `;
          const { rows } = await pool.query(query, [intIds, perPage, offset]);
          const grouped = rows.reduce((acc, gebc) => {
            const subCategoryId = gebc.sub_category_id || null;
            if (!acc[subCategoryId]) {
              acc[subCategoryId] = {
                sub_category_name: gebc.sub_category_name,
                sub_category_french_name: gebc.sub_category_french_name || null,
                sub_category_id: subCategoryId,
                sub_category_index: gebc.sub_category_index ?? null,
                main_category_name: gebc.category_name,
                main_category_id: gebc.category_id,
                GEBC_result: { totalGEBCs: 0, totalPages: 1, currentPage: page, GEBCs: [] },
              };
            }
            acc[subCategoryId].GEBC_result.GEBCs.push({
              gebc_id: gebc.id,
              name: gebc.name,
              description: gebc.description,
              image: gebc.image,
              user_id: gebc.user_id,
              username: gebc.username,
              user_image: gebc.user_image,
              created_at: gebc.created_at,
              comment_count: gebc.comment_count,
              total_likes: gebc.total_likes,
              shared_post_id: gebc.shared_post_id,
              original_post: gebc.shared_post_id
                ? {
                    id: gebc.shared_post_id,
                    name: gebc.original_name,
                    description: gebc.original_description,
                    image: gebc.original_image,
                    username: gebc.original_username,
                    user_image: gebc.original_user_image,
                    created_at: gebc.original_created_at,
                  }
                : null,
            });
            acc[subCategoryId].GEBC_result.totalGEBCs += 1;
            return acc;
          }, {});
          return Object.values(grouped);
        }

        case "openLetters":
        case "open_letters":
        case "post_letters": {
          const query = `
          SELECT
            pl.id AS post_id,
            pl.user_id,
            u.username,
            u.image AS userImage,
            pl.post_type,
            pl.receiver_type,
            pl.disc_category,
            d.name AS disc_category_name,
            d.french_name AS disc_category_french_name,
            pl.disc_sub_category,
            sc.name AS disc_sub_category_name,
            sc.french_name AS disc_sub_category_french_name,
            pl.name,
            pl.address,
            pl.email,
            pl.contact_no,
            pl.subject_place,
            pl.post_date,
            pl.greetings,
            pl.introduction,
            pl.body,
            pl.form_of_appeal,
            pl.video,
            pl.signature_id,
            pl.paid_status,
            pl.shared_post_id,
            COALESCE(
              ARRAY_AGG(pli.image) FILTER (WHERE pli.image IS NOT NULL AND btrim(pli.image) <> ''),
              ARRAY[]::TEXT[]
            ) AS images,
            orig.name AS original_name,
            orig.address AS original_address,
            orig.body AS original_body,
            orig_u.username AS original_username,
            orig_u.image AS original_user_image,
            orig.created_at AS original_created_at
          FROM post_letters pl
          JOIN users u ON pl.user_id = u.id
          LEFT JOIN disc_category d ON pl.disc_category = d.id
          LEFT JOIN disc_sub_category sc ON pl.disc_sub_category = sc.id
          LEFT JOIN post_letters_images pli ON pl.id = pli.letter_id
          LEFT JOIN post_letters orig ON pl.shared_post_id = orig.id
          LEFT JOIN users orig_u ON orig.user_id = orig_u.id
          WHERE (pl.id = ANY($1::int[]) OR pl.shared_post_id = ANY($1::int[]))
            AND u.is_deleted = FALSE
          GROUP BY pl.id, u.id, d.id, sc.id, orig.id, orig_u.id
          ORDER BY pl.created_at DESC
          LIMIT $2 OFFSET $3;
        `;
          const { rows } = await pool.query(query, [intIds, perPage, offset]);
          const grouped = rows.reduce((acc, row) => {
            const subCategoryId = row.disc_sub_category || null;
            const subCategoryName = row.disc_sub_category_name || "Uncategorized";
            if (!acc[subCategoryId]) {
              acc[subCategoryId] = {
                sub_category_name: subCategoryName,
                sub_category_id: subCategoryId,
                main_category_name: row.disc_category_name,
                main_category_id: row.disc_category,
                total_result: { totalLetters: 0, totalPages: 1, currentPage: page, letters: [] },
              };
            }
            acc[subCategoryId].total_result.letters.push(row);
            acc[subCategoryId].total_result.totalLetters += 1;
            return acc;
          }, {});
          return Object.values(grouped);
        }

        case "massApp":
        case "mass_apps": {
          const query = `
          SELECT
            m.id AS mass_app_id,
            m.user_id,
            m.app_category_id,
            ac.name AS app_category_name,
            ac.french_name AS app_category_french_name,
            m.name AS mass_app_name,
            m.icon AS mass_app_icon,
            m.type AS mass_app_type,
            m.created_at,
            u.username,
            u.image AS user_image
          FROM mass_app m
          JOIN users u ON m.user_id = u.id
          LEFT JOIN app_category ac ON m.app_category_id = ac.id
          WHERE m.id = ANY($1::int[])
            AND u.is_deleted = FALSE
          ORDER BY m.created_at DESC
          LIMIT $2 OFFSET $3;
        `;
          const { rows } = await pool.query(query, [intIds, perPage, offset]);
          const grouped = rows.reduce((acc, row) => {
            const catId = row.app_category_id ?? null;
            const catName = row.app_category_name || "Uncategorized";
            if (!acc[catId]) {
              acc[catId] = {
                sub_category_name: catName,
                sub_category_id: catId,
                mass_app_result: { totalMassApps: 0, totalPages: 1, currentPage: page, mass_apps: [] },
              };
            }
            acc[catId].mass_app_result.mass_apps.push({
              mass_app_id: row.mass_app_id,
              user_id: row.user_id,
              app_category_id: row.app_category_id,
              mass_app_name: row.mass_app_name,
              mass_app_icon: row.mass_app_icon,
              mass_app_type: row.mass_app_type,
              username: row.username,
              user_image: row.user_image,
              created_at: row.created_at,
            });
            acc[catId].mass_app_result.totalMassApps += 1;
            return acc;
          }, {});
          return Object.values(grouped);
        }

        default:
          return [];
      }
    };

    // fetch module items
    const moduleItems = await fetchModuleItems(module, ids);

    // pagination & total
    const totalItems = savedRows.length;
    const totalPages = Math.ceil(totalItems / perPage);

    res.status(200).json({ statusCode: 200, totalItems, totalPages, page, perPage, data: moduleItems });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error", error });
  }
};

export default {
  toggleSaveGeneral,
  getSavedByModule,
};
