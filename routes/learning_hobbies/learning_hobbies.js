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
  getLearningAndHobbiesLikes,
  getTotal,
  getSpecificLearningHobbies,
} from "../../Controllers/learning_hobbies/learningHobbiesController.js";
import { verification } from "../../Middleware/Verification.js";

const fanStarRoute = Router();

fanStarRoute.get("/getSpecificLearningHobbies/:id", getSpecificLearningHobbies);
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
fanStarRoute.get(
  "/all-likes/:video_id",

  getLearningAndHobbiesLikes
);
// comments
fanStarRoute.post("/addComment", requireUser, commentCreateGuard("learning_hobbies_video_comment"), addComment);
fanStarRoute.post("/sendComment", requireUser, commentCreateGuard("learning_hobbies_video_comment"), addComment);
attachCommentRoutes(fanStarRoute, "learningHobbies");
fanStarRoute.get("/getComments/:video_id", optionalUser, getComments);

fanStarRoute.get("/getTotal", getTotal);

export default fanStarRoute;
