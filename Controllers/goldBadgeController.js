import pool from "../db.config/index.js";
import {
  sendSuccessResponse,
  sendErrorResponse,
} from "./payments/util.js";

/**
 * User submits or re-submits a Gold Badge Business Verification Application
 */
export const applyForGoldBadge = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return sendErrorResponse(res, 401, "AUTH_REQUIRED", "Authentication required");
    }

    const {
      business_name,
      entity_type,
      official_website,
      registration_document_url,
      business_license_url,
      media_coverage_urls = [],
    } = req.body || {};

    if (!business_name || !business_name.trim()) {
      return sendErrorResponse(res, 400, "MISSING_FIELD", "Business name is required.");
    }
    if (!entity_type || !entity_type.trim()) {
      return sendErrorResponse(res, 400, "MISSING_FIELD", "Entity type is required.");
    }

    const mediaJson = Array.isArray(media_coverage_urls)
      ? JSON.stringify(media_coverage_urls)
      : typeof media_coverage_urls === "string"
      ? media_coverage_urls
      : JSON.stringify([]);

    // Check if an application already exists for this user
    const existingRes = await pool.query(
      `SELECT * FROM gold_badge_applications WHERE user_id = $1 ORDER BY id DESC LIMIT 1`,
      [userId]
    );

    let application = null;
    if (existingRes.rows && existingRes.rows.length > 0) {
      const current = existingRes.rows[0];
      if (current.status === "approved") {
        return sendSuccessResponse(res, "Business verification is already approved.", {
          application: current,
        });
      }

      // Update existing application back to 'pending'
      const updateQuery = `
        UPDATE gold_badge_applications
        SET
          business_name = $1,
          entity_type = $2,
          official_website = $3,
          registration_document_url = $4,
          business_license_url = $5,
          media_coverage_urls = $6::jsonb,
          status = 'pending',
          rejection_reason = NULL,
          updated_at = NOW()
        WHERE id = $7
        RETURNING *
      `;
      const updateParams = [
        business_name.trim(),
        entity_type.trim(),
        official_website ? official_website.trim() : null,
        registration_document_url ? registration_document_url.trim() : null,
        business_license_url ? business_license_url.trim() : null,
        mediaJson,
        current.id,
      ];
      const updateRes = await pool.query(updateQuery, updateParams);
      application = updateRes.rows[0];
    } else {
      // Insert new application
      const insertQuery = `
        INSERT INTO gold_badge_applications
        (user_id, business_name, entity_type, official_website, registration_document_url, business_license_url, media_coverage_urls, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, 'pending', NOW(), NOW())
        RETURNING *
      `;
      const insertParams = [
        userId,
        business_name.trim(),
        entity_type.trim(),
        official_website ? official_website.trim() : null,
        registration_document_url ? registration_document_url.trim() : null,
        business_license_url ? business_license_url.trim() : null,
        mediaJson,
      ];
      const insertRes = await pool.query(insertQuery, insertParams);
      application = insertRes.rows[0];
    }

    return sendSuccessResponse(res, "Gold Badge business verification application submitted successfully.", {
      application,
    });
  } catch (error) {
    console.error("applyForGoldBadge error:", error);
    return sendErrorResponse(res, 500, "SERVER_ERROR", error.message);
  }
};

/**
 * User checks their Gold Badge Business Verification Status
 */
export const getGoldBadgeStatus = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return sendErrorResponse(res, 401, "AUTH_REQUIRED", "Authentication required");
    }

    const appRes = await pool.query(
      `SELECT * FROM gold_badge_applications WHERE user_id = $1 ORDER BY id DESC LIMIT 1`,
      [userId]
    );

    if (!appRes.rows || appRes.rows.length === 0) {
      return sendSuccessResponse(res, "No Gold Badge application found", {
        status: "not_applied",
        is_approved: false,
        application: null,
      });
    }

    const application = appRes.rows[0];
    return sendSuccessResponse(res, "Gold Badge application status fetched successfully", {
      status: application.status,
      is_approved: application.status === "approved",
      application,
    });
  } catch (error) {
    console.error("getGoldBadgeStatus error:", error);
    return sendErrorResponse(res, 500, "SERVER_ERROR", error.message);
  }
};

/**
 * Admin lists all Gold Badge Business Applications
 */
