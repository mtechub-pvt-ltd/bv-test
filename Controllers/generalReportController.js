import pool from "../db.config/index.js";
import {
  COMMENT_MODULES,
  COMMENT_TABLES,
  getCommentTableName,
  toSafeInt,
} from "../utils/commentModules.js";
import { getAdminUserIds, removeComment } from "../utils/commentService.js";
import { notifyUser } from "../utils/notificationService.js";

const ALLOWED_STATUSES = new Set(["pending", "approved", "rejected"]);
const MAX_PAGE_SIZE = 100;

const fail = (res, status, message) => res.status(status).json({ statusCode: status, success: false, message });

const readPaging = (req, defaultLimit = 20) => {
  const page = Math.max(1, toSafeInt(req.query.page) || 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, toSafeInt(req.query.limit) || defaultLimit));
  return { page, limit, offset: (page - 1) * limit };
};

/** Never lets a failing notification break the moderation action itself. */
const safeNotify = async (payload) => {
  try {
    await notifyUser(payload);
  } catch (err) {
    console.error("[report] notification failed:", err.message);
  }
};

const labelOf = (table) => COMMENT_MODULES[table]?.label || "a post";

/** Column holding a post's display title, per post table (everything else uses `name`). */
const POST_TITLE_EXPR = {
  item: "p.title",
  post_letters: "p.subject_place",
};

/**
 * Tells the admin WHERE a comment lives. For every comment (needs comment_table, post_id,
 * parent_comment_id) it attaches:
 *   post   -> { id, title, owner_username, owner_image, missing }
 *   parent -> for replies: { id, comment, author_username, author_image, is_deleted, is_hidden }
 * One query per table, never one per comment. A failure only drops the extra context.
 */
const attachCommentContext = async (comments) => {
  const list = comments.filter((c) => c && c.comment_table && COMMENT_MODULES[c.comment_table]);
  if (list.length === 0) return comments;

  const postIds = new Map(); // postTable -> Set(id)
  const parentIds = new Map(); // commentTable -> Set(id)
  const add = (map, key, id) => {
    if (!key || !id) return;
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(Number(id));
  };
  const postTableOf = (c) => COMMENT_MODULES[c.comment_table].postTable;
  list.forEach((c) => {
    add(postIds, postTableOf(c), c.post_id);
    add(parentIds, c.comment_table, c.parent_comment_id);
  });

  const posts = new Map(); // `${table}:${id}`
  for (const [table, ids] of postIds) {
    const title = POST_TITLE_EXPR[table] || "p.name";
    const fallback = `NULLIF(LEFT(p.description, 80), '')`;
    try {
      const { rows } = await pool.query(
        `SELECT p.id, COALESCE(NULLIF(TRIM(${title}), ''), ${fallback}) AS title,
                u.username AS owner_username, u.image AS owner_image
           FROM public.${table} p LEFT JOIN public.users u ON u.id = p.user_id
          WHERE p.id = ANY($1::int[])`,
        [[...ids]]
      );
      rows.forEach((r) => posts.set(`${table}:${r.id}`, r));
    } catch (err) {
      console.error(`attachCommentContext post(${table}) failed:`, err.message);
    }
  }

  const parents = new Map(); // `${table}:${id}`
  for (const [table, ids] of parentIds) {
    try {
      const { rows } = await pool.query(
        `SELECT c.id, c.comment, c.is_deleted, c.is_hidden,
                u.username AS author_username, u.image AS author_image
           FROM public.${table} c LEFT JOIN public.users u ON u.id = c.user_id
          WHERE c.id = ANY($1::int[])`,
        [[...ids]]
      );
      rows.forEach((r) => parents.set(`${table}:${r.id}`, r));
    } catch (err) {
      console.error(`attachCommentContext parent(${table}) failed:`, err.message);
    }
  }

  list.forEach((c) => {
    const found = posts.get(`${postTableOf(c)}:${c.post_id}`);
    c.post = found
      ? { ...found, missing: false }
      : { id: c.post_id ?? null, title: null, owner_username: null, owner_image: null, missing: true };
    c.parent = c.parent_comment_id ? parents.get(`${c.comment_table}:${c.parent_comment_id}`) || { id: c.parent_comment_id, missing: true } : null;
  });
  return comments;
};

