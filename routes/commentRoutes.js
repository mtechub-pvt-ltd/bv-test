import { moduleCommentRouter } from "../Controllers/commentController.js";
import { requireUser } from "../Middleware/auth.js";

/**
 * Registers the edit / delete / like endpoints of ONE module on its router.
 * All of them require a login; the user is taken from the token.
 *
 *   attachCommentRoutes(newsRoute, "news");
 *   attachCommentRoutes(router, "video", "/video");   // optional path prefix
 */
export const attachCommentRoutes = (router, moduleName, prefix = "") => {
  const { editComment, deleteComment, likeComment } = moduleCommentRouter(moduleName);
  router.put(`${prefix}/editComment/:commentId`, requireUser, ...editComment);
  router.put(`${prefix}/editComment`, requireUser, ...editComment);
  router.delete(`${prefix}/deleteComment/:commentId`, requireUser, ...deleteComment);
  router.delete(`${prefix}/deleteComment`, requireUser, ...deleteComment);
  router.post(`${prefix}/likeComment/:commentId`, requireUser, ...likeComment);
};