export const adminGetGoldBadgeApplications = async (req, res) => {
  try {
    const { status = "all", search = "", page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    let whereConditions = [];
    let queryParams = [];
    let paramIdx = 1;

    if (status && status !== "all") {
      whereConditions.push(`a.status = $${paramIdx}`);
      queryParams.push(status);
      paramIdx++;
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      whereConditions.push(`(a.business_name ILIKE $${paramIdx} OR u.username ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx})`);
      queryParams.push(term);
      paramIdx++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM gold_badge_applications a
      JOIN users u ON a.user_id = u.id
      ${whereClause}
    `;
    const countRes = await pool.query(countQuery, queryParams);
    const total = countRes.rows[0]?.total || 0;

    const dataQuery = `
      SELECT
        a.*,
        u.username AS applicant_username,
        u.email AS applicant_email,
        u.image AS applicant_image,
        u.created_at AS applicant_joined_at,
        u.badge AS current_badge,
        (
          (SELECT COUNT(*)::int FROM item_report WHERE reported_user_id = u.id) +
          (SELECT COUNT(*)::int FROM reported_user WHERE reported_user_id = u.id)
        ) AS applicant_reports_count
      FROM gold_badge_applications a
      JOIN users u ON a.user_id = u.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;
    const dataRes = await pool.query(dataQuery, [...queryParams, limitNum, offset]);

    // Summary counts for tabs
    const summaryRes = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
        COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected
      FROM gold_badge_applications
    `);

    return sendSuccessResponse(res, "Gold Badge applications fetched successfully", {
      applications: dataRes.rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum) || 1,
      },
      summary: summaryRes.rows[0] || { total: 0, pending: 0, approved: 0, rejected: 0 },
    });
  } catch (error) {
    console.error("adminGetGoldBadgeApplications error:", error);
    return sendErrorResponse(res, 500, "SERVER_ERROR", error.message);
  }
};

/**
 * Admin gets detailed view of a single Gold Badge application
 */
export const adminGetGoldBadgeApplicationDetail = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return sendErrorResponse(res, 400, "MISSING_ID", "Application ID is required");
    }

    const detailQuery = `
      SELECT
        a.*,
        u.username AS applicant_username,
        u.email AS applicant_email,
        u.image AS applicant_image,
        u.created_at AS applicant_joined_at,
        u.badge AS current_badge,
        u.is_subscribed AS current_is_subscribed,
        u.block AS applicant_is_blocked
      FROM gold_badge_applications a
      JOIN users u ON a.user_id = u.id
      WHERE a.id = $1
    `;
    const detailRes = await pool.query(detailQuery, [id]);

    if (!detailRes.rows || detailRes.rows.length === 0) {
      return sendErrorResponse(res, 440, "NOT_FOUND", "Gold Badge application not found");
    }

    return sendSuccessResponse(res, "Gold Badge application details fetched", {
      application: detailRes.rows[0],
    });
  } catch (error) {
    console.error("adminGetGoldBadgeApplicationDetail error:", error);
    return sendErrorResponse(res, 500, "SERVER_ERROR", error.message);
  }
};

/**
 * Admin approves or rejects a Gold Badge Business Application
 */
export const adminReviewGoldBadgeApplication = async (req, res) => {
  try {
    const adminId = req.user?.userId;
    const { id } = req.params;
    const { status, rejection_reason } = req.body || {};

    if (!id) {
      return sendErrorResponse(res, 400, "MISSING_ID", "Application ID is required");
    }
    if (!["approved", "rejected"].includes(status)) {
      return sendErrorResponse(res, 400, "INVALID_STATUS", "Status must be 'approved' or 'rejected'");
    }
    if (status === "rejected" && (!rejection_reason || !rejection_reason.trim())) {
      return sendErrorResponse(res, 400, "MISSING_REASON", "Rejection reason is required when rejecting an application.");
    }

    const updateQuery = `
      UPDATE gold_badge_applications
      SET
        status = $1,
        rejection_reason = $2,
        reviewed_by = $3,
        reviewed_at = NOW(),
        updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `;
    const updateRes = await pool.query(updateQuery, [
      status,
      status === "rejected" ? rejection_reason.trim() : null,
      adminId || null,
      id,
    ]);

    if (!updateRes.rows || updateRes.rows.length === 0) {
      return sendErrorResponse(res, 404, "NOT_FOUND", "Gold Badge application not found");
    }

    const updatedApp = updateRes.rows[0];

    // Grant or revoke Gold Badge on users table depending on admin approval status
    if (status === "approved") {
      const userRes = await pool.query(
        `SELECT id, badge_subscription_key FROM users WHERE id = $1`,
        [updatedApp.user_id]
      );
      const userRow = userRes.rows[0];
      const goldKey = userRow?.badge_subscription_key || "gold_premium";
      await pool.query(
        `UPDATE users SET badge = $1 WHERE id = $2`,
        [goldKey, updatedApp.user_id]
      );
    } else if (status === "rejected") {
      await pool.query(
        `UPDATE users 
         SET badge = CASE WHEN badge ILIKE '%gold%' THEN NULL ELSE badge END,
             badge_subscription_key = CASE WHEN badge_subscription_key ILIKE '%gold%' THEN NULL ELSE badge_subscription_key END
         WHERE id = $1`,
        [updatedApp.user_id]
      );
    }

    const message = status === "approved"
      ? "Gold Badge application approved successfully!"
      : "Gold Badge application rejected.";

    return sendSuccessResponse(res, message, {
      application: updatedApp,
    });
  } catch (error) {
    console.error("adminReviewGoldBadgeApplication error:", error);
    return sendErrorResponse(res, 500, "SERVER_ERROR", error.message);
  }
};
