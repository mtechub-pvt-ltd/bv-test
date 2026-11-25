import { Router } from "express";
import { requireUser, optionalUser } from "../../Middleware/auth.js";
import { commentCreateGuard } from "../../Middleware/commentGuard.js";
import { attachCommentRoutes } from "../commentRoutes.js";
import {
  create,
  update,
  deleteSport,
  deleteAllSports,
  addComment,
  getComments,
  
  getSubcategoriesWithSportsByCategory,
  getSportByUserId,
  toggleLikeSport,
  searchSportsByTitle,
  getSportsLikes,
  getTotal,
  getSpecificSport,
} from "../../Controllers/sports/sportController.js";
import { verification } from "../../Middleware/Verification.js";

const cinematicsRoute = Router();

cinematicsRoute.get("/getSpecificSport/:id", getSpecificSport);
cinematicsRoute.post("/create", create);
cinematicsRoute.put("/update", update);
cinematicsRoute.delete("/delete/:id", deleteSport);
cinematicsRoute.delete("/deleteAll", deleteAllSports);
cinematicsRoute.get(
  "/getByCategory/:category_id",

  getSubcategoriesWithSportsByCategory
);
cinematicsRoute.get("/getByUserId/:user_id", getSportByUserId);
cinematicsRoute.get("/searchByTitle", searchSportsByTitle);

cinematicsRoute.post("/toggleLikeSport", toggleLikeSport);
cinematicsRoute.get("/all-likes/:sport_id", getSportsLikes);
// comments
cinematicsRoute.post("/addComment", requireUser, commentCreateGuard("sport_comment"), addComment);
cinematicsRoute.post("/sendComment", requireUser, commentCreateGuard("sport_comment"), addComment);
attachCommentRoutes(cinematicsRoute, "sports");
cinematicsRoute.get("/getComments/:sport_id", optionalUser, getComments);

cinematicsRoute.get("/getTotal", getTotal);

export default cinematicsRoute;
