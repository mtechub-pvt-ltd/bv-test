import pool from "../db.config/index.js";
import { frenchNameFromRequest } from "../utils/frenchName.js";

// ----------------------------------------------------------------------------
// Admin CRUD for app_sub_category
// Each subcategory belongs to ONE main category (app_category.id)
// Slug is optional: only subcategories with slug='top_apps' trigger the
//   8-app limit enforced by /app/massApps/assign
// ----------------------------------------------------------------------------

// POST /app/appSubCategory
// Body: { category_id, name, french_name?, slug?, enabled? }
export const createAppSubCategory = async (req, res) => {
  try {
    const { category_id, name, slug, enabled } = req.body || {};
    const french_name = frenchNameFromRequest(req);

    if (!category_id || !name) {
      return res.status(400).json({
        statusCode: 400,
        message: "category_id and name are required",
      });
    }

    // Verify main category exists
    const catCheck = await pool.query(
      `SELECT id FROM public.app_category WHERE id = $1`,
      [category_id]
    );
    if (catCheck.rowCount === 0) {
      return res.status(400).json({
        statusCode: 400,
        message: "Invalid category_id",
      });
    }

    const result = await pool.query(
      `INSERT INTO public.app_sub_category
         (category_id, name, french_name, slug, enabled)
       VALUES ($1, $2, $3, $4, COALESCE($5, TRUE))
       RETURNING *`,
      [category_id, name, french_name || null, slug || null, enabled]
    );

    return res.status(201).json({
      statusCode: 201,
      message: "Subcategory created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23503") {
      return res.status(400).json({
        statusCode: 400,
        message: "category_id does not exist",
      });
    }
    console.error("createAppSubCategory error:", error);
    return res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error" });
  }
};

// GET /app/appSubCategory
// Query: ?category_id=<id>&enabled=true
export const getAllAppSubCategories = async (req, res) => {
  try {
    const { category_id, enabled } = req.query;
    const conditions = [];
    const params = [];
    let i = 1;

    if (category_id && !isNaN(Number(category_id))) {
      conditions.push(`s.category_id = $${i++}`);
      params.push(Number(category_id));
    }
    if (enabled !== undefined) {
      conditions.push(`s.enabled = $${i++}`);
      params.push(enabled === "true");
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await pool.query(
      `SELECT s.*, c.name AS category_name
       FROM public.app_sub_category s
       LEFT JOIN public.app_category c ON c.id = s.category_id
       ${where}
       ORDER BY s.category_id ASC, s.id ASC`,
      params
    );

    return res.status(200).json({
      statusCode: 200,
      totalSubCategories: result.rows.length,
      subCategories: result.rows,
    });
  } catch (error) {
    console.error("getAllAppSubCategories error:", error);
    return res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error" });
  }
};

// GET /app/appSubCategory/:id
export const getSpecificAppSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT s.*, c.name AS category_name
       FROM public.app_sub_category s
       LEFT JOIN public.app_category c ON c.id = s.category_id
       WHERE s.id = $1`,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({
        statusCode: 404,
        message: "Subcategory not found",
      });
    }
    return res.status(200).json({
      statusCode: 200,
      subCategory: result.rows[0],
    });
  } catch (error) {
    console.error("getSpecificAppSubCategory error:", error);
    return res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error" });
  }
};

// PUT /app/appSubCategory/:id
// Body: { name?, french_name?, slug?, enabled?, category_id? }
export const updateAppSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, french_name, slug, enabled, category_id } = req.body || {};

    const fields = [];
    const params = [];
    let i = 1;

    if (name !== undefined) {
      fields.push(`name = $${i++}`);
      params.push(name);
    }
    if (french_name !== undefined) {
      fields.push(`french_name = $${i++}`);
      params.push(french_name);
    }
    if (slug !== undefined) {
      fields.push(`slug = $${i++}`);
      params.push(slug);
    }
    if (enabled !== undefined) {
      fields.push(`enabled = $${i++}`);
      params.push(enabled);
    }
    if (category_id !== undefined) {
      fields.push(`category_id = $${i++}`);
      params.push(category_id);
    }
    fields.push(`updated_at = NOW()`);

    if (fields.length === 1) {
      return res.status(400).json({
        statusCode: 400,
        message: "No fields to update",
      });
    }

    params.push(id);
    const result = await pool.query(
      `UPDATE public.app_sub_category SET ${fields.join(", ")}
       WHERE id = $${i}
       RETURNING *`,
      params
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        statusCode: 404,
        message: "Subcategory not found",
      });
    }
    return res.status(200).json({
      statusCode: 200,
      message: "Subcategory updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("updateAppSubCategory error:", error);
    return res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error" });
  }
};

// DELETE /app/appSubCategory/:id
// Blocked if any user_mass_app_assignment row references this subcategory
export const deleteAppSubCategory = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query("BEGIN");

    // Check usage
    const usage = await client.query(
      `SELECT COUNT(*)::int AS c FROM public.user_mass_app_assignment WHERE subcategory_id = $1`,
      [id]
    );
    if (usage.rows[0].c > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        statusCode: 400,
        message: `Cannot delete: ${usage.rows[0].c} app assignment(s) reference this subcategory`,
        errorCode: "SUBCATEGORY_IN_USE",
      });
    }

    const result = await client.query(
      `DELETE FROM public.app_sub_category WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        statusCode: 404,
        message: "Subcategory not found",
      });
    }

    await client.query("COMMIT");
    return res.status(200).json({
      statusCode: 200,
      message: "Subcategory deleted successfully",
      data: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("deleteAppSubCategory error:", error);
    return res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error" });
  } finally {
    client.release();
  }
};