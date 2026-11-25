import pool from "../db.config/index.js";
import { getSingleRow } from "../queries/common.js";

export const createTerms = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ statusCode: 400, message: "content is required" });

    const exist = await pool.query("SELECT * FROM terms_conditions ORDER BY id LIMIT 1");
    if (exist.rows.length > 0) {
      const updateQ = `UPDATE terms_conditions SET content = $1, updated_at = NOW() WHERE id = $2 RETURNING *`;
      const { rows } = await pool.query(updateQ, [content, exist.rows[0].id]);
      return res.status(200).json({ statusCode: 200, message: "Terms & Conditions updated successfully", data: rows[0] });
    }

    const q = "INSERT INTO terms_conditions (content) VALUES ($1) RETURNING *";
    const { rows } = await pool.query(q, [content]);
    return res.status(201).json({ statusCode: 201, message: "Terms & Conditions created successfully", data: rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const updateTerms = async (req, res) => {
  try {
    const { id, content } = req.body;
    if (!id || content === undefined) return res.status(400).json({ statusCode: 400, message: "id and content are required" });

    const existing = await pool.query("SELECT * FROM terms_conditions WHERE id = $1", [id]);
    if (existing.rows.length === 0) return res.status(404).json({ statusCode: 404, message: "Terms not found" });

    const q = `UPDATE terms_conditions SET content = $2, updated_at = NOW() WHERE id = $1 RETURNING *`;
    const { rows } = await pool.query(q, [id, content]);
    return res.status(200).json({ statusCode: 200, message: "Terms updated", data: rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const getTerms = async (req, res) => {
  try {
    // Return latest entry (there should typically be one)
    const q = `SELECT * FROM terms_conditions ORDER BY created_at DESC LIMIT 1`;
    const { rows } = await pool.query(q);
    if (rows.length === 0) return res.status(404).json({ statusCode: 404, message: "Terms not found" });
    return res.status(200).json({ statusCode: 200, data: rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export default { createTerms, updateTerms, getTerms };