/**
 * Loads the reported comments for a list of reports (one query per comment table,
 * not one per report) and attaches `target_details` + `module_label` + `post_id`.
 */
const attachCommentDetails = async (reports) => {
  const byTable = new Map();
  reports.forEach((r) => {
    if (r.type !== "comment") return;
    const table = getCommentTableName(r.module_type);
    r.comment_table = table;
    r.module_label = table ? labelOf(table) : r.module_type;
    if (!table) return;
    if (!byTable.has(table)) byTable.set(table, new Set());
    byTable.get(table).add(Number(r.target_id));
  });

  const found = new Map(); // `${table}:${id}` -> row
  for (const [table, ids] of byTable) {
    const meta = COMMENT_MODULES[table];
    const postExpr = `c.${meta.postColumn}`;
    try {
      const { rows } = await pool.query(
        `SELECT c.id, c.comment, c.user_id, c.is_hidden, c.is_deleted, c.is_edited, c.created_at,
                c.parent_comment_id, ${postExpr} AS post_id,
                u.username AS author_username, u.image AS author_image
           FROM public.${table} c
           LEFT JOIN public.users u ON u.id = c.user_id
          WHERE c.id = ANY($1::int[])`,
        [[...ids]]
      );
      rows.forEach((row) => found.set(`${table}:${row.id}`, row));
    } catch (err) {
      console.error(`attachCommentDetails(${table}) failed:`, err.message);
    }
  }

  reports.forEach((r) => {
    if (r.type !== "comment") {
      r.target_details = null;
      return;
    }
    r.target_details = found.get(`${r.comment_table}:${r.target_id}`) || null;
    r.target_removed = r.target_details === null; // comment no longer exists (deleted by its author)
    if (r.target_details) r.target_details.comment_table = r.comment_table;
  });
  await attachCommentContext(reports.map((r) => r.target_details).filter(Boolean));
  return reports;
};

const REPORT_SELECT = `
  SELECT gr.*,
         reporter.username AS reporter_username, reporter.image AS reporter_image,
         reported.username AS reported_username, reported.image AS reported_image,
         reviewer.username AS reviewed_by_username
    FROM general_report gr
    LEFT JOIN users reporter ON gr.reporter_user_id = reporter.id
    LEFT JOIN users reported ON gr.reported_user_id = reported.id
    LEFT JOIN users reviewer ON gr.reviewed_by = reviewer.id`;

