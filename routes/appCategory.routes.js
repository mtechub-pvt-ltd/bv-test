import { Router } from 'express';
import { create, createUserAppCategory, deleteAllCategory, deleteCategory, getAllCategories, getSpecificCategory, getUserAppCategories, searchCategories, updateCatgory } from '../Controllers/appCategoryController.js';
import { verification } from '../Middleware/Verification.js';
const appCategoryRoute = Router();

appCategoryRoute.post('/createAppCategory', create);
appCategoryRoute.post('/createUserAppCategory', createUserAppCategory);
appCategoryRoute.delete('/deleteAppCategory/:id', deleteCategory);
appCategoryRoute.put('/updateAppCategory', updateCatgory);
appCategoryRoute.get("/getAllAppCategories", getAllCategories)
appCategoryRoute.get("/getUserAppCategories/:userId", getUserAppCategories)
appCategoryRoute.get("/getSpecificAppCategory/:id", getSpecificCategory)
appCategoryRoute.delete("/deleteAllAppCategories", deleteAllCategory)
appCategoryRoute.get("/searchAppCategories", searchCategories)
export default appCategoryRoute;
