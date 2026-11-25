import { Router } from "express";
import { requireUser, optionalUser } from "../Middleware/auth.js";
import { commentCreateGuard } from "../Middleware/commentGuard.js";
import { attachCommentRoutes } from "./commentRoutes.js";
import { verification } from "../Middleware/Verification.js";
import { upload } from "../utils/ImageHandler.js";
import { UnlikePicTour } from "../Controllers/picTourController.js";
import { getAllCommentsByGEBC, getAllGEBCByUser, getAllGEBCs, getAllGEBCsByCategory, getAllLikesByGBEC, getSpecificGEBC, likeUnlikeGEBC, searchGEBCs, updateGEBC } from "../Controllers/gebcController.js";
import { createNews, deleteAllNews, deleteNews, getAllCommentsByNews, getAllLikesByNews, getAllNews, getAllNewsByCategory, getAllNewsByUser, getSpecificNews, likeUnlikeNews,  searchNews, sendComment, updateNews } from "../Controllers/newsController.js";
const newsRoute = Router();

newsRoute.post(
  "/createNews",

  // upload("newsImages").single("image"),
  createNews
);
newsRoute.delete("/deleteNews/:id", deleteNews);
newsRoute.put(
  "/updateNews",

  // upload("newsImages").single("image"),
  updateNews
);
newsRoute.get("/getAllNews", getAllNews);
newsRoute.get("/getAllNewsByUser/:id", getAllNewsByUser);
newsRoute.get("/getAllNewsByCategory/:id", getAllNewsByCategory);
newsRoute.get("/getSpecificNews/:id", getSpecificNews);
newsRoute.delete("/deleteAllNews", deleteAllNews);
//comment......................................
newsRoute.post("/sendComment", requireUser, commentCreateGuard("news_comment"), sendComment);
attachCommentRoutes(newsRoute, "news");
newsRoute.get("/getAllCommentsByNews/:id", optionalUser, getAllCommentsByNews);
///like...................................................
newsRoute.post("/likeUnlikeNews", likeUnlikeNews);
newsRoute.post("/UnlikePicTour", UnlikePicTour);
newsRoute.get("/getAllLikesByNews/:id", getAllLikesByNews);

newsRoute.get("/searchNews", searchNews);
export default newsRoute;
