import { Router } from "express";
import { requireUser, optionalUser } from "../Middleware/auth.js";
import { commentCreateGuard } from "../Middleware/commentGuard.js";
import { attachCommentRoutes } from "./commentRoutes.js";
import { verification } from "../Middleware/Verification.js";
import { upload } from "../utils/ImageHandler.js";
import { UnlikePicTour, createPicTour, deleteAllPicTours, deletePicTour, getAllCommentsByPicTours, getAllLikesByPicTour, getAllPicTour, getAllPicTourByCategory, getAllPicToursByUser, getAllRecentToursByCategory, getAllTrendingToursByCategory, getComentedTours, getMostViewedToursByCategory, getSpecificPicTour, likePicTour, likeUnlikePicTour, searchTour, sendComment, updatePicTour, viewTour } from "../Controllers/picTourController.js";
const picTourRoute = Router();

picTourRoute.post(
  "/createPicTour",

  upload("picTourImages").single("image"),
  createPicTour
);
picTourRoute.delete("/deletePicTour/:id", deletePicTour);
picTourRoute.put(
  "/updatePicTour",

  upload("picTourImages").single("image"),
  updatePicTour
);
picTourRoute.get("/getAllPicTours", getAllPicTour);
picTourRoute.get("/getAllPicToursByUser/:id", getAllPicToursByUser);
picTourRoute.get("/getAllRecentVideosByCategory/:id", getAllRecentToursByCategory);
picTourRoute.get("/getAllPicTourByCategory/:id", getAllPicTourByCategory);
picTourRoute.get("/getSpecificPicTour/:id", getSpecificPicTour);
picTourRoute.delete("/deleteAllPicTours", deleteAllPicTours);
//comment......................................
picTourRoute.post("/sendComment", requireUser, commentCreateGuard("pic_comment"), sendComment);
attachCommentRoutes(picTourRoute, "picTour");
picTourRoute.get("/getAllCommentsByPicTour/:id", optionalUser, getAllCommentsByPicTours);
///like...................................................

picTourRoute.post("/likeUnlikePicTour", likeUnlikePicTour);
picTourRoute.post("/likePicTour", likePicTour);
picTourRoute.post("/UnlikePicTour", UnlikePicTour);
picTourRoute.get("/getAllLikesByPicTour/:id", getAllLikesByPicTour);

// viewed mechanism...................................................
picTourRoute.post("/viewTour", viewTour);
picTourRoute.get("/getMostViewedToursByCategory/:id", getMostViewedToursByCategory);
picTourRoute.get("/getMostCommentedToursByCategory/:id", getComentedTours);
picTourRoute.get("/getAllTrendingToursByCategory/:id", getAllTrendingToursByCategory);

picTourRoute.get("/searchTour", searchTour);
export default picTourRoute;
