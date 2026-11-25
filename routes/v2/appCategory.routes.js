import express from "express";
import { getAllAppCategoriesV2 } from "../../Controllers/v2/appCategoryController.js";

const router = express.Router();

router.get("/categories/all", getAllAppCategoriesV2);

export default router;
