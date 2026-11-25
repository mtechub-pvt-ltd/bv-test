import moment from "moment";
import pool from "../db.config/index.js";
import { getAllRows, getSingleRow } from "../queries/common.js";
import { handle_delete_photos_from_folder } from "../utils/handleDeletePhoto.js";
import { interleaveBadgeSearchResults, paginateBadgeSearchResults } from "../utils/badgeSearchPagination.js";
import { safeSearchWord } from "../utils/sqlSafe.js";
export const createMassApp = async (req, res) => {
  try {
    const { user_id, app_category_id, name, type, image } = req.body;

    if (!user_id || !app_category_id || !name || !type || !image) {
      return res.status(400).json({
        statusCode: 400,
        message: "Missing required fields: user_id, app_category_id, name, type, and image are all required.",
      });
    }

    const createQuery = `INSERT INTO mass_app (user_id,app_category_id, name, icon, type) VALUES($1,$2,$3,$4,$5) RETURNING *`;
    const result = await pool.query(createQuery, [
      user_id,
      app_category_id,
      name,
      image,
      type,
    ]);
    if (result.rowCount === 1) {
      const getQuery = `
        SELECT mass_app.id AS mass_app_id,
        mass_app.user_id AS user_id,
        users.username AS username,
        users.image AS userImage,
        users.email AS userEmail,
        mass_app.app_category_id AS app_category_id,
        app_category.name AS app_category_name,
        app_category.french_name AS app_category_french_name,
        mass_app.name AS mass_app_name,
        mass_app.icon AS mass_app_icon,
        mass_app.type AS mass_app_type
        FROM mass_app
        LEFT JOIN users ON mass_app.user_id = users.id
        LEFT JOIN app_category ON mass_app.app_category_id = app_category.id
        WHERE mass_app.id = $1
        
        `;
      const massApp = await pool.query(getQuery, [result.rows[0].id]);
      return res.status(201).json({
        statusCode: 201,
        message: "Mass app created successfully",
        data: massApp.rows[0],
      });
    }
    res.status(400).json({ statusCode: 400, message: "Not created" });
    // } else {
    //   res.status(400).json({ statusCode: 400, message: "image not uploaded" });
    // }
  } catch (error) {
    console.error(error);
    handle_delete_photos_from_folder([req.file?.filename], "massAppImages");
    if (error.constraint === "check_valid_status") {
      return res.status(400).json({
        statusCode: 400,
        message:
          "Invalid mass app type use one of these types ('favourites','new_added','phone_based','unused_app')",
      });
    } else if (error.constraint === "mass_app_user_id_fkey") {
      return res
        .status(400)
        .json({ statusCode: 400, message: "user id not exist" });
    } else if (error.constraint === "mass_app_app_category_id_fkey") {
      return res.status(400).json({
        statusCode: 400,
        message: "app category id not exist",
      });
    }
    res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error", error });
  }
};

