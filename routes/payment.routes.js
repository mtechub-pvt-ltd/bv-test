import { Router } from 'express';
import { requireAdmin, requireUser } from '../Middleware/auth.js';
import { createPayment, getAllPaymentByUser, getAllUsersPaymentDetails, savePaymentDetail } from '../Controllers/paymentController.js';
const paymentRoute = Router();


paymentRoute.post("/createPaymentIntent", requireUser, createPayment)
paymentRoute.post("/savePaymentDetail", requireUser, savePaymentDetail)
paymentRoute.get("/getAllPaymentsDetails", requireAdmin, getAllUsersPaymentDetails)
// A user may only read their own payments; admins may read anyone's.
const ownPaymentsOnly = (req, res, next) => {
  const isAdmin = String(req.authUser?.role || "").toLowerCase() === "admin";
  if (!isAdmin && Number(req.params.id) !== Number(req.authUser?.id)) {
    return res.status(403).json({ statusCode: 403, success: false, message: "You can only view your own payments" });
  }
  next();
};
paymentRoute.get("/getAllPaymentByUser/:id", requireUser, ownPaymentsOnly, getAllPaymentByUser)
export default paymentRoute;
