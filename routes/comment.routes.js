import { Router } from "express";
import { editComment, deleteComment, toggleCommentLike } from "../Controllers/commentController.js";
import { getUserComments } from "../Controllers/userController.js";
import { requireUser, optionalUser } from "../Middleware/auth.js";

const commentRoute = Router();

// Comments written by a user, across all modules: GET /comment/user/:userId
commentRoute.get("/user/:userId", optionalUser, getUserComments);

// 1. Module-parameterised endpoints: /comment/:module/editComment/:commentId
commentRoute.put("/:module/editComment/:commentId", requireUser, editComment);
commentRoute.delete("/:module/deleteComment/:commentId", requireUser, deleteComment);

// 2. Like / unlike: POST /comment/:module/:commentId/like
commentRoute.post("/:module/:commentId/like", requireUser, toggleCommentLike);

// 3. RESTful: PUT /comment/:module/:commentId & DELETE /comment/:module/:commentId
commentRoute.put("/:module/:commentId", requireUser, editComment);
commentRoute.delete("/:module/:commentId", requireUser, deleteComment);

// 4. Body-based: PUT /comment/editComment & DELETE /comment/deleteComment (module + commentId in the body)
commentRoute.put("/editComment", requireUser, editComment);
commentRoute.delete("/deleteComment", requireUser, deleteComment);

export default commentRoute;
