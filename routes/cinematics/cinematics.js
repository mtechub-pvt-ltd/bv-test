import { Router } from "express";
import { requireUser, optionalUser } from "../../Middleware/auth.js";
import { commentCreateGuard } from "../../Middleware/commentGuard.js";
import { attachCommentRoutes } from "../commentRoutes.js";
import {
  create,
  update,
  deleteVideo,
  deleteAllVideos,
  addComment,
  getComments,
  
  getSubcategoriesWithVideosByCategory,
  getVideosByUserId,
  toggleLikeVideo,
  searchVideosByTitle,
  getLikes,
  getTotal,
  getSpecificCinematic,
} from "../../Controllers/cinematics/cinematicController.js";
import { verification } from "../../Middleware/Verification.js";

const cinematicsRoute = Router();

cinematicsRoute.get("/getSpecificCinematic/:id", getSpecificCinematic);
cinematicsRoute.post("/create", create);
cinematicsRoute.put("/update", update);
cinematicsRoute.delete("/delete/:id", deleteVideo);
cinematicsRoute.delete("/deleteAll", deleteAllVideos);
cinematicsRoute.get(
  "/getByCategory/:category_id",

  getSubcategoriesWithVideosByCategory
);
cinematicsRoute.get("/getByUserId/:user_id", getVideosByUserId);
cinematicsRoute.get("/searchByTitle", searchVideosByTitle);

cinematicsRoute.post("/toggleLikeVideo", toggleLikeVideo);
cinematicsRoute.get("/all-likes/:video_id", getLikes);
// comments
cinematicsRoute.post("/addComment", requireUser, commentCreateGuard("cinematics_video_comment"), addComment);
cinematicsRoute.post("/sendComment", requireUser, commentCreateGuard("cinematics_video_comment"), addComment);
attachCommentRoutes(cinematicsRoute, "cinematics");
cinematicsRoute.get("/getComments/:video_id", optionalUser, getComments);

cinematicsRoute.get("/getTotal", getTotal);

export default cinematicsRoute;
