import express from "express";
import { requireUser, optionalUser } from "../Middleware/auth.js";
import { commentCreateGuard } from "../Middleware/commentGuard.js";
import { attachCommentRoutes } from "./commentRoutes.js";
import {
  sendMondonComment,
  getAllCommentsByMondonMarket,
  likeUnlikeMondonMarket,
  getAllLikesByMondonMarket,
} from "../Controllers/mondonMarketController.js";

const router = express.Router();

router.post("/comment", requireUser, commentCreateGuard("mondon_market_comment"), sendMondonComment);
attachCommentRoutes(router, "mondonMarket");
router.get("/comments/:id", optionalUser, getAllCommentsByMondonMarket);
router.post("/likeUnlike", likeUnlikeMondonMarket);
router.get("/likes/:id", getAllLikesByMondonMarket);

export default router;
