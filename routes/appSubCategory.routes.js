import { Router } from "express";
import {
  createAppSubCategory,
  getAllAppSubCategories,
  getSpecificAppSubCategory,
  updateAppSubCategory,
  deleteAppSubCategory,
} from "../Controllers/appSubCategoryController.js";

const appSubCategoryRoute = Router();

appSubCategoryRoute.post("/appSubCategory", createAppSubCategory);
appSubCategoryRoute.get("/appSubCategory", getAllAppSubCategories);
appSubCategoryRoute.get("/appSubCategory/:id", getSpecificAppSubCategory);
appSubCategoryRoute.put("/appSubCategory/:id", updateAppSubCategory);
appSubCategoryRoute.delete("/appSubCategory/:id", deleteAppSubCategory);

export default appSubCategoryRoute;