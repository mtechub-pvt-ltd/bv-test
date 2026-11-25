import { Router } from "express";
import { verification } from "../Middleware/Verification.js";
import {
  getMassApps,
  assignMassApp,
  deleteMassApp,
  addRecentMassApp,
  removeRecentMassApp,
} from "../Controllers/massAppController.js";

const massAppsRoute = Router();

// All endpoints require auth — user is resolved from the JWT, never from request body
massAppsRoute.use(verification);

massAppsRoute.get("/massApps", getMassApps);
massAppsRoute.post("/massApps/assign", assignMassApp);
massAppsRoute.delete("/massApps/:packageName", deleteMassApp);
massAppsRoute.post("/massApps/recent", addRecentMassApp);
massAppsRoute.delete("/massApps/recent/:packageName", removeRecentMassApp);

export default massAppsRoute;
