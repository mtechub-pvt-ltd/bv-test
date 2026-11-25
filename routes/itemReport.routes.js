import { Router } from "express";
import {
    createItemReport,
    getAllItemReports,
    getItemReportById,
    updateItemReportStatus,
    getMyItemReports,
    deleteItemReport,
    getDashboardReportStats,
} from "../Controllers/itemReportController.js";

const router = Router();

// User: submit a new item report
router.post("/", createItemReport);

// User: get all reports submitted by a specific user
router.get("/my/:user_id", getMyItemReports);

// Admin: dashboard report statistics
router.get("/dashboard/stats", getDashboardReportStats);

// Admin: get all reports (supports ?status=&module_type=&page=&limit=)
router.get("/", getAllItemReports);

// Admin: get a single report by id
router.get("/:id", getItemReportById);

// Admin: update status (take action) on a report
router.patch("/:id/status", updateItemReportStatus);

// Admin: delete a report
router.delete("/:id", deleteItemReport);

export default router;
