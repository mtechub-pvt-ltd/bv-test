import pool from "../db.config/index.js";
import { getAllRows, getSingleRow } from "../queries/common.js";
import { safeSearchWord } from "../utils/sqlSafe.js";
export const createConfig = async (req, res) => {
  try {
    const {
      description,
      length,
      width,
      cost,
      top_banner_cost,
      top_tier_daily_rate,
      middle_tier_daily_rate,
      lower_tier_daily_rate,
    } = req.body;
    const isExist = await pool.query(`SELECT * FROM banner_configuration`);
    if (isExist.rows.length > 0) {
      return res.status(400).json({
        statusCode: 400,
        message:
          "Banner configuration already added.You can add only one time then just update it",
        existingBannerConfig: isExist.rows[0],
      });
    }

    const finalTopRate = top_tier_daily_rate !== undefined ? top_tier_daily_rate : (top_banner_cost || 5.00);
    const finalMidRate = middle_tier_daily_rate !== undefined ? middle_tier_daily_rate : (cost || 2.50);
    const finalLowRate = lower_tier_daily_rate !== undefined ? lower_tier_daily_rate : 1.00;

    const createQuery =
      "INSERT INTO banner_configuration (description,length,width,cost,top_banner_cost,top_tier_daily_rate,middle_tier_daily_rate,lower_tier_daily_rate) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *";
    const result = await pool.query(createQuery, [
      description,
      length,
      width,
      cost || finalMidRate,
      top_banner_cost || finalTopRate,
      finalTopRate,
      finalMidRate,
      finalLowRate,
    ]);

    if (result.rowCount === 1) {
      return res.status(201).json({
        statusCode: 201,
        message: "Banner configuration created successfully",
        data: result.rows[0],
      });
    }
    res.status(400).json({ statusCode: 400, message: "Not created" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};
export const deleteConfig = async (req, res) => {
  const { id } = req.params;
  try {
    const condition = {
      column: "id",
      value: id,
    };
    const oldCatgory = await getSingleRow("banner_configuration", condition);
    if (oldCatgory.length === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "Banner configuration not found " });
    }
    const delQuery = "DELETE FROM banner_configuration WHERE id=$1";
    await pool.query(delQuery, [id]);
    res.status(200).json({
      statusCode: 200,
      message: "Banner configuration deleted successfully",
      deleteCOnfig: oldCatgory[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const getSpecificConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const condition = {
      column: "id",
      value: id,
    };
    const result = await getSingleRow("banner_configuration", condition);
    if (result.length === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "Banner configuration not found" });
    }
    return res.status(200).json({ statusCode: 200, Config: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const getAllBannerConfig = async (req, res) => {
  try {
    let banner_query = `SELECT * FROM banner_configuration ORDER BY created_at DESC LIMIT 1`;
    const { rows } = await pool.query(banner_query);
    const row = rows[0] || {};
    res.status(200).json({
      statusCode: 200,
      result: {
        ...row,
        top_tier_daily_rate: row.top_tier_daily_rate !== null && row.top_tier_daily_rate !== undefined ? String(row.top_tier_daily_rate) : "5.00",
        middle_tier_daily_rate: row.middle_tier_daily_rate !== null && row.middle_tier_daily_rate !== undefined ? String(row.middle_tier_daily_rate) : "2.50",
        lower_tier_daily_rate: row.lower_tier_daily_rate !== null && row.lower_tier_daily_rate !== undefined ? String(row.lower_tier_daily_rate) : "1.00",
      },
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error", error });
  }
};

export const getTierPrices = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, top_tier_daily_rate, middle_tier_daily_rate, lower_tier_daily_rate, cost, top_banner_cost 
       FROM banner_configuration ORDER BY created_at DESC LIMIT 1`
    );
    const row = rows[0] || {};
    const topRate = parseFloat(row.top_tier_daily_rate || row.top_banner_cost || 5.00);
    const middleRate = parseFloat(row.middle_tier_daily_rate || row.cost || 2.50);
    const lowerRate = parseFloat(row.lower_tier_daily_rate || 1.00);

    return res.status(200).json({
      statusCode: 200,
      prices: {
        top: topRate,
        middle: middleRate,
        lower: lowerRate,
      },
      tiers: [
        {
          tier: "premium",
          key: "top",
          name: "Top / Premium Tier",
          tagline: "Above Video-Mania on Home",
          dailyRate: topRate,
          description: "Highest visibility placement at the very top of Home feed",
        },
        {
          tier: "middle",
          key: "middle",
          name: "Middle Tier",
          tagline: "Mid-Feed & Category Module Pages",
          dailyRate: middleRate,
          description: "High visibility across mid-scroll and standard module pages",
        },
        {
          tier: "lower",
          key: "lower",
          name: "Lower Tier",
          tagline: "Lower Feed & Specialized Module Pages",
          dailyRate: lowerRate,
          description: "Budget-friendly exposure across niche and specialized modules",
        },
      ],
    });
  } catch (error) {
    console.error("getTierPrices error:", error);
    res.status(500).json({ statusCode: 500, message: "Internal server error", error });
  }
};

export const updateTierPrices = async (req, res) => {
  try {
    const {
      top_tier_daily_rate,
      middle_tier_daily_rate,
      lower_tier_daily_rate,
    } = req.body;

    const topNum = top_tier_daily_rate !== undefined ? parseFloat(top_tier_daily_rate) : null;
    const midNum = middle_tier_daily_rate !== undefined ? parseFloat(middle_tier_daily_rate) : null;
    const lowNum = lower_tier_daily_rate !== undefined ? parseFloat(lower_tier_daily_rate) : null;

    if ((topNum !== null && isNaN(topNum)) || (midNum !== null && isNaN(midNum)) || (lowNum !== null && isNaN(lowNum))) {
      return res.status(400).json({
        statusCode: 400,
        message: "Daily rates must be valid numbers.",
      });
    }

    const updateQuery = `
      UPDATE banner_configuration
      SET 
        top_tier_daily_rate = COALESCE($1, top_tier_daily_rate),
        middle_tier_daily_rate = COALESCE($2, middle_tier_daily_rate),
        lower_tier_daily_rate = COALESCE($3, lower_tier_daily_rate),
        top_banner_cost = COALESCE($1, top_banner_cost),
        cost = COALESCE($2, cost),
        updated_at = NOW()
      RETURNING *;
    `;
    const result = await pool.query(updateQuery, [topNum, midNum, lowNum]);

    return res.status(200).json({
      statusCode: 200,
      message: "Banner tier daily rates updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("updateTierPrices error:", error);
    res.status(500).json({ statusCode: 500, message: "Internal server error", error });
  }
};

export const updateConfig = async (req, res) => {
  try {
    const {
      id,
      description,
      length,
      width,
      cost,
      top_banner_cost = 0,
      top_tier_daily_rate,
      middle_tier_daily_rate,
      lower_tier_daily_rate,
    } = req.body;

    // Check if the record with the specified id exists
    const existingRecord = await pool.query(
      "SELECT * FROM banner_configuration WHERE id = $1",
      [id]
    );

    if (existingRecord.rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        message: "Banner configuration with the provided id not found",
      });
    }

    const finalTopRate = top_tier_daily_rate !== undefined ? parseFloat(top_tier_daily_rate) : (top_banner_cost !== undefined ? parseFloat(top_banner_cost) : existingRecord.rows[0].top_tier_daily_rate);
    const finalMidRate = middle_tier_daily_rate !== undefined ? parseFloat(middle_tier_daily_rate) : (cost !== undefined ? parseFloat(cost) : existingRecord.rows[0].middle_tier_daily_rate);
    const finalLowRate = lower_tier_daily_rate !== undefined ? parseFloat(lower_tier_daily_rate) : existingRecord.rows[0].lower_tier_daily_rate;

    // Update the existing record
    const updateQuery = `
        UPDATE banner_configuration
        SET description = $2, length = $3, width = $4, cost = $5, top_banner_cost = $6,
            top_tier_daily_rate = $7, middle_tier_daily_rate = $8, lower_tier_daily_rate = $9,
            updated_at=NOW()
        WHERE id = $1
        RETURNING *`;

    const updateResult = await pool.query(updateQuery, [
      id,
      description,
      length,
      width,
      cost || finalMidRate,
      top_banner_cost || finalTopRate,
      finalTopRate,
      finalMidRate,
      finalLowRate,
    ]);

    if (updateResult.rowCount === 1) {
      return res.status(200).json({
        statusCode: 200,
        message: "Banner configuration updated successfully",
        data: updateResult.rows[0],
      });
    } else {
      res.status(400).json({ statusCode: 400, message: "Update failed" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const deleteAllCategory = async (req, res) => {
  try {
    // Perform a query to delete all users from the database
    const query = "DELETE FROM disc_category RETURNING *";
    const { rows } = await pool.query(query);

    if (rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        message: "No category found to delete",
      });
    }

    res.status(200).json({
      statusCode: 200,
      message: "All categories deleted successfully",
      deletedCategories: rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};
export const searchCategories = async (req, res) => {
  try {
    const { name } = req.query;

    // Validate that name is provided
    if (!name || typeof name !== 'string') {
      return res.status(200).json({ statusCode: 200, Suppliers: [] });
    }

    // Split the search query into individual words
    const searchWords = name.split(/\s+/).filter(Boolean).map(safeSearchWord);

    if (searchWords.length === 0) {
      return res.status(200).json({ statusCode: 200, Suppliers: [] });
    }

    // Create an array of conditions for each search word
    const conditions = searchWords.map((word) => {
      return `(name ILIKE '%${word}%')`;
    });

    const userQuery = `SELECT
    *
    FROM
    disc_category
   
    WHERE ${conditions.join(" OR ")}
    ORDER BY created_at DESC;
    `;
    const { rows } = await pool.query(userQuery);
    return res
      .status(200)
      .json({ statusCode: 200, totalResults: rows.length, Categories: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
