import { Router } from "express";
import { requireUser, optionalUser } from "../Middleware/auth.js";
import { commentCreateGuard } from "../Middleware/commentGuard.js";
import { attachCommentRoutes } from "./commentRoutes.js";
import { verification } from "../Middleware/Verification.js";
import { upload } from "../utils/ImageHandler.js";
import { UnlikePicTour } from "../Controllers/picTourController.js";
import { createGEBC, deleteAllGEBCs, deleteGEBC, getAllCommentsByGEBC, getAllGEBCByUser, getAllGEBCs, getAllGEBCsByCategory,  getAllLikesByGBEC, getSpecificGEBC, likeUnlikeGEBC, searchGEBCs, sendComment, updateGEBC } from "../Controllers/gebcController.js";
const gebcRoute = Router();

gebcRoute.post(
  "/createGEBC",

  // upload("gebcImages").single("image"),
  createGEBC
);
gebcRoute.delete("/deleteGEBC/:id", deleteGEBC);
gebcRoute.put(
  "/updateGEBC",

  // upload("gebcImages").single("image"),
  updateGEBC
);
gebcRoute.get("/getAllGEBCs", getAllGEBCs);
gebcRoute.get("/getAllGEBCByUser/:id", getAllGEBCByUser);
gebcRoute.get("/getAllGEBCsByCategory/:id", getAllGEBCsByCategory);
gebcRoute.get("/getSpecificGEBC/:id", getSpecificGEBC);
gebcRoute.delete("/deleteAllGEBCs", deleteAllGEBCs);
//comment......................................
gebcRoute.post("/sendComment", requireUser, commentCreateGuard("gebc_comment"), sendComment);
attachCommentRoutes(gebcRoute, "gebc");
gebcRoute.get("/getAllCommentsByGEBC/:id", optionalUser, getAllCommentsByGEBC);
///like...................................................
gebcRoute.post("/likeUnlikeGEBC", likeUnlikeGEBC);
gebcRoute.post("/UnlikePicTour", UnlikePicTour);
gebcRoute.get("/getAllLikesByGEBC/:id", getAllLikesByGBEC);


gebcRoute.get("/searchGEBCs", searchGEBCs);
export default gebcRoute;