export const removeMassApp = async (req, res) => {
  const { id } = req.params;
  try {
    const condition = {
      column: "id",
      value: id,
    };
    const oldImage = await getSingleRow("mass_app", condition);
    if (oldImage.length === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "mass app not found " });
    }
    const oldImageSplit = oldImage[0].icon.replace("/fileUpload/", "");
    const delQuery = "DELETE FROM mass_app WHERE id=$1";
    const result = await pool.query(delQuery, [id]);
    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "mass app not deleted" });
    }
    handle_delete_photos_from_folder([oldImageSplit], "fileUpload");
    res.status(200).json({
      statusCode: 200,
      message: "Mass app deleted successfully",
      deletedApp: oldImage[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const getSpecificBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const getQuery = `
    SELECT banner.*, users.username AS user_username, users.image AS user_image
    FROM banner
    LEFT JOIN users ON banner.user_id = users.id
    WHERE (users.is_deleted = FALSE OR users.is_deleted IS NULL)
    AND banner.id = $1
`;

    const banner = await pool.query(getQuery, [id]);
    if (banner.rows.length > 0) {
      return res.status(200).json({
        statusCode: 200,
        banner: {
          ...banner.rows[0],
          startdate: moment(banner.rows[0].startdate).format("YYYY-MM-DD"),
          enddate: moment(banner.rows[0].enddate).format("YYYY-MM-DD"),
        },
      });
    } else {
      res.status(404).json({ statusCode: 404, message: "No banner found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const getAllAppByCategory = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id);
    let page = parseInt(req.query.page || 1); // Get the page number from the query parameters
    const perPage = parseInt(req.query.limit || 1000);
    const offset = (page - 1) * perPage;
    let getQuery = `
        SELECT mass_app.id AS mass_app_id,
        mass_app.user_id AS user_id,
        users.username AS username,
        users.image AS userImage,
        users.email AS userEmail,
        mass_app.app_category_id AS app_category_id,
        app_category.name AS app_category_name,
        app_category.french_name AS app_category_french_name,
        mass_app.name AS mass_app_name,
        mass_app.icon AS mass_app_icon,
        mass_app.type AS mass_app_type
        FROM mass_app
        LEFT JOIN users ON mass_app.user_id = users.id 
        LEFT JOIN app_category ON mass_app.app_category_id = app_category.id
        WHERE mass_app.app_category_id = $1 AND users.is_deleted=FALSE
        ORDER BY mass_app.created_at DESC
        
        `;
    if (req.query.page === undefined && req.query.limit === undefined) {
      //   // If no query parameters for pagination are provided, fetch all categories without pagination
      //   blogQuery = ` SELECT banner.*, users.username AS user_username, users.image AS user_image
      //   FROM banner
      //   LEFT JOIN users ON banner.user_id = users.id
      //   ORDER BY created_at DESC`;
    } else {
      getQuery += ` LIMIT $2 OFFSET $3;`;
    }
    let queryParameters = [id];

    if (req.query.page !== undefined || req.query.limit !== undefined) {
      queryParameters = [id, perPage, offset];
    }

    const { rows } = await pool.query(getQuery, queryParameters);
    if (req.query.page === undefined && req.query.limit === undefined) {
      res.status(200).json({
        statusCode: 200,
        totalMassApps: rows.length,
        AllMassApps: rows,
      });
    } else {
      // Calculate the total number of categories (without pagination)
      const totalMassAppsQuery = `SELECT COUNT(*) AS total FROM public.mass_app
      LEFT JOIN users ON mass_app.user_id = users.id
      WHERE mass_app.app_category_id = $1 AND users.is_deleted=FALSE`;
      const totalMassAppsResult = await pool.query(totalMassAppsQuery, [id]);
      const totalMassApps = totalMassAppsResult.rows[0].total;
      const totalPages = Math.ceil(totalMassApps / perPage);

      res.status(200).json({
        statusCode: 200,
        totalMassApps,
        totalPages,
        AllMassApps: rows,
      });
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error", error });
  }
};
export const getAllFavouritesApp = async (req, res) => {
  try {
    const { id } = req.params;
    let page = parseInt(req.query.page || 1); // Get the page number from the query parameters
    const perPage = parseInt(req.query.limit || 1000);
    const offset = (page - 1) * perPage;

    let getQuery = `
      SELECT mass_app.id AS mass_app_id,
      mass_app.user_id AS user_id,
      users.username AS username,
      users.image AS userImage,
      users.email AS userEmail,
      mass_app.app_category_id AS app_category_id,
      app_category.name AS app_category_name,
      app_category.french_name AS app_category_french_name,
      mass_app.name AS mass_app_name,
      mass_app.icon AS mass_app_icon,
      mass_app.type AS mass_app_type
      FROM mass_app
      LEFT JOIN users ON mass_app.user_id = users.id
      LEFT JOIN app_category ON mass_app.app_category_id = app_category.id
      WHERE mass_app.app_category_id=$1
    `;

    let whereClause = [];
    let queryParameters = [id];
    let parameterIndex = 2; // Start with the first parameter index

    if (req.query.type) {
      whereClause.push(`mass_app.type = $${parameterIndex}`);
      queryParameters.push(req.query.type);
      parameterIndex++;
    }

    if (req.query.user_id) {
      whereClause.push(
        `mass_app.user_id = $${parameterIndex} AND users.is_deleted=FALSE`
      );
      queryParameters.push(req.query.user_id);
      parameterIndex++;
    }

    if (whereClause.length > 0) {
      getQuery += ` AND ${whereClause.join(" AND ")}`;
    }
    getQuery += ` ORDER BY mass_app.created_at`;
    if (req.query.page !== undefined || req.query.limit !== undefined) {
      getQuery += ` LIMIT $${parameterIndex} OFFSET $${parameterIndex + 1}`;
      queryParameters.push(perPage, offset);
    }

    console.log(getQuery);
    console.log(queryParameters);
    const { rows } = await pool.query(getQuery, queryParameters);
    if (req.query.page === undefined && req.query.limit === undefined) {
      res.status(200).json({
        statusCode: 200,
        totalMassApps: rows.length,
        AllMassApps: rows,
      });
    } else {
      // Calculate the total number of records (without pagination)
      let totalMassAppsQuery = `SELECT COUNT(*) AS total FROM public.mass_app
        LEFT JOIN users ON mass_app.user_id = users.id
        WHERE mass_app.app_category_id=$1
        `;

      const newArray = queryParameters.slice(0, queryParameters.length - (req.query.page !== undefined || req.query.limit !== undefined ? 2 : 0));
      if (whereClause.length > 0) {
        totalMassAppsQuery += ` AND ${whereClause.join(" AND ")}`;
      }

      console.log(totalMassAppsQuery);
      const totalMassAppsResult = await pool.query(
        totalMassAppsQuery,
        newArray
      ); // Use a separate array for total count query parameters

      const totalMassApps = totalMassAppsResult.rows[0].total;
      const totalPages = Math.ceil(totalMassApps / perPage);

      res.status(200).json({
        statusCode: 200,
        totalMassApps,
        totalPages,
        AllMassApps: rows,
      });
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error", error });
  }
};

export const addfavourite = async (req, res) => {
  try {
    const { id, type } = req.body;

    if (!id) {
      return res.status(400).json({
        statusCode: 400,
        message: "Missing app ID in the request body",
      });
    }

    const existingBanner = await pool.query(
      "SELECT * FROM mass_app WHERE id = $1",
      [id]
    );

    if (existingBanner.rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        message: "App with the provided ID not found",
      });
    }

    const updateQuery = `
        UPDATE mass_app
        SET type = $2
        WHERE id = $1
        RETURNING *`;

    const result = await pool.query(updateQuery, [id, type]);

    if (result.rowCount === 1) {
      const getQuery = `
        SELECT mass_app.id AS mass_app_id,
        mass_app.user_id AS user_id,
        users.username AS username,
        users.image AS userImage,
        users.email AS userEmail,
        mass_app.app_category_id AS app_category_id,
        app_category.name AS app_category_name,
        app_category.french_name AS app_category_french_name,
        mass_app.name AS mass_app_name,
        mass_app.icon AS mass_app_icon,
        mass_app.type AS mass_app_type
        FROM mass_app
        LEFT JOIN users ON mass_app.user_id = users.id
        LEFT JOIN app_category ON mass_app.app_category_id = app_category.id
        WHERE mass_app.id = $1
        
        `;
      const massApp = await pool.query(getQuery, [id]);
      return res.status(200).json({
        statusCode: 200,
        message: `App added to ${type} section successfully`,
        data: massApp.rows[0],
      });
    }

    res.status(400).json({ statusCode: 400, message: "Update failed" });
  } catch (error) {
    if (error.constraint === "check_valid_status") {
      return res.status(400).json({
        statusCode: 400,
        message:
          "Invalid mass app type use one of these types ('favourites','new_added','phone_based','unused_app')",
      });
    }
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};
export const removefavourite = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        statusCode: 400,
        message: "Missing app ID in the request body",
      });
    }

    const existingBanner = await pool.query(
      "SELECT * FROM mass_app WHERE id = $1 AND type=$2",
      [id, "favourites"]
    );

    if (existingBanner.rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        message:
          "App with the provided ID not found or this app is not in favourite list",
      });
    }

    const updateQuery = `
          UPDATE mass_app
          SET type = $2
          WHERE id = $1
          RETURNING *`;

    const result = await pool.query(updateQuery, [id, "phone_based"]);

    if (result.rowCount === 1) {
      const getQuery = `
          SELECT mass_app.id AS mass_app_id,
          mass_app.user_id AS user_id,
          users.username AS username,
          users.image AS userImage,
          users.email AS userEmail,
          mass_app.app_category_id AS app_category_id,
          app_category.name AS app_category_name,
          app_category.french_name AS app_category_french_name,
          mass_app.name AS mass_app_name,
          mass_app.icon AS mass_app_icon,
          mass_app.type AS mass_app_type
          FROM mass_app
          LEFT JOIN users ON mass_app.user_id = users.id
          LEFT JOIN app_category ON mass_app.app_category_id = app_category.id
          WHERE mass_app.id = $1
          
          `;
      const massApp = await pool.query(getQuery, [id]);
      return res.status(200).json({
        statusCode: 200,
        message: `App removed to ${existingBanner.rows[0].type} section successfully`,
        data: massApp.rows[0],
      });
    }

    res.status(400).json({ statusCode: 400, message: "Update failed" });
  } catch (error) {
    if (error.constraint === "check_valid_status") {
      return res.status(400).json({
        statusCode: 400,
        message:
          "Invalid mass app type use one of these types ('favourites','new_added','phone_based','unused_app')",
      });
    }
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

// ----------------------------------------------------------------------------
// Mass Apps — per-user subcategory storage
// Storage: user_mass_app_assignment (per-user) references
//          app_sub_category.id (admin-managed definitions)
// Routes mounted under /app/massApps (auth required)
// ----------------------------------------------------------------------------

const TOP_APPS_LIMIT = 8;       // applied when the target subcategory's slug = 'top_apps'
const TOP_APPS_SLUG = "top_apps";
const RECENT_APPS_LIMIT = 4;    // applied to global mass_app_recent list

const userIdFromReq = (req) => {
  // req.user is set by the verification middleware from the JWT payload
  return req.user?.id || req.user?.userId || req.user?.user_id;
};

// GET /app/massApps
// Returns all per-user mass app data: subcategories by category, hidden IDs, recent apps
export const getMassApps = async (req, res) => {
  try {
    const userId = userIdFromReq(req);
    if (!userId) {
      return res.status(401).json({ statusCode: 401, message: "Unauthorized" });
    }

    // 1) Subcategory assignments
    //    Join to app_sub_category so we can return the subcategory id, name, slug per row.
    const subsQuery = `
      SELECT
        uma.main_category_id,
        uma.subcategory_id,
        sc.name          AS subcategory_name,
        sc.slug          AS subcategory_slug,
        uma.package_name,
        uma.label,
        uma.name
      FROM public.user_mass_app_assignment uma
      JOIN public.app_sub_category sc ON sc.id = uma.subcategory_id
      WHERE uma.user_id = $1
      ORDER BY uma.main_category_id ASC, uma.subcategory_id ASC, uma.position ASC
    `;
    const subsResult = await pool.query(subsQuery, [userId]);

    // Build subcategoriesByCategory — keyed by main_category_id (string).
    // Each category's value is an object keyed by subcategory_id (as string),
    // each containing an array of app objects.
    const subcategoriesByCategory = {};
    for (const row of subsResult.rows) {
      const catId = String(row.main_category_id);
      const subId = String(row.subcategory_id);
      if (!subcategoriesByCategory[catId]) {
        subcategoriesByCategory[catId] = {};
      }
      if (!subcategoriesByCategory[catId][subId]) {
        subcategoriesByCategory[catId][subId] = {
          id: row.subcategory_id,
          name: row.subcategory_name,
          slug: row.subcategory_slug,
          apps: [],
        };
      }
      const app = { packageName: row.package_name };
      if (row.label) app.label = row.label;
      if (row.name) app.name = row.name;
      subcategoriesByCategory[catId][subId].apps.push(app);
    }

    // 2) Hidden apps
    const hiddenResult = await pool.query(
      `SELECT package_name FROM public.mass_app_hidden
       WHERE user_id = $1 ORDER BY created_at ASC`,
      [userId]
    );
    const hiddenAppIds = hiddenResult.rows.map((r) => r.package_name);

    // 3) Recent apps (max 4, newest first)
    const recentResult = await pool.query(
      `SELECT package_name, label, name FROM public.mass_app_recent
       WHERE user_id = $1 ORDER BY position ASC, created_at DESC LIMIT $2`,
      [userId, RECENT_APPS_LIMIT]
    );
    const recentApps = recentResult.rows.map((r) => {
      const a = { packageName: r.package_name };
      if (r.label) a.label = r.label;
      if (r.name) a.name = r.name;
      return a;
    });

    return res.status(200).json({
      statusCode: 200,
      message: "Mass apps fetched successfully",
      data: {
        subcategoriesByCategory,
        hiddenAppIds,
        recentApps,
      },
    });
  } catch (error) {
    console.error("getMassApps error:", error);
    return res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error" });
  }
};

// POST /app/massApps/assign
// Body: { packageName, label?, name?, mainCategoryId, subcategoryId (integer) }
export const assignMassApp = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = userIdFromReq(req);
    if (!userId) {
      return res.status(401).json({ statusCode: 401, message: "Unauthorized" });
    }

    const { packageName, label, name, mainCategoryId, subcategoryId } = req.body || {};
    if (!packageName || !mainCategoryId || !subcategoryId) {
      return res.status(400).json({
        statusCode: 400,
        message: "packageName, mainCategoryId, and subcategoryId are required",
      });
    }

    // Verify the subcategory exists, belongs to the main category, and is enabled
    const subCheck = await client.query(
      `SELECT id, category_id, slug, enabled FROM public.app_sub_category
       WHERE id = $1`,
      [subcategoryId]
    );
    if (subCheck.rowCount === 0) {
      return res.status(400).json({
        statusCode: 400,
        message: "Invalid subcategoryId",
        errorCode: "INVALID_SUBCATEGORY",
      });
    }
    const sub = subCheck.rows[0];
    if (!sub.enabled) {
      return res.status(400).json({
        statusCode: 400,
        message: "Subcategory is disabled",
        errorCode: "SUBCATEGORY_DISABLED",
      });
    }
    if (Number(sub.category_id) !== Number(mainCategoryId)) {
      return res.status(400).json({
        statusCode: 400,
        message: "Subcategory does not belong to the given mainCategoryId",
        errorCode: "SUBCATEGORY_CATEGORY_MISMATCH",
      });
    }

    // Verify mainCategoryId exists
    const catCheck = await client.query(
      `SELECT id FROM public.app_category WHERE id = $1`,
      [mainCategoryId]
    );
    if (catCheck.rowCount === 0) {
      return res.status(400).json({
        statusCode: 400,
        message: "Invalid mainCategoryId",
      });
    }

    await client.query("BEGIN");

    // Check current location of this app
    const current = await client.query(
      `SELECT id, main_category_id, subcategory_id FROM public.user_mass_app_assignment
       WHERE user_id = $1 AND package_name = $2 FOR UPDATE`,
      [userId, packageName]
    );

    // Rule 4: idempotent — same category + subcategory, do nothing
    if (
      current.rowCount > 0 &&
      Number(current.rows[0].main_category_id) === Number(mainCategoryId) &&
      Number(current.rows[0].subcategory_id) === Number(subcategoryId)
    ) {
      await client.query("COMMIT");
      return res.status(200).json({
        statusCode: 200,
        message: "App category updated",
        data: { packageName, mainCategoryId, subcategoryId },
      });
    }

    // Rule 3: enforce 8-app limit ONLY when the target subcategory's slug = 'top_apps'
    if (sub.slug === TOP_APPS_SLUG) {
      const countRes = await client.query(
        `SELECT COUNT(*)::int AS c FROM public.user_mass_app_assignment
         WHERE user_id = $1 AND main_category_id = $2 AND subcategory_id = $3
           AND NOT (package_name = $4)`,
        [userId, mainCategoryId, subcategoryId, packageName]
      );
      if (countRes.rows[0].c >= TOP_APPS_LIMIT) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          statusCode: 400,
          message: "You can only add 8 apps in this category",
          errorCode: "TOP_APPS_LIMIT",
        });
      }
    }

    // Rule 1: app must be in one place only — remove from any existing row
    if (current.rowCount > 0) {
      await client.query(
        `DELETE FROM public.user_mass_app_assignment
         WHERE user_id = $1 AND package_name = $2`,
        [userId, packageName]
      );
    }

    // Rule 2: if app was hidden, remove from hidden
    await client.query(
      `DELETE FROM public.mass_app_hidden WHERE user_id = $1 AND package_name = $2`,
      [userId, packageName]
    );

    // Rule 5: bump existing positions in the target subcategory, insert at front
    await client.query(
      `UPDATE public.user_mass_app_assignment
       SET position = position + 1
       WHERE user_id = $1 AND main_category_id = $2 AND subcategory_id = $3`,
      [userId, mainCategoryId, subcategoryId]
    );

    // Preserve existing label/name if the request doesn't supply them
    let existingLabel = null;
    let existingName = null;
    if (current.rowCount > 0) {
      const oldRow = await client.query(
        `SELECT label, name FROM public.user_mass_app_assignment WHERE id = $1`,
        [current.rows[0].id]
      );
      if (oldRow.rowCount > 0) {
        existingLabel = oldRow.rows[0].label;
        existingName = oldRow.rows[0].name;
      }
    }
    const finalLabel = label || name || existingLabel || null;
    const finalName = name || label || existingName || null;

    await client.query(
      `INSERT INTO public.user_mass_app_assignment
         (user_id, package_name, label, name, main_category_id, subcategory_id, position)
       VALUES ($1, $2, $3, $4, $5, $6, 0)`,
      [userId, packageName, finalLabel, finalName, mainCategoryId, subcategoryId]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      statusCode: 200,
      message: "App category updated",
      data: { packageName, mainCategoryId, subcategoryId },
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("assignMassApp error:", error);
    return res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error" });
  } finally {
    client.release();
  }
};

