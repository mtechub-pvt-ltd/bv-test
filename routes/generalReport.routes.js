import { Router } from "express";
import {
  createGeneralReport,
  getAllGeneralReports,
  getGeneralReportById,
  updateGeneralReportStatus,
  deleteGeneralReport,
  getMyGeneralReports,
  getReportStats,
  adminListComments,
  adminSetCommentVisibility,
  adminDeleteComment,
} from "../Controllers/generalReportController.js";
import { requireUser, requireAdmin } from "../Middleware/auth.js";

const generalReportRoute = Router();

// ── Users (login required; the reporter is always the logged in user) ─────────
generalReportRoute.post("/", requireUser, createGeneralReport);
generalReportRoute.get("/my/:user_id", requireUser, getMyGeneralReports);

// ── Admin only ───────────────────────────────────────────────────────────────
// (declared before "/:id" so "admin" is not read as a report id)
generalReportRoute.get("/admin/stats", requireAdmin, getReportStats);
generalReportRoute.get("/admin/comments", requireAdmin, adminListComments);
generalReportRoute.patch("/admin/comments/:module/:commentId/visibility", requireAdmin, adminSetCommentVisibility);
generalReportRoute.delete("/admin/comments/:module/:commentId", requireAdmin, adminDeleteComment);

generalReportRoute.get("/", requireAdmin, getAllGeneralReports);
generalReportRoute.get("/:id", requireAdmin, getGeneralReportById);
// approve = hide the comment for everyone, reject = keep it visible
generalReportRoute.patch("/:id/status", requireAdmin, updateGeneralReportStatus);
generalReportRoute.delete("/:id", requireAdmin, deleteGeneralReport);

export default generalReportRoute;
