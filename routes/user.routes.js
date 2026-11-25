import { Router } from "express";
import {
  ResetPasswordLinkValidate,
  accountDeletePermanently,
  blockUnblockUser,
  cancelSubsciptionEmail,
  cancelSubscription,
  changePassword,
  countUsersByMonth,
  createSubscription,
  deleteAllUsers,
  deleteUser,
  forgetPassword,
  getAdminDashboardStats,
  getDashboardUserMetrics,
  getAllDataOfDeletedUser,
  getAllDeleteUsers,
  getAllSubscribedUser,
  getAllUsers,
  getAllUsersByYears,
  getSpecificUser,
  getUserStats,
  getUserProfileSummary,
  login,
  register,
  resetPassword,
  restoreUser,
  searchUsers,
  sendSubsciptionEmail,
  sendWellcomeEmail,
  updateProfile,
  uploadImage,
  verifyOtp,
  verifyEmailOtp,
  resendEmailVerificationOtp,
  likeUserProfile,
  getProfileLikesCount,
  getUsersWhoLikedProfile,
  filterUsers,
  saveFCMToken,
  removeFCMToken,
  getCreatorAnalyticsSummary,
  getCreatorAnalyticsPosts,
  getCreatorAnalyticsPostDetail,
  getUploadLimitsForUser,
  getLeaderboard,
  getUserComments,
} from "../Controllers/userController.js";
import { upload } from "../utils/ImageHandler.js";
import { verification } from "../Middleware/Verification.js";
import { requireAdmin, requireUser } from "../Middleware/auth.js";
import { SubscriptionEmail } from "../utils/EmailTemplates.js";
const userRoute = Router();
// userRoute.get('/verifyToken', verifyToken);
userRoute.post("/login", login);
userRoute.post("/register", register);
userRoute.post("/uploadImage", uploadImage);
userRoute.post("/save-fcm-token", verification, saveFCMToken);
userRoute.post("/remove-fcm-token", verification, removeFCMToken);

// Email verification after registration
userRoute.post("/verifyEmailOtp", verifyEmailOtp);
userRoute.post("/resendEmailVerificationOtp", resendEmailVerificationOtp);

// userRoute.post('/uploadImage',upload("userImage").single("image"), uploadImage);
userRoute.post("/forgetPassword", forgetPassword);
userRoute.post("/verifyOtp", verifyOtp);
userRoute.post("/reset_password", resetPassword);
userRoute.post("/changePassword", changePassword);
userRoute.post("/validate_reset_password_link", ResetPasswordLinkValidate);
userRoute.post("/updateUserProfile", updateProfile);
userRoute.post("/likeUserProfile", likeUserProfile);
userRoute.get("/getProfileLikesCount/:user_id", getProfileLikesCount);
userRoute.get("/getProfileLikes/:id", getUsersWhoLikedProfile);
userRoute.get("/getUser/:id", getSpecificUser);
userRoute.get("/getAllUsers", requireAdmin, getAllUsers);
userRoute.get("/getAllUsersByYear", requireAdmin, countUsersByMonth);
userRoute.delete("/deleteUser/:id", deleteUser);
userRoute.delete("/deleteAllUser", deleteAllUsers);
userRoute.get("/searchUser", searchUsers);
userRoute.post("/blockUnblockUser", blockUnblockUser);
userRoute.get("/getAllDeletedUsers", requireAdmin, getAllDeleteUsers);
userRoute.post("/restoreUser", restoreUser);
userRoute.post("/createSubscription", createSubscription);
userRoute.get("/getAllSubscribedUser", requireAdmin, getAllSubscribedUser);
userRoute.get("/getDashboardStats", requireAdmin, getAdminDashboardStats);
userRoute.get("/getDashboardUserMetrics", requireAdmin, getDashboardUserMetrics);
userRoute.get("/getUserStats/:user_id", getUserStats);
userRoute.get("/profile-summary/:userId", getUserProfileSummary);
userRoute.get("/comments/:userId", getUserComments);
userRoute.get("/user-comments/:userId", getUserComments);
userRoute.get("/creator-analytics/summary", verification, getCreatorAnalyticsSummary);
userRoute.get("/creator-analytics/posts", verification, getCreatorAnalyticsPosts);
userRoute.get("/creator-analytics/posts/:module/:postId", verification, getCreatorAnalyticsPostDetail);
userRoute.get("/upload-limits", verification, getUploadLimitsForUser);
userRoute.get("/leaderboard", getLeaderboard);
userRoute.post("/sendWellcomeEmail", sendWellcomeEmail);
userRoute.get(
  "/getAllDataOfDeletedUser/:user_id",
  requireAdmin,
  getAllDataOfDeletedUser
);
userRoute.post("/sendSubscriptionEmail", sendSubsciptionEmail);
userRoute.post("/cancelSubsciptionEmail", cancelSubsciptionEmail);
userRoute.post("/unsubscribeUser", cancelSubscription);
// ✅ New route for permanent deletion
userRoute.delete(
  "/deleteUserPermanently/:id",

  accountDeletePermanently
);
// Open API: filter users by username with pagination
userRoute.get("/filterUsers", filterUsers);

// Gold Badge Business Verification Routes (User & Admin)
import {
  applyForGoldBadge,
  getGoldBadgeStatus,
  adminGetGoldBadgeApplications,
  adminGetGoldBadgeApplicationDetail,
  adminReviewGoldBadgeApplication,
} from "../Controllers/goldBadgeController.js";

userRoute.post("/gold-badge/apply", verification, applyForGoldBadge);
userRoute.get("/gold-badge/status", verification, getGoldBadgeStatus);
userRoute.get("/admin/gold-badge/applications", requireAdmin, adminGetGoldBadgeApplications);
userRoute.get("/admin/gold-badge/applications/:id", requireAdmin, adminGetGoldBadgeApplicationDetail);
userRoute.put("/admin/gold-badge/applications/:id/review", requireAdmin, adminReviewGoldBadgeApplication);

export default userRoute;
