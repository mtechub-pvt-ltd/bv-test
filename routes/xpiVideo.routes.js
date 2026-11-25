import { Router } from "express";
import { requireUser, optionalUser } from "../Middleware/auth.js";
import { commentCreateGuard } from "../Middleware/commentGuard.js";
import { attachCommentRoutes } from "./commentRoutes.js";
import { verification } from "../Middleware/Verification.js";
import { uploadVideoWithLengthCheck } from "../utils/VideoHandler.js";
import {
  UnlikeVideo,
  createXpiVideo,
  deleteAllVideos,
  deleteVideo,
  getAllCommentsByVideo,
  getAllLikesByVideo,
  getAllRecentVideosByCategory,
  getAllTrendingVideosByCategory,
  getAllVideos,
  getAllVideosByCategory,
  getAllVideosByUser,
  getComentedVideos,
  getMostViewedVideosByCategory,
  getSpecificVideo,
  likeUnlikeVideo,
  likeVideo,
  searchVideos,
  sendComment,
  updateXpiVideo,
  uploadFile,
  viewVideo,
} from "../Controllers/xpiVideoController.js";
import { genericUploadFile, postLetterMedia } from "../utils/ImageHandler.js";
const xpiRoute = Router();

xpiRoute.post(
  "/createXpiVideo",

  // uploadVideoWithLengthCheck("xpiVideos"),
  createXpiVideo
);
xpiRoute.post(
  "/fileUpload",

  genericUploadFile("fileUpload").any(),
  uploadFile
);
xpiRoute.delete("/deleteXpiVideo/:id", deleteVideo);
xpiRoute.put(
  "/updateXpiVideo",

  // uploadVideoWithLengthCheck("xpiVideos"),
  updateXpiVideo
);


xpiRoute.get("/getAllVideos", getAllVideos);
xpiRoute.get("/getAllRecentVideosByCategory/:id", getAllRecentVideosByCategory);
xpiRoute.get("/getAllVideosByUser/:id", getAllVideosByUser);
xpiRoute.get("/getAllVideosBycategory/:id", getAllVideosByCategory);
xpiRoute.get("/getSpecificVideo/:id", getSpecificVideo);
xpiRoute.delete("/deleteAllVideos", deleteAllVideos);
//comment......................................
xpiRoute.post("/sendComment", requireUser, commentCreateGuard("video_comment"), sendComment);
attachCommentRoutes(xpiRoute, "xpi");
xpiRoute.get("/getAllCommentsByVideo/:id", optionalUser, getAllCommentsByVideo);
///like...................................................
xpiRoute.post("/likeUnlikeVideo", likeUnlikeVideo);
xpiRoute.post("/likeVideo", likeVideo);
xpiRoute.post("/UnlikeVideo", UnlikeVideo);
xpiRoute.get("/getAllLikesByVideo/:id", getAllLikesByVideo);

// viewed mechanism...................................................
xpiRoute.post("/viewVideo", viewVideo);
xpiRoute.get("/getMostViewedVideosByCategory/:id", getMostViewedVideosByCategory);
xpiRoute.get("/getMostCommentedVideosByCategory/:id", getComentedVideos);
xpiRoute.get("/getTrendingVideosByCategory/:id", getAllTrendingVideosByCategory);

xpiRoute.get("/searchVideo", searchVideos);

export default xpiRoute;