/* ------------------------------------------------------------------ */
/* User: submit a report                                               */
/* ------------------------------------------------------------------ */
export const createGeneralReport = async (req, res) => {
  try {
    const type = String(req.body.type || "comment").toLowerCase().trim();
    if (type !== "comment") return fail(res, 400, "Only comment reports are supported here");

    const rawModule = req.body.module_type || req.body.module || req.body.moduletype;
    const table = getCommentTableName(rawModule);
    if (!table) return fail(res, 400, `Invalid comment module '${rawModule ?? ""}'`);

    const targetId = toSafeInt(req.body.target_id ?? req.body.comment_id ?? req.body.commentId ?? req.body.item_id);
    if (targetId === null) return fail(res, 400, "A valid comment id is required");

    const reason = typeof req.body.reason === "string" ? req.body.reason.trim() : "";
    if (!reason) return fail(res, 400, "Please select a reason for your report");
    const details = typeof req.body.details === "string" && req.body.details.trim() ? req.body.details.trim().slice(0, 1000) : null;

    // reporter = the logged in user (a reporter id in the body is ignored)
    const reporterId = req.authUser.id;

    const found = await pool.query(
      `SELECT c.id, c.user_id, c.is_hidden, c.is_deleted, u.username AS author_username
         FROM public.${table} c LEFT JOIN public.users u ON u.id = c.user_id
        WHERE c.id = $1`,
      [targetId]
    );
    if (found.rowCount === 0) return fail(res, 404, "This comment no longer exists");
    const comment = found.rows[0];
    if (comment.is_deleted || comment.is_hidden) return fail(res, 400, "This comment is already removed");
    if (Number(comment.user_id) === reporterId) return fail(res, 400, "You cannot report your own comment");

    const inserted = await pool.query(
      `INSERT INTO general_report (type, module_type, target_id, reporter_user_id, reported_user_id, reason, details, status)
       VALUES ('comment', $1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [COMMENT_MODULES[table].key, targetId, reporterId, comment.user_id, reason, details]
    );
    const report = inserted.rows[0];

    // Tell every admin (in-app notification + push). Fire and forget.
    (async () => {
      try {
        const adminIds = await getAdminUserIds();
        const reporterName = req.authUser.username || "A user";
        const authorName = comment.author_username || "a user";
        await Promise.all(
          adminIds.map((adminId) =>
            safeNotify({
              sender_id: reporterId,
              receiver_id: adminId,
              title: "New comment report",
              body: `${reporterName} reported a comment by ${authorName} in ${labelOf(table)}: ${reason}`,
              moduletype: "general_report",
              item_id: String(report.id),
              action: "comment_report",
            })
          )
        );
      } catch (err) {
        console.error("[report] admin notification failed:", err.message);
      }
    })();

    return res.status(201).json({
      statusCode: 201,
      success: true,
      message: "Report submitted successfully",
      data: report,
    });
  } catch (err) {
    console.error("createGeneralReport error:", err);
    return fail(res, 500, "Could not submit your report. Please try again");
  }
};

/* ------------------------------------------------------------------ */
/* Admin: list / view reports                                          */
/* ------------------------------------------------------------------ */
export const getAllGeneralReports = async (req, res) => {
  try {
    const { page, limit, offset } = readPaging(req);
    const params = [];
    const conditions = [];

    const type = String(req.query.type || "comment").toLowerCase().trim();
    params.push(type);
    conditions.push(`gr.type = $${params.length}`);

    const status = String(req.query.status || "").toLowerCase().trim();
    if (status && ALLOWED_STATUSES.has(status)) {
      params.push(status);
      conditions.push(`gr.status = $${params.length}`);
    }
    if (req.query.module_type) {
      const t = getCommentTableName(req.query.module_type);
      // reports store the canonical module key, but older rows used other spellings
      params.push(t ? COMMENT_MODULES[t].key : String(req.query.module_type));
      conditions.push(`gr.module_type ILIKE $${params.length}`);
    }
    const search = String(req.query.search || "").trim();
    if (search) {
      params.push(`%${search}%`);
      const i = params.length;
      conditions.push(`(reporter.username ILIKE $${i} OR reported.username ILIKE $${i} OR gr.reason ILIKE $${i})`);
    }
    const where = `WHERE ${conditions.join(" AND ")}`;

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS n FROM general_report gr
         LEFT JOIN users reporter ON gr.reporter_user_id = reporter.id
         LEFT JOIN users reported ON gr.reported_user_id = reported.id ${where}`,
      params
    );
    const total = countRes.rows[0].n;

    const dataParams = [...params, limit, offset];
    const { rows } = await pool.query(
      `${REPORT_SELECT} ${where}
        ORDER BY (gr.status = 'pending') DESC, gr.created_at DESC
        LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );
    await attachCommentDetails(rows);

    return res.status(200).json({ statusCode: 200, success: true, data: rows, page, limit, total });
  } catch (err) {
    console.error("getAllGeneralReports error:", err);
    return fail(res, 500, "Internal server error");
  }
};

export const getGeneralReportById = async (req, res) => {
  try {
    const id = toSafeInt(req.params.id);
    if (id === null) return fail(res, 400, "Invalid report id");
    const { rows } = await pool.query(`${REPORT_SELECT} WHERE gr.id = $1`, [id]);
    if (rows.length === 0) return fail(res, 404, "Report not found");
    await attachCommentDetails(rows);
    return res.status(200).json({ statusCode: 200, success: true, data: rows[0] });
  } catch (err) {
    console.error("getGeneralReportById error:", err);
    return fail(res, 500, "Internal server error");
  }
};

/** Numbers for the admin bell / badge. */
export const getReportStats = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT status, COUNT(*)::int AS n FROM general_report WHERE type = 'comment' GROUP BY status`
    );
    const counts = { pending: 0, approved: 0, rejected: 0 };
    rows.forEach((r) => {
      if (counts[r.status] !== undefined) counts[r.status] = r.n;
    });
    return res.status(200).json({
      statusCode: 200,
      success: true,
      data: { ...counts, total: counts.pending + counts.approved + counts.rejected },
    });
  } catch (err) {
    console.error("getReportStats error:", err);
    return fail(res, 500, "Internal server error");
  }
};

