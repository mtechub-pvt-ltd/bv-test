import express from "express";
import saveItemGeneralController from "../Controllers/saveItemGeneralController.js";

const router = express.Router();

// Toggle save/unsave
router.post("/toggle", saveItemGeneralController.toggleSaveGeneral);

// Get saved items for a module (query: user_id, module, main_category_id, page, limit)
router.get("/", saveItemGeneralController.getSavedByModule);

export default router;