// DELETE /app/massApps/:packageName
// Soft delete: hide + remove from all subcategories + remove from recent
export const deleteMassApp = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = userIdFromReq(req);
    if (!userId) {
      return res.status(401).json({ statusCode: 401, message: "Unauthorized" });
    }

    const { packageName } = req.params;
    if (!packageName) {
      return res.status(400).json({
        statusCode: 400,
        message: "packageName is required",
      });
    }

    await client.query("BEGIN");

    // Rule 2: remove from all subcategory assignments
    await client.query(
      `DELETE FROM public.user_mass_app_assignment
       WHERE user_id = $1 AND package_name = $2`,
      [userId, packageName]
    );

    // Rule 3: remove from recent
    await client.query(
      `DELETE FROM public.mass_app_recent
       WHERE user_id = $1 AND package_name = $2`,
      [userId, packageName]
    );

    // Rule 1: add to hidden (idempotent via ON CONFLICT)
    await client.query(
      `INSERT INTO public.mass_app_hidden (user_id, package_name, label)
       VALUES ($1, $2, NULL)
       ON CONFLICT (user_id, package_name) DO NOTHING`,
      [userId, packageName]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      statusCode: 200,
      message: "App deleted successfully",
      data: { packageName, hidden: true },
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("deleteMassApp error:", error);
    return res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error" });
  } finally {
    client.release();
  }
};