/* ------------------------------------------------------------------ */
/* Admin: act on a report (approve = hide the comment, reject = keep)  */
/* ------------------------------------------------------------------ */
export const updateGeneralReportStatus = async (req, res) => {
  const id = toSafeInt(req.params.id);
  if (id === null) return fail(res, 400, "Invalid report id");
  const status = String(req.body?.status || "").toLowerCase().trim();
  if (!ALLOWED_STATUSES.has(status)) {
    return fail(res, 400, `Invalid status. Allowed values: ${[...ALLOWED_STATUSES].join(", ")}`);
  }
  const adminNote = typeof req.body?.admin_note === "string" && req.body.admin_note.trim()
    ? req.body.admin_note.trim().slice(0, 1000)
    : null;
  const adminId = req.authUser.id;

  const client = await pool.connect();
  let notifications = [];
  let responseReport;
  try {
    await client.query("BEGIN");

    const before = await client.query("SELECT * FROM general_report WHERE id = $1 FOR UPDATE", [id]);
    if (before.rowCount === 0) {
      await client.query("ROLLBACK");
      return fail(res, 404, "Report not found");
    }
    const previous = before.rows[0];

    const updated = await client.query(
      `UPDATE general_report
          SET status = $1, updated_at = NOW(), reviewed_by = $2, reviewed_at = NOW(),
              admin_note = COALESCE($3, admin_note)
        WHERE id = $4 RETURNING *`,
      [status, adminId, adminNote, id]
    );
    const report = updated.rows[0];
    responseReport = report;

    if (report.type === "comment") {
      const table = getCommentTableName(report.module_type);
      if (table) {
        // All reports about the same comment (any spelling of the module name).
        const siblingsRes = await client.query(
          "SELECT id, module_type, status, reporter_user_id FROM general_report WHERE type = 'comment' AND target_id = $1 AND id <> $2",
          [report.target_id, id]
        );
        const siblings = siblingsRes.rows.filter((s) => getCommentTableName(s.module_type) === table);

        if (status === "approved") {
          await client.query(`UPDATE public.${table} SET is_hidden = TRUE, updated_at = NOW() WHERE id = $1`, [report.target_id]);
          // other open reports about this comment are settled by the same decision
          const pendingSiblings = siblings.filter((s) => s.status === "pending");
          if (pendingSiblings.length > 0) {
            await client.query(
              `UPDATE general_report SET status = 'approved', updated_at = NOW(), reviewed_by = $1, reviewed_at = NOW()
                WHERE id = ANY($2::int[])`,
              [adminId, pendingSiblings.map((s) => s.id)]
            );
          }
          notifications = [
            ...[previous, ...pendingSiblings]
              .filter((r) => r.status !== "approved")
              .map((r) => ({
                receiver_id: r.reporter_user_id ?? r.reporter_id,
                title: "Your report was reviewed",
                body: "Thanks for your report. The comment has been removed.",
              })),
          ];
          if (previous.status !== "approved" && report.reported_user_id) {
            notifications.push({
              receiver_id: report.reported_user_id,
              title: "Your comment was removed",
              body: "A moderator removed your comment because it violated the community guidelines.",
              action: "comment_removed",
            });
          }
        } else {
          // rejected / back to pending: show the comment again, unless another approved report still hides it
          const stillApproved = siblings.some((s) => s.status === "approved");
          if (!stillApproved) {
            await client.query(`UPDATE public.${table} SET is_hidden = FALSE, updated_at = NOW() WHERE id = $1`, [report.target_id]);
          }
          if (status === "rejected" && previous.status !== "rejected") {
            notifications.push({
              receiver_id: report.reporter_user_id,
              title: "Your report was reviewed",
              body: "We reviewed your report and found that the comment does not break our guidelines.",
            });
          }
        }
      }
    }

    await client.query("COMMIT");
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    console.error("updateGeneralReportStatus error:", err);
    return fail(res, 500, "Could not update the report. Please try again");
  } finally {
    client.release();
  }

  // Outcome messages are sent after the decision is saved; they can never undo it.
  notifications.forEach((n) =>
    safeNotify({
      sender_id: adminId,
      receiver_id: n.receiver_id,
      title: n.title,
      body: n.body,
      moduletype: "general_report",
      item_id: String(responseReport.id),
      action: n.action || "report_update",
    })
  );

  return res.status(200).json({
    statusCode: 200,
    success: true,
    message:
      status === "approved"
        ? "Report approved. The comment is now hidden for everyone."
        : status === "rejected"
        ? "Report rejected. The comment stays visible."
        : "Report set back to pending.",
    data: responseReport,
  });
};

