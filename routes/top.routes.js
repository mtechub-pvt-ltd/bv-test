import { Router } from "express";
import { optionalUser, requireAdmin } from "../Middleware/auth.js";
import {
  listModules,
  getTopEntries,
  listCandidates,
  addTopEntry,
  removeTopEntry,
} from "../Controllers/topEntriesController.js";

/**
 * Top List (all modules, max 3 top posts per module).
 * Module keys and rules live in utils/topModules.js. API reference: md/TOP_LIST_API.md
 */
const topRoute = Router();

topRoute.get("/modules", listModules);
topRoute.get("/entries/:module", optionalUser, getTopEntries);
topRoute.get("/entries/:module/candidates", requireAdmin, listCandidates);
topRoute.post("/entries/:module", requireAdmin, addTopEntry);
topRoute.delete("/entries/:module/:itemId", requireAdmin, removeTopEntry);

export default topRoute;