// POST /app/massApps/recent
// Body: { packageName, label?, name? }
// Adds (or moves to front) an app in the global recent shortcuts (max 4).
export const addRecentMassApp = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = userIdFromReq(req);
    if (!userId) {
      return res.status(401).json({ statusCode: 401, message: "Unauthorized" });
    }

    const { packageName, label, name } = req.body || {};
    if (!packageName) {
      return res.status(400).json({
        statusCode: 400,
        message: "packageName is required",
      });
    }

    await client.query("BEGIN");

    // Rule 3: must not add hidden apps
    const hiddenCheck = await client.query(
      `SELECT 1 FROM public.mass_app_hidden WHERE user_id = $1 AND package_name = $2`,
      [userId, packageName]
    );
    if (hiddenCheck.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        statusCode: 400,
        message: "Cannot add a hidden app to recent",
        errorCode: "APP_HIDDEN",
      });
    }

    // Check if app already exists in recent
    const existing = await client.query(
      `SELECT id, position FROM public.mass_app_recent
       WHERE user_id = $1 AND package_name = $2 FOR UPDATE`,
      [userId, packageName]
    );

    if (existing.rowCount === 0) {
      // Rule 1: max 4 — only check when this is a NEW app
      const countRes = await client.query(
        `SELECT COUNT(*)::int AS c FROM public.mass_app_recent WHERE user_id = $1`,
        [userId]
      );
      if (countRes.rows[0].c >= RECENT_APPS_LIMIT) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          statusCode: 400,
          message: "You can only add 4 recent apps",
          errorCode: "RECENT_APPS_LIMIT",
        });
      }
    }

    // Rule 2: remove existing row (move-to-front pattern), bump all others
    if (existing.rowCount > 0) {
      await client.query(
        `DELETE FROM public.mass_app_recent WHERE id = $1`,
        [existing.rows[0].id]
      );
    }
    await client.query(
      `UPDATE public.mass_app_recent
       SET position = position + 1
       WHERE user_id = $1`,
      [userId]
    );

    const finalLabel = label || name || null;
    const finalName = name || label || null;
    await client.query(
      `INSERT INTO public.mass_app_recent
         (user_id, package_name, label, name, position)
       VALUES ($1, $2, $3, $4, 0)`,
      [userId, packageName, finalLabel, finalName]
    );

    await client.query("COMMIT");

    // Return the up-to-date list (max 4)
    const recentResult = await pool.query(
      `SELECT package_name, label, name FROM public.mass_app_recent
       WHERE user_id = $1 ORDER BY position ASC, created_at DESC LIMIT $2`,
      [userId, RECENT_APPS_LIMIT]
    );
    const recentApps = recentResult.rows.map((r) => {
      const a = { packageName: r.package_name };
      if (r.label) a.label = r.label;
      if (r.name) a.name = r.name;
      return a;
    });

    return res.status(200).json({
      statusCode: 200,
      message: "Recent app added",
      data: { recentApps },
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("addRecentMassApp error:", error);
    return res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error" });
  } finally {
    client.release();
  }
};

