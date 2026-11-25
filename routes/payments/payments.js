import { Router } from "express";

import { verification } from "../../Middleware/Verification.js";
import {
  attachPaymentMethodToCustomer,
  createCustomer,
  getUserCards,
  getUserTransactions,
  transferPayment,
  createPaymentIntent,
  createPaymentSheet,
  createCheckoutSession,
  verifyCheckoutSession,
  createMobileUserPaymentIntent,
  verifyMobileUserPaymentIntent,
} from "../../Controllers/payments/paymentsController.js";
import { validateBody } from "../../Middleware/validation.js";
const router = Router();

router.post("/create-customer", createCustomer);
router.post(
  "/attach-payment-method",

  validateBody(["paymentMethodId"]),
  attachPaymentMethodToCustomer
);
router.post(
  "/transfer-payment",

  validateBody(["amount", "banner_id", "paymentMethodId"]),
  transferPayment
);
router.post('/create-payment-intent', verification, createPaymentIntent);
router.post('/create-payment-sheet', verification, createPaymentSheet);
router.post('/create-checkout-session', verification, createCheckoutSession);
router.post('/verify-checkout-session', verification, verifyCheckoutSession);
router.post('/create-mobile-payment-intent', verification, createMobileUserPaymentIntent);
router.post('/verify-mobile-payment-intent', verification, verifyMobileUserPaymentIntent);
router.get("/user-transactions", verification, getUserTransactions);
router.get("/user-cards", verification, getUserCards);

export default router;