export const deleteGeneralReport = async (req, res) => {
  try {
    const id = toSafeInt(req.params.id);
    if (id === null) return fail(res, 400, "Invalid report id");
    const { rows } = await pool.query("DELETE FROM general_report WHERE id = $1 RETURNING id", [id]);
    if (rows.length === 0) return fail(res, 404, "Report not found");
    return res.status(200).json({ statusCode: 200, success: true, message: "Report deleted successfully" });
  } catch (err) {
    console.error("deleteGeneralReport error:", err);
    return fail(res, 500, "Internal server error");
  }
};

/** A user's own reports. A user can only read their own. */
export const getMyGeneralReports = async (req, res) => {
  try {
    const requested = toSafeInt(req.params.user_id);
    if (requested === null || requested !== req.authUser.id) {
      return fail(res, 403, "You can only view your own reports");
    }
    const { page, limit, offset } = readPaging(req);
    const { rows } = await pool.query(
      `SELECT gr.*, reported.username AS reported_username, reported.image AS reported_image
         FROM general_report gr
         LEFT JOIN users reported ON gr.reported_user_id = reported.id
        WHERE gr.reporter_user_id = $1
        ORDER BY gr.created_at DESC
        LIMIT $2 OFFSET $3`,
      [requested, limit, offset]
    );
    return res.status(200).json({ statusCode: 200, success: true, data: rows, page, limit });
  } catch (err) {
    console.error("getMyGeneralReports error:", err);
    return fail(res, 500, "Internal server error");
  }
};

/* ------------------------------------------------------------------ */
/* Admin: browse / hide / delete any comment directly                  */
/* ------------------------------------------------------------------ */

/** Search all comments of all modules: ?module=&state=visible|hidden|deleted&search=&page=&limit= */
export const adminListComments = async (req, res) => {
  try {
    const { page, limit, offset } = readPaging(req);
    const moduleFilter = req.query.module ? getCommentTableName(req.query.module) : null;
    if (req.query.module && !moduleFilter) return fail(res, 400, "Unknown module");
    const tables = moduleFilter ? [moduleFilter] : COMMENT_TABLES;

    const union = tables
      .map((t) => {
        const m = COMMENT_MODULES[t];
        const post = `c.${m.postColumn}`;
        return `SELECT '${t}'::text AS comment_table, c.id, c.user_id, c.comment, c.created_at, c.is_hidden, c.is_deleted,
                       c.is_edited, c.parent_comment_id, ${post} AS post_id
                FROM public.${t} c`;
      })
      .join(" UNION ALL ");

    const params = [];
    const conditions = [];
    const state = String(req.query.state || "").toLowerCase();
    if (state === "hidden") conditions.push("a.is_hidden = TRUE");
    else if (state === "deleted") conditions.push("a.is_deleted = TRUE");
    else if (state === "visible") conditions.push("a.is_hidden = FALSE AND a.is_deleted = FALSE");
    const search = String(req.query.search || "").trim();
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(a.comment ILIKE $${params.length} OR u.username ILIKE $${params.length})`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const total = (
      await pool.query(
        `SELECT COUNT(*)::int AS n FROM (${union}) a LEFT JOIN public.users u ON u.id = a.user_id ${where}`,
        params
      )
    ).rows[0].n;

    const dataParams = [...params, limit, offset];
    const { rows } = await pool.query(
      `SELECT a.*, u.username AS author_username, u.image AS author_image
         FROM (${union}) a LEFT JOIN public.users u ON u.id = a.user_id
         ${where}
        ORDER BY a.created_at DESC, a.id DESC
        LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );
    const data = rows.map((r) => ({
      ...r,
      module: COMMENT_MODULES[r.comment_table].key,
      module_label: labelOf(r.comment_table),
    }));
    await attachCommentContext(data);
    return res.status(200).json({ statusCode: 200, success: true, data, page, limit, total });
  } catch (err) {
    console.error("adminListComments error:", err);
    return fail(res, 500, "Internal server error");
  }
};

