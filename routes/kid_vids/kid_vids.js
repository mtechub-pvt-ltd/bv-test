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
  getKidVidsLikes,
  getTotal,
  getSpecificKidVid,
} from "../../Controllers/kid_vids/kidVidsController.js";
import { verification } from "../../Middleware/Verification.js";

const fanStarRoute = Router();

fanStarRoute.get("/getSpecificKidVid/:id", getSpecificKidVid);
fanStarRoute.post("/create", create);
fanStarRoute.put("/update", update);
fanStarRoute.delete("/delete/:id", deleteVideo);
fanStarRoute.delete("/deleteAll", deleteAllVideos);
fanStarRoute.get(
  "/getByCategory/:category_id",

  getSubcategoriesWithVideosByCategory
);
fanStarRoute.get("/getByUserId/:user_id", getVideosByUserId);
fanStarRoute.get("/searchByTitle", searchVideosByTitle);

fanStarRoute.post("/toggleLikeVideo", toggleLikeVideo);
fanStarRoute.get("/all-likes/:video_id", getKidVidsLikes);

fanStarRoute.post("/addComment", requireUser, commentCreateGuard("kid_vids_video_comment"), addComment);
fanStarRoute.post("/sendComment", requireUser, commentCreateGuard("kid_vids_video_comment"), addComment);
attachCommentRoutes(fanStarRoute, "kidVids");
fanStarRoute.get("/getComments/:video_id", optionalUser, getComments);

fanStarRoute.get("/getTotal", getTotal);

export default fanStarRoute;