// DELETE /app/massApps/recent/:packageName
// Removes an app from the global recent shortcuts list (idempotent).
export const removeRecentMassApp = async (req, res) => {
  try {
    const userId = userIdFromReq(req);
    if (!userId) {
      return res.status(401).json({ statusCode: 401, message: "Unauthorized" });
    }
    const { packageName } = req.params;
    if (!packageName) {
      return res.status(400).json({
        statusCode: 400,
        message: "packageName is required",
      });
    }

    await pool.query(
      `DELETE FROM public.mass_app_recent WHERE user_id = $1 AND package_name = $2`,
      [userId, packageName]
    );

    return res.status(200).json({
      statusCode: 200,
      message: "Recent app removed",
      data: { packageName },
    });
  } catch (error) {
    console.error("removeRecentMassApp error:", error);
    return res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error" });
  }
};

export const searchApps = async (req, res) => {
  try {
    const { searchWord } = req.query;

    // Validate that searchWord is provided
    if (!searchWord || typeof searchWord !== 'string') {
      return res.status(200).json({ statusCode: 200, Banners: [] });
    }

    // Split the search query into individual words
    const searchWords = searchWord.split(/\s+/).filter(Boolean).map(safeSearchWord);

    if (searchWords.length === 0) {
      return res.status(200).json({ statusCode: 200, Banners: [] });
    }

    // Create an array of conditions for each search word
    const conditions = searchWords.map((word) => {
      const cleanWord = word.replace(/^@+/, "");
      return `(mass_app.name ILIKE '%${word}%' OR users.username ILIKE '%${cleanWord}%' OR users.username ILIKE '%${word}%')`;
    });
    const searchQuery = `
    SELECT mass_app.id AS mass_app_id,
    mass_app.user_id AS user_id,
    users.username AS username,
    users.image AS userImage,
    users.email AS userEmail,
    users.is_subscribed,
    users.badge,
    mass_app.app_category_id AS app_category_id,
    app_category.name AS app_category_name,
    app_category.french_name AS app_category_french_name,
    NULL::integer AS sub_category_id,
    NULL::text AS sub_category_name,
    mass_app.name AS mass_app_name,
    mass_app.icon AS mass_app_icon,
    mass_app.type AS mass_app_type
    FROM mass_app
    LEFT JOIN users ON mass_app.user_id = users.id
    LEFT JOIN app_category ON mass_app.app_category_id = app_category.id
    WHERE ${conditions.join(" OR ")} AND users.is_deleted=FALSE
    ORDER BY mass_app.created_at DESC
    `;

    const { rows } = await pool.query(searchQuery);
    const ordered = interleaveBadgeSearchResults(rows, {
      dateFields: ["created_at"],
    });

    return res
      .status(200)
      .json({ statusCode: 200, totalResults: ordered.length, Apps: ordered });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