const readAdminCommentTarget = (req, res) => {
  const table = getCommentTableName(req.params.module);
  if (!table) {
    fail(res, 400, "Unknown module");
    return null;
  }
  const commentId = toSafeInt(req.params.commentId);
  if (commentId === null) {
    fail(res, 400, "Invalid comment id");
    return null;
  }
  return { table, commentId };
};

/** Hide or restore a comment without a report: body { hidden: true|false } */
export const adminSetCommentVisibility = async (req, res) => {
  try {
    const target = readAdminCommentTarget(req, res);
    if (!target) return;
    if (typeof req.body?.hidden !== "boolean") return fail(res, 400, "hidden (true/false) is required");
    const { rows } = await pool.query(
      `UPDATE public.${target.table} SET is_hidden = $1, updated_at = NOW() WHERE id = $2 RETURNING id, user_id, is_hidden`,
      [req.body.hidden, target.commentId]
    );
    if (rows.length === 0) return fail(res, 404, "Comment not found");
    if (req.body.hidden) {
      safeNotify({
        sender_id: req.authUser.id,
        receiver_id: rows[0].user_id,
        title: "Your comment was removed",
        body: "A moderator removed your comment because it violated the community guidelines.",
        moduletype: "general_report",
        item_id: "",
        action: "comment_removed",
      });
    }
    return res.status(200).json({
      statusCode: 200,
      success: true,
      message: req.body.hidden ? "Comment hidden" : "Comment restored",
      data: rows[0],
    });
  } catch (err) {
    console.error("adminSetCommentVisibility error:", err);
    return fail(res, 500, "Internal server error");
  }
};

/** Delete any comment (a comment that has replies becomes a "deleted" placeholder). */
export const adminDeleteComment = async (req, res) => {
  try {
    const target = readAdminCommentTarget(req, res);
    if (!target) return;
    const owner = await pool.query(`SELECT user_id FROM public.${target.table} WHERE id = $1`, [target.commentId]);
    if (owner.rowCount === 0) return fail(res, 404, "Comment not found");
    const result = await removeComment(target.table, target.commentId);
    if (result.status === "not_found") return fail(res, 404, "Comment not found");
    if (result.status === "already_deleted") return fail(res, 400, "Comment already deleted");
    safeNotify({
      sender_id: req.authUser.id,
      receiver_id: owner.rows[0].user_id,
      title: "Your comment was removed",
      body: "A moderator removed your comment because it violated the community guidelines.",
      moduletype: "general_report",
      item_id: "",
      action: "comment_removed",
    });
    return res.status(200).json({
      statusCode: 200,
      success: true,
      message: result.soft ? "Comment removed. Replies to it were kept." : "Comment deleted",
      data: { commentId: target.commentId, soft: result.soft, deleted_ids: result.deletedIds },
    });
  } catch (err) {
    console.error("adminDeleteComment error:", err);
    return fail(res, 500, "Internal server error");
  }
};
