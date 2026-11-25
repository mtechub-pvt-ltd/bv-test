import stripe from "stripe";
import {
  sendErrorResponse,
  sendSuccessResponse,
  updateUserWithCustomerId,
  checkUserExist,
  insertCards,
  saveTransactions,
  retrieveTransactions,
  retrieveCards,
} from "./util.js";
import pool from "../../db.config/index.js";
import "dotenv/config";
import {
  ERROR_CUSTOMER_NOT_FOUND,
  ERROR_INTERNAL_SERVER,
  ERROR_USER_NOT_FOUND,
} from "./constants.js";
import { buildUserPlanUpdate, resolvePlanIdFromStripeSession } from "./planRouter.js";

const stripeInstance = process.env.STRIPE_SECRET_KEY
  ? stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export const createCustomer = async (req, res) => {
  const userId = req.user.userId;

  try {
    const user = await checkUserExist(userId);
    if (!user) {
      return sendErrorResponse(
        res,
        ERROR_USER_NOT_FOUND.statusCode,
        ERROR_USER_NOT_FOUND.code,
        ERROR_USER_NOT_FOUND.message
      );
    }
    if (!user.customer_id) {
      const customer = await stripeInstance.customers.create({
        name: user.username || "",
        email: user.email,
      });

      const updatedUser = await updateUserWithCustomerId(customer.id, userId);
      const message = "Customer on stripe created successfully!";
      sendSuccessResponse(res, message, updatedUser);
    } else {
      const message = "Customer already exists.";
      sendSuccessResponse(res, message, user);
    }
  } catch (error) {
    console.error("Error in customer creation or updating user:", error);
    sendErrorResponse(
      res,
      ERROR_INTERNAL_SERVER.statusCode,
      ERROR_INTERNAL_SERVER.code,
      ERROR_INTERNAL_SERVER.message
    );
  }
};

export const attachPaymentMethodToCustomer = async (req, res) => {
  const userId = req.user.userId;
  const { paymentMethodId } = req.body;

  try {
    const user = await checkUserExist(userId);
    if (!user) {
      return sendErrorResponse(
        res,
        ERROR_USER_NOT_FOUND.statusCode,
        ERROR_USER_NOT_FOUND.code,
        ERROR_USER_NOT_FOUND.message
      );
    }
    if (!user.customer_id) {
      return sendErrorResponse(
        res,
        ERROR_CUSTOMER_NOT_FOUND.statusCode,
        ERROR_CUSTOMER_NOT_FOUND.code,
        ERROR_CUSTOMER_NOT_FOUND.message
      );
    }

    const paymentMethod = await stripeInstance.paymentMethods.attach(
      paymentMethodId,
      {
        customer: user.customer_id,
      }
    );

    // insert the payment method into database 'cards' collection
    await insertCards(paymentMethod, user.customer_id, userId);

    const message = "Payment Method Attached to the customer";

    sendSuccessResponse(res, message, paymentMethod);
  } catch (error) {
    console.error("Error in attaching payment method to customer", error);
    sendErrorResponse(
      res,
      ERROR_INTERNAL_SERVER.statusCode,
      ERROR_INTERNAL_SERVER.code,
      ERROR_INTERNAL_SERVER.message
    );
  }
};

export const transferPayment = async (req, res) => {
  const userId = req.user.userId;

  const { paymentMethodId, amount, banner_id } = req.body;
  try {
    const user = await checkUserExist(userId);
    if (!user) {
      return sendErrorResponse(
        res,
        ERROR_USER_NOT_FOUND.statusCode,
        ERROR_USER_NOT_FOUND.code,
        ERROR_USER_NOT_FOUND.message
      );
    }
    if (!user.customer_id) {
      return sendErrorResponse(
        res,
        ERROR_CUSTOMER_NOT_FOUND.statusCode,
        ERROR_CUSTOMER_NOT_FOUND.code,
        ERROR_CUSTOMER_NOT_FOUND.message
      );
    }

    // create payment intent
    const intent = await stripeInstance.paymentIntents.create({
      payment_method: paymentMethodId,
      customer: user.customer_id,
      amount: Math.round(Number(amount) * 100),
      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // persist into stripe_payments table (single payments table) and update banner.transaction_id
    try {
      const rawResponse = JSON.stringify(intent);
      const providerTransactionId = intent.id || null;
      const amountCents = intent.amount || Math.round(Number(amount) * 100);
      const amountDecimal = amountCents ? (Number(amountCents) / 100).toFixed(2) : null;
      const currency = intent.currency || 'usd';
      const status = intent.status || null;
      const payment_method = intent.payment_method || null;
      const customer_id = intent.customer || user.customer_id || null;

      const insertQuery = `
        INSERT INTO stripe_payments
        (user_id, banner_id, stripe_session_id, provider_transaction_id, status, amount_cents, amount_decimal, currency, price_id, product_id, payment_method, customer_id, receipt_url, raw_response, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW()) RETURNING *
      `;
      const receipt_url = intent.charges?.data?.[0]?.receipt_url || null;
      const insertParams = [userId, banner_id || null, null, providerTransactionId, status, amountCents, amountDecimal, currency, null, null, payment_method, customer_id, receipt_url, rawResponse];
      await pool.query(insertQuery, insertParams);

      if (banner_id && providerTransactionId) {
        try {
          await pool.query(`UPDATE banner SET transaction_id = $1, paid_status = TRUE WHERE id = $2 AND user_id = $3`, [providerTransactionId, banner_id, userId]);
        } catch (e) {
          console.warn('Failed to update banner with transaction info for transferPayment:', e.message);
        }
      }
    } catch (e) {
      console.error('Failed to persist transfer payment:', e.message);
    }

    const message = `Your transaction of ${amount} has been successfully started`;
    sendSuccessResponse(res, message);
  } catch (error) {
    console.error("Error in transferring payments", error, error.message);
    sendErrorResponse(
      res,
      ERROR_INTERNAL_SERVER.statusCode,
      ERROR_INTERNAL_SERVER.code,
      error.message
    );
  }
};

export const createPaymentIntent = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { amount, currency = 'usd' } = req.body;

    if (!amount) {
      return sendErrorResponse(res, 400, 'MISSING_AMOUNT', 'amount is required');
    }

    let customerId = undefined;
    if (userId) {
      const user = await checkUserExist(userId);
      if (user && user.customer_id) {
        customerId = user.customer_id;
      }
    }

    const intentParams = {
      amount: Math.round(Number(amount) * 100),
      currency: currency,
      automatic_payment_methods: {
        enabled: true,
      },
    };

    if (customerId) {
      intentParams.customer = customerId;
    }

    const intent = await stripeInstance.paymentIntents.create(intentParams);

    return sendSuccessResponse(res, 'Payment intent created', {
      clientSecret: intent.client_secret,
      id: intent.id
    });
  } catch (err) {
    console.error('createPaymentIntent error', err);
    return sendErrorResponse(res, 500, 'STRIPE_ERROR', err.message || 'Stripe error');
  }
};

export const createPaymentSheet = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const {
      amount,
      currency = 'usd',
      lookupKey,
      priceId,
      plan_id,
      banner_tier,
      days,
      category_table,
    } = req.body;

    if (!userId) {
      return sendErrorResponse(res, 401, 'UNAUTHORIZED', 'User authentication required for payment sheet');
    }

    const user = await checkUserExist(userId);
    if (!user) {
      return sendErrorResponse(res, 404, 'USER_NOT_FOUND', 'User not found');
    }

    let calculatedAmountCents = 0;

    if (amount !== undefined && amount !== null && amount !== "") {
      calculatedAmountCents = Math.round(Number(amount) * 100);
    } else if (lookupKey || priceId) {
      // Resolve lookupKey or priceId if amount was omitted
      let targetPriceId = priceId || null;
      if (!targetPriceId && lookupKey) {
        try {
          const prices = await stripeInstance.prices.list({ lookup_keys: [lookupKey], limit: 1 });
          if (prices && prices.data && prices.data.length > 0) {
            targetPriceId = prices.data[0].id;
          }
        } catch (e) {
          console.warn('Failed resolving lookupKey in createPaymentSheet:', e.message);
        }
      }
      if (targetPriceId) {
        try {
          const retrievedPrice = await stripeInstance.prices.retrieve(targetPriceId);
          calculatedAmountCents = retrievedPrice.unit_amount;
        } catch (e) {
          console.warn('Failed retrieving price in createPaymentSheet:', e.message);
        }
      }
    }

    if (!calculatedAmountCents || calculatedAmountCents <= 0) {
      return sendErrorResponse(res, 400, 'MISSING_AMOUNT', 'amount or valid lookupKey is required');
    }

    let customerId = user.customer_id;

    if (!customerId) {
      const customer = await stripeInstance.customers.create({
        name: user.username || "",
        email: user.email,
      });
      customerId = customer.id;
      await updateUserWithCustomerId(customerId, userId);
    }

    const ephemeralKey = await stripeInstance.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: '2023-10-16' }
    );

    const isBanner = Boolean(
      banner_tier ||
      category_table ||
      (plan_id && String(plan_id).toLowerCase().includes("banner")) ||
      (lookupKey && String(lookupKey).toLowerCase().includes("banner"))
    );

    const paymentIntent = await stripeInstance.paymentIntents.create({
      amount: calculatedAmountCents,
      currency: currency.toLowerCase(),
      customer: customerId,
      metadata: {
        userId: String(userId),
        planId: String(plan_id || lookupKey || (isBanner ? (banner_tier ? `banner-${banner_tier}-key` : "banner") : "")),
        banner_tier: banner_tier ? String(banner_tier) : "",
        category_table: category_table ? String(category_table) : "",
        days: days ? String(days) : "",
        payment_type: isBanner ? "banner" : "subscription",
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return sendSuccessResponse(res, 'Payment sheet initialized successfully', {
      paymentIntent: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      ephemeralKey: ephemeralKey.secret,
      customer: customerId,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      amount: (calculatedAmountCents / 100).toFixed(2),
      currency: currency.toLowerCase(),
    });
  } catch (err) {
    console.error('createPaymentSheet error', err);
    return sendErrorResponse(res, 500, 'STRIPE_ERROR', err.message || 'Stripe error');
  }
};

export const createCheckoutSession = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { priceId, lookupKey, successUrl: rawSuccessUrl, cancelUrl: rawCancelUrl } = req.body;

    if ((!priceId && !lookupKey) || !rawSuccessUrl || !rawCancelUrl) {
      return sendErrorResponse(res, 400, 'MISSING_PARAMS', 'priceId or lookupKey, successUrl and cancelUrl are required');
    }

    // Normalize URLs: Stripe requires absolute URLs with scheme
    const normalizeUrl = (u) => {
      if (!u || typeof u !== 'string') return null;
      const trimmed = u.trim();
      if (trimmed.startsWith('//')) return `https:${trimmed}`;
      if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
      return trimmed;
    };

    const successUrl = normalizeUrl(rawSuccessUrl);
    const cancelUrl = normalizeUrl(rawCancelUrl);
    if (!successUrl || !cancelUrl) return sendErrorResponse(res, 400, 'INVALID_URL', 'successUrl and cancelUrl must be valid URLs');

    // Try to get user email if authenticated
    let customerEmail = undefined;
    if (userId) {
      const user = await checkUserExist(userId);
      if (user && user.email) customerEmail = user.email;

      // Constraint checks apply strictly to Blue Badge plans
      const isBlueBadgePlan =
        (lookupKey && String(lookupKey).toLowerCase().includes("blue")) ||
        (priceId && String(priceId).toLowerCase().includes("blue"));

      if (isBlueBadgePlan && user) {
        const isEmailVerified =
          user.verified === true || user.verified === "true" || user.verified === 1;
        if (!isEmailVerified) {
          return sendErrorResponse(res, 400, "EMAIL_NOT_VERIFIED", "A verified email address is required before subscribing for a badge.");
        }

        // Good Standing Check: Block badge subscription on 3rd policy violation (>= 3 violations or account block)
        const isAccountBlocked = user.block === true || user.block === "true" || user.block === 1;
        let totalReports = 0;
        try {
          const reportCheck = await pool.query(
            `SELECT
               (SELECT COUNT(*)::int FROM item_report WHERE reported_user_id = $1) +
               (SELECT COUNT(*)::int FROM reported_user WHERE reported_user_id = $1)
             AS total_cnt`,
            [userId]
          );
          if (reportCheck.rows && reportCheck.rows[0]) {
            totalReports = Number(reportCheck.rows[0].total_cnt || 0);
          }
        } catch (e) {}

        const userViolations = Number(user.violations_count || user.violations || 0);
        const totalViolations = Math.max(totalReports, userViolations);

        if (isAccountBlocked || totalViolations >= 3) {
          return sendErrorResponse(res, 400, "POLICY_VIOLATION", "You cannot get badge, you have violated rules.");
        }

        // Active Presence Check: Account age >= 30 days
        const createdAt = user.created_at ? new Date(user.created_at) : null;
        const accountAgeDays = createdAt ? (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24) : 30;

        if (accountAgeDays < 30) {
          return sendErrorResponse(res, 400, "ACCOUNT_AGE_INVALID", "Your account must be at least 30 days old to subscribe for a badge.");
        }

        // Active Content Check: At least 1 active post
        let activePostsCount = 0;
        try {
          const postsCheck = await pool.query(
            `SELECT
               (SELECT COUNT(*)::int FROM xpi_videos WHERE user_id = $1 AND status != 'blocked') +
               (SELECT COUNT(*)::int FROM pic_tours WHERE user_id = $1 AND status != 'blocked') +
               (SELECT COUNT(*)::int FROM news WHERE user_id = $1 AND status != 'blocked') +
               (SELECT COUNT(*)::int FROM post_letters WHERE user_id = $1 AND status != 'blocked') +
               (SELECT COUNT(*)::int FROM qafi WHERE user_id = $1 AND status != 'blocked') +
               (SELECT COUNT(*)::int FROM gebc WHERE user_id = $1 AND status != 'blocked') +
               (SELECT COUNT(*)::int FROM sports WHERE user_id = $1 AND status != 'blocked') +
               (SELECT COUNT(*)::int FROM item WHERE user_id = $1 AND status != 'blocked')
             AS total_active_posts`,
            [userId]
          );
          if (postsCheck.rows && postsCheck.rows[0]) {
            activePostsCount = Number(postsCheck.rows[0].total_active_posts || 0);
          }
        } catch (e) {}

        const userPostsCount = Number(user.active_posts_count || user.posts_count || 0);
        const totalPosts = Math.max(activePostsCount, userPostsCount);

        if (totalPosts < 1) {
          return sendErrorResponse(res, 400, "NO_ACTIVE_POSTS", "You must have at least 1 active post to subscribe for a badge.");
        }
      }
    }

    // Resolve lookup key to price id if provided
    let finalPriceId = priceId || null;
    if (!finalPriceId && lookupKey) {
      try {
        let prices = await stripeInstance.prices.list({ lookup_keys: [lookupKey], limit: 1 });
        if (!prices || !prices.data || prices.data.length === 0) {
          const DEFAULT_PRICE_MAP = {
            "blue_badge_monthly_key": { name: "Blue Badge (Monthly)", amount: 499, interval: "month" },
            "blue_badge_annual_key": { name: "Blue Badge (Annual)", amount: 4999, interval: "year" },
            "blue_premium_badge_monthly_key": { name: "Blue Premium Badge (Monthly)", amount: 999, interval: "month" },
            "blue_premium_badge_annual_key": { name: "Blue Premium Badge (Annual)", amount: 9999, interval: "year" },
            "gold_badge_basic_monthly_key": { name: "Gold Badge Basic (Monthly)", amount: 4999, interval: "month" },
            "gold_badge_basic_annual_key": { name: "Gold Badge Basic (Annual)", amount: 49999, interval: "year" },
            "gold_badge_premium_monthly_key": { name: "Gold Badge Premium (Monthly)", amount: 9999, interval: "month" },
            "gold_badge_premium_annual_key": { name: "Gold Badge Premium (Annual)", amount: 99999, interval: "year" },
            "banner-subscription-key": { name: "Banner Ad Top Tier (Premium)", amount: 5000, interval: "month" },
            "banner-top-subscription-key": { name: "Banner Ad Top Tier (Premium)", amount: 5000, interval: "month" },
            "banner_top_subscription_key": { name: "Banner Ad Top Tier (Premium)", amount: 5000, interval: "month" },
            "banner-middle-subscription-key": { name: "Banner Ad Middle Tier", amount: 2500, interval: "month" },
            "banner_middle_subscription_key": { name: "Banner Ad Middle Tier", amount: 2500, interval: "month" },
            "banner-lower-subscription-key": { name: "Banner Ad Lower Tier", amount: 1250, interval: "month" },
            "banner_lower_subscription_key": { name: "Banner Ad Lower Tier", amount: 1250, interval: "month" },
          };

          const planSpec = DEFAULT_PRICE_MAP[lookupKey];
          if (planSpec) {
            const product = await stripeInstance.products.create({ name: planSpec.name });
            const createdPrice = await stripeInstance.prices.create({
              product: product.id,
              unit_amount: planSpec.amount,
              currency: "usd",
              recurring: { interval: planSpec.interval },
              lookup_key: lookupKey,
              transfer_lookup_key: true,
            });
            finalPriceId = createdPrice.id;
          } else {
            return sendErrorResponse(res, 400, 'PRICE_NOT_FOUND', `Could not find price for lookupKey: ${lookupKey}`);
          }
        } else {
          finalPriceId = prices.data[0].id;
        }
      } catch (e) {
        console.warn('Failed resolving lookupKey to price:', e.message);
        return sendErrorResponse(res, 500, 'STRIPE_ERROR', 'Failed to resolve price lookup key');
      }
    }

    // The plan is whatever the Stripe price really is, never what the client says it is.
    let planKey = lookupKey || priceId || "";
    try {
      const priceObj = await stripeInstance.prices.retrieve(finalPriceId);
      planKey = priceObj?.lookup_key || finalPriceId;
    } catch (e) {
      return sendErrorResponse(res, 400, 'PRICE_NOT_FOUND', 'Unknown price');
    }

    const session = await stripeInstance.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: finalPriceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
      client_reference_id: userId ? String(userId) : undefined,
      metadata: {
        userId: userId ? String(userId) : "",
        planId: planKey,
        lookupKey: planKey,
      },
      subscription_data: {
        metadata: {
          userId: userId ? String(userId) : "",
          planId: planKey,
          lookupKey: planKey,
        },
      },
    });

    return sendSuccessResponse(res, 'Checkout session created', { url: session.url, id: session.id });
  } catch (err) {
    console.error('createCheckoutSession error', err);
    return sendErrorResponse(res, 500, 'STRIPE_ERROR', err.message || 'Stripe error');
  }
};

export const verifyCheckoutSession = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { banner_id } = req.body || {};
    if (!userId) return sendErrorResponse(res, 401, 'AUTH_REQUIRED', 'Authentication required');

    const { sessionId, plan_id } = req.body || {};
    if (!sessionId) return sendErrorResponse(res, 400, 'MISSING_SESSION_ID', 'sessionId is required');

    // Only real Stripe Checkout sessions (cs_...) are accepted. Synthetic / free-trial ids
    // used to be honoured here and granted paid plans for free (QA report C6).
    if (typeof sessionId !== 'string' || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
      return sendErrorResponse(res, 400, 'INVALID_SESSION_ID', 'Invalid checkout session id');
    }
    if (!stripeInstance) return sendErrorResponse(res, 503, 'PAYMENTS_UNAVAILABLE', 'Payments are not configured');

    // Retrieve the session and expand objects
    const session = await stripeInstance.checkout.sessions.retrieve(sessionId, { expand: ['payment_intent', 'subscription', 'customer'] });
    if (!session) return sendErrorResponse(res, 404, 'SESSION_NOT_FOUND', 'Checkout session not found');

    // The session must have been created for THIS user (no claiming someone else's payment).
    const sessionOwner = session.metadata?.userId || session.client_reference_id || '';
    if (String(sessionOwner) !== String(userId)) {
      return sendErrorResponse(res, 403, 'SESSION_OWNER_MISMATCH', 'This payment does not belong to your account');
    }

    // Fetch line items to get price/product info (expand price for lookup_key)
    let lineItems = null;
    try {
      const li = await stripeInstance.checkout.sessions.listLineItems(sessionId, {
        limit: 10,
        expand: ["data.price"],
      });
      lineItems = li && li.data ? li.data : [];
    } catch (e) {
      console.warn('Could not list line items for session:', e.message);
      lineItems = [];
    }
    const firstItem = lineItems.length > 0 ? lineItems[0] : null;
    const priceId = firstItem?.price?.id || null;
    const productId = firstItem?.price?.product || null;

    // Prefer explicit plan_id from FE; fall back to Stripe metadata / price lookup_key.
    // Never treat missing plan as banner — that was wiping badge upgrades.
    const resolvedPlanId = resolvePlanIdFromStripeSession(session, lineItems);
    console.log(`[DEBUG] verifyCheckoutSession: body plan_id=${plan_id}, resolved=${resolvedPlanId}`);

    const paymentMode = session.mode;
    let paid = false;
    let amountCents = null;
    let currency = null;
    let providerTransactionId = null;

    if (paymentMode === 'payment') {
      const pi = session.payment_intent;
      if (!pi) return sendErrorResponse(res, 400, 'NO_PAYMENT_INTENT', 'PaymentIntent not available on session');
      paid = pi.status === 'succeeded' || session.payment_status === 'paid';
      amountCents = pi.amount || session.amount_total || null;
      currency = pi.currency || session.currency || null;
      providerTransactionId = pi.id;
    } else {
      const subscriptionObj = session.subscription;
      if (!subscriptionObj) return sendErrorResponse(res, 400, 'NO_SUBSCRIPTION', 'Subscription object not available on session');
      // Retrieve subscription from Stripe for authoritative status
      const sub = await stripeInstance.subscriptions.retrieve(typeof subscriptionObj === 'string' ? subscriptionObj : subscriptionObj.id);
      paid = sub.status === 'active' || sub.status === 'trialing';
      const price = sub.items?.data?.[0]?.price;
      amountCents = price?.unit_amount || null;
      currency = price?.currency || null;
      providerTransactionId = sub.id;
    }

    console.log(`[DEBUG] verifyCheckoutSession: mode=${paymentMode}, paid=${paid}, providerTransactionId=${providerTransactionId}`);

    if (!paid) return sendErrorResponse(res, 400, 'NOT_PAID', 'Payment not completed');

    // Save transaction to DB (idempotent)
    const rawResponse = JSON.stringify(session);
    let transaction = null;
    if (providerTransactionId) {
      try {
        const exist = await pool.query(`SELECT * FROM stripe_payments WHERE provider_transaction_id = $1 LIMIT 1`, [providerTransactionId]);
        if (exist.rows && exist.rows[0]) transaction = exist.rows[0];
      } catch (e) {
        console.warn('Could not check existing stripe_payments:', e.message);
      }
      if (transaction && Number(transaction.user_id) !== Number(userId)) {
        return sendErrorResponse(res, 403, 'PAYMENT_ALREADY_USED', 'This payment was already used by another account');
      }
    }

    if (!transaction) {
      // extract additional main fields for easier querying
      let payment_method = null;
      let customer_id = null;
      let receipt_url = null;
      try {
        payment_method = session.payment_intent?.payment_method || session.payment_intent?.payment_method_types?.[0] || null;
        customer_id = (session.customer && typeof session.customer === 'object') ? session.customer.id : session.customer || null;
        receipt_url = session.payment_intent?.charges?.data?.[0]?.receipt_url || null;
      } catch (e) {
        // ignore extraction errors
      }

      const insertQuery = `
        INSERT INTO stripe_payments
        (user_id, stripe_session_id, provider_transaction_id, status, amount_cents, amount_decimal, currency, price_id, product_id, payment_method, customer_id, receipt_url, raw_response, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW()) RETURNING *
      `;
      const amountDecimal = amountCents ? (Number(amountCents) / 100).toFixed(2) : null;
      const insertParams = [userId, sessionId, providerTransactionId, 'paid', amountCents, amountDecimal, currency, priceId, productId, payment_method, customer_id, receipt_url, rawResponse];
      try {
        const insertResult = await pool.query(insertQuery, insertParams);
        if (insertResult.rows && insertResult.rows[0]) transaction = insertResult.rows[0];
      } catch (e) {
        console.error('Failed to insert stripe_payments:', e.message);
        return sendErrorResponse(res, 500, 'DB_ERROR', 'Failed to save payment');
      }
    }

    // Handle subscription persistence + user plan flags (badge/premium/banner)
    let subscriptionRecord = null;
    if (resolvedPlanId) {
      try {
        const amountDecimal = amountCents ? (Number(amountCents) / 100).toFixed(2) : "0.00";
        // Determine expires_at
        let expiresAt = null;
        if (paymentMode === 'subscription') {
          try {
            const stripeSub = await stripeInstance.subscriptions.retrieve(providerTransactionId);
            expiresAt = stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000) : null;
          } catch (e) {
            console.warn('Could not retrieve subscription details for expires_at:', e.message);
          }
        } else {
          // Default to 1 month for 'payment' mode subscriptions
          expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        }

        const transactionId = transaction?.id || null;
        if (!transactionId) {
          console.warn('[DEBUG] No transaction ID found, skipping subscription creation');
          // If we are here, it means we have a plan_id but no transaction link. 
          // We can still try to find a transaction by providerTransactionId
        }

        const existSub = await pool.query(
          `SELECT * FROM subscription WHERE transaction_id = $1 AND user_id = $2 AND status = 'active' LIMIT 1`,
          [transactionId, userId]
        );
        if (existSub.rows && existSub.rows[0]) {
          subscriptionRecord = existSub.rows[0];
          // Upgrade path: keep one active row but refresh plan_id / price / expiry
          try {
            await pool.query(
              `UPDATE subscription SET plan_id = $1, price = $2, expired_at = $3, updated_at = NOW() WHERE id = $4`,
              [String(resolvedPlanId), amountDecimal, expiresAt, subscriptionRecord.id]
            );
          } catch (e) {
            console.warn("Failed to refresh subscription plan on re-verify:", e.message);
          }
          console.log(`[DEBUG] Existing active subscription found: ID=${subscriptionRecord.id}`);
        } else {
          // Soft-close prior active badge plans so Blue→Gold doesn't leave stale rows as "current"
          if (String(resolvedPlanId).toLowerCase().includes("badge")) {
            try {
              await pool.query(
                `UPDATE subscription SET status = 'inactive', updated_at = NOW()
                 WHERE user_id = $1 AND status = 'active' AND plan_id ILIKE '%badge%'`,
                [userId]
              );
            } catch (e) {
              console.warn("Failed to mark previous badge subscriptions replaced:", e.message);
            }
          }
          console.log(`[DEBUG] Creating new subscription record for user=${userId}, plan=${resolvedPlanId}`);
          const insertSubQuery = `
            INSERT INTO subscription
            (user_id, plan_id, price, status, transaction_id, expired_at, created_at, updated_at)
            VALUES ($1, $2, $3, 'active', $4, $5, NOW(), NOW())
            RETURNING *
          `;
          const subParams = [userId, String(resolvedPlanId), amountDecimal, transactionId, expiresAt];
          const subResult = await pool.query(insertSubQuery, subParams);
          if (subResult.rows && subResult.rows[0]) {
            subscriptionRecord = subResult.rows[0];
            console.log(`[DEBUG] Subscription record created: ID=${subscriptionRecord.id}`);
          }
        }

        // Always apply plan flags so Blue subscribe and Blue→Gold upgrade update users.badge
        console.log(`[DEBUG] Updating user status for plan_id: ${resolvedPlanId}`);
        const planUpdate = buildUserPlanUpdate(resolvedPlanId, amountDecimal);
        if (!planUpdate.query) {
          console.warn("buildUserPlanUpdate skipped:", planUpdate.error);
        } else {
          try {
            const updated = await pool.query(planUpdate.query, planUpdate.params(userId));
            console.log(`[DEBUG] User plan update rowCount=${updated.rowCount}`);
          } catch (e) {
            console.warn("Failed to update user status:", e.message);
          }
        }

      } catch (e) {
        console.warn('Failed to create/check subscription record:', e.message);
      }
    } else {
      console.warn("[DEBUG] No resolved plan_id — user badge/premium flags NOT updated");
    }

    // return status, payment id, and applied plan so FE can refresh badge UI
    const paymentId = transaction && transaction.id ? transaction.id : null;
    let userSnapshot = null;
    try {
      const u = await pool.query(
        `SELECT id, is_subscribed, badge, badge_subscription_key, is_premium, premium_subscription_key, banner_subscript_key, two_fa_enabled
         FROM users WHERE id = $1`,
        [userId]
      );
      userSnapshot = u.rows[0] || null;
    } catch (e) {
      console.warn("Could not load user snapshot after verify:", e.message);
    }
    return sendSuccessResponse(res, 'Session verified and saved', {
      status: paymentId ? 'paid' : 'not_saved',
      payment_id: paymentId,
      plan_id: resolvedPlanId,
      user: userSnapshot,
    });
  } catch (err) {
    console.error('verifyCheckoutSession error', err);
    return sendErrorResponse(res, 500, 'STRIPE_ERROR', err.message || 'Stripe error');
  }
};

export const createMobileUserPaymentIntent = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const {
      priceId,
      lookupKey,
      plan_id,
      amount,
      currency: rawCurrency = 'usd',
      banner_tier,
      days,
      category_table,
    } = req.body;

    if (!priceId && !lookupKey && (amount === undefined || amount === null || amount === "")) {
      return sendErrorResponse(res, 400, "MISSING_PARAMS", "amount, priceId or lookupKey is required");
    }

    if (!userId) {
      return sendErrorResponse(res, 401, "UNAUTHORIZED", "User authentication required");
    }

    const user = await checkUserExist(userId);
    if (!user) {
      return sendErrorResponse(res, 404, "USER_NOT_FOUND", "User not found");
    }

    let unitAmount = 0;
    let currency = (rawCurrency || 'usd').toLowerCase();
    let productId = null;
    let finalPriceId = priceId || null;

    // Banner payments are priced by the banner flow (amount sent by the client).
    // Subscription / badge plans are ALWAYS priced by Stripe: a client amount is ignored.
    const isBannerRequest = Boolean(
      banner_tier ||
      category_table ||
      (plan_id && String(plan_id).toLowerCase().includes("banner")) ||
      (lookupKey && String(lookupKey).toLowerCase().includes("banner"))
    );
    let verifiedPlanKey = null;

    if (isBannerRequest && amount !== undefined && amount !== null && amount !== "") {
      unitAmount = Math.round(Number(amount) * 100);
      if (!Number.isFinite(unitAmount) || unitAmount < 50) {
        return sendErrorResponse(res, 400, "INVALID_AMOUNT", "Invalid payment amount");
      }
    } else if (lookupKey || priceId) {
      // Resolve lookup key to price id if provided
      if (!finalPriceId && lookupKey) {
        try {
          const prices = await stripeInstance.prices.list({ lookup_keys: [lookupKey], limit: 1 });
          if (prices && prices.data && prices.data.length > 0) {
            finalPriceId = prices.data[0].id;
          }
        } catch (e) {
          console.warn('Failed resolving lookupKey in createMobileUserPaymentIntent:', e.message);
        }

        if (!finalPriceId) {
          return sendErrorResponse(
            res, 
            404, 
            "INVALID_LOOKUP_KEY", 
            `Stripe price not found for lookupKey: "${lookupKey}". Please use a valid lookup key.`
          );
        }
      }

      // Try to get real price details, fallback if needed
      try {
        if (finalPriceId) {
          const price = await stripeInstance.prices.retrieve(finalPriceId);
          unitAmount = price.unit_amount;
          currency = price.currency;
          productId = price.product;
          verifiedPlanKey = price.lookup_key || finalPriceId;
        }
      } catch (e) {
        return sendErrorResponse(res, 400, "PRICE_NOT_FOUND", "Could not load the price for this plan");
      }
    } else {
      return sendErrorResponse(res, 400, "MISSING_PARAMS", "priceId or lookupKey is required");
    }

    if (!Number.isFinite(unitAmount) || unitAmount <= 0) {
      return sendErrorResponse(res, 400, "INVALID_AMOUNT", "Invalid payment amount");
    }

    let customerId = user.customer_id;
    let ephemeralKeySecret = null;
    let paymentIntentClientSecret = null;
    let paymentIntentId = null;

    const isBanner = isBannerRequest;

    try {
      if (!customerId && user.email) {
        const customer = await stripeInstance.customers.create({
          name: user.username || "",
          email: user.email,
        });
        customerId = customer.id;
        await updateUserWithCustomerId(customerId, userId);
      }

      if (customerId) {
        const ephemeralKey = await stripeInstance.ephemeralKeys.create(
          { customer: customerId },
          { apiVersion: '2023-10-16' }
        );
        ephemeralKeySecret = ephemeralKey.secret;

        const paymentIntent = await stripeInstance.paymentIntents.create({
          amount: unitAmount,
          currency: currency,
          customer: customerId,
          metadata: {
            userId: String(userId),
            planId: String(isBanner ? (banner_tier ? `banner-${banner_tier}-key` : "banner") : (verifiedPlanKey || "")),
            priceId: finalPriceId || "",
            productId: productId || "",
            banner_tier: banner_tier ? String(banner_tier) : "",
            category_table: category_table ? String(category_table) : "",
            days: days ? String(days) : "",
            payment_type: isBanner ? "banner" : "subscription",
          },
          automatic_payment_methods: {
            enabled: true,
          },
        });
        paymentIntentClientSecret = paymentIntent.client_secret;
        paymentIntentId = paymentIntent.id;
      }
    } catch (e) {
      console.error('Stripe Intent creation failed:', e.message);
    }

    if (!paymentIntentId || !paymentIntentClientSecret) {
      return sendErrorResponse(res, 502, "PAYMENT_UNAVAILABLE", "Could not start the payment. Please try again.");
    }

    return sendSuccessResponse(res, 'Mobile payment intent created', {
      paymentIntent: paymentIntentClientSecret,
      paymentIntentId,
      ephemeralKey: ephemeralKeySecret,
      customer: customerId,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      amount: (unitAmount / 100).toFixed(2),
      amount_cents: unitAmount,
    });
  } catch (err) {
    console.error('createMobileUserPaymentIntent error', err);
    return sendErrorResponse(res, 500, 'STRIPE_ERROR', err.message || 'Stripe error');
  }
};

export const verifyMobileUserPaymentIntent = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { paymentIntentId, plan_id, amount, banner_id } = req.body;

    if (!userId) return sendErrorResponse(res, 401, 'AUTH_REQUIRED', 'Authentication required');
    if (!paymentIntentId) return sendErrorResponse(res, 400, 'MISSING_INTENT_ID', 'paymentIntentId is required');

    const cleanPaymentIntentId = String(paymentIntentId).split('_secret_')[0].trim();

    if (!stripeInstance || !/^pi_[A-Za-z0-9]+$/.test(cleanPaymentIntentId)) {
      return sendErrorResponse(res, 400, 'INVALID_INTENT_ID', 'Invalid payment intent id');
    }

    let paymentIntent = null;
    try {
      paymentIntent = await stripeInstance.paymentIntents.retrieve(cleanPaymentIntentId);
    } catch (e) {
      return sendErrorResponse(res, 400, 'STRIPE_VERIFICATION_FAILED', 'Could not verify this payment with Stripe');
    }

    // The intent must have been created for THIS user.
    if (String(paymentIntent?.metadata?.userId || '') !== String(userId)) {
      return sendErrorResponse(res, 403, 'INTENT_OWNER_MISMATCH', 'This payment does not belong to your account');
    }

    if (paymentIntent.status !== 'succeeded') {
      // Stripe TEST mode only (never production): confirm with the test card so QA can complete a flow.
      if (!paymentIntent.livemode && process.env.NODE_ENV !== 'production') {
        try {
          paymentIntent = await stripeInstance.paymentIntents.confirm(cleanPaymentIntentId, {
            payment_method: 'pm_card_visa',
            return_url: 'https://example.com/return',
          });
        } catch (confirmErr) {
          console.warn("Auto-confirm test payment intent failed:", confirmErr.message);
        }
      }
      if (paymentIntent.status !== 'succeeded') {
        return sendErrorResponse(
          res,
          400,
          'PAYMENT_NOT_SUCCEEDED',
          `Payment has not succeeded on Stripe. Current status: ${paymentIntent.status}`
        );
      }
    }

    const providerTransactionId = paymentIntent?.id || cleanPaymentIntentId;
    const resolvedCents = paymentIntent.amount;
    const currency = paymentIntent?.currency || 'usd';
    const amountDecimal = (Number(resolvedCents) / 100).toFixed(2);
    // Plan and payment type come from the intent that WE created, never from the request body.
    const targetPlanId = paymentIntent?.metadata?.planId || null;

    const isBanner = Boolean(
      paymentIntent?.metadata?.payment_type === 'banner' ||
      (targetPlanId && String(targetPlanId).toLowerCase().includes("banner"))
    );

    // Only validate subscription plan if this is NOT a banner payment
    if (targetPlanId && !isBanner) {
      const planUpdateCheck = buildUserPlanUpdate(targetPlanId, amountDecimal);
      if (planUpdateCheck.error) {
        return sendErrorResponse(res, 400, 'INVALID_PLAN_ID', `Invalid plan_id: "${targetPlanId}". Please pass a valid subscription plan.`);
      }
    }

    // 1. Save to stripe_payments (Technical Log)
    let transaction = null;
    try {
      const exist = await pool.query(`SELECT * FROM stripe_payments WHERE provider_transaction_id = $1 LIMIT 1`, [providerTransactionId]);
      if (exist.rows && exist.rows[0]) transaction = exist.rows[0];
    } catch (e) { console.warn('Could not check existing stripe_payments:', e.message); }

    if (transaction && Number(transaction.user_id) !== Number(userId)) {
      return sendErrorResponse(res, 403, 'PAYMENT_ALREADY_USED', 'This payment was already used by another account');
    }

    if (!transaction) {
      const rawResponse = JSON.stringify(paymentIntent);
      const insertQuery = `
        INSERT INTO stripe_payments
        (user_id, banner_id, provider_transaction_id, status, amount_cents, amount_decimal, currency, price_id, raw_response, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW()) RETURNING *
      `;
      try {
        const insertResult = await pool.query(insertQuery, [
          userId, 
          banner_id || null, 
          providerTransactionId, 
          'paid', 
          resolvedCents, 
          amountDecimal, 
          currency, 
          paymentIntent?.metadata?.priceId || null,
          rawResponse
        ]);
        if (insertResult.rows && insertResult.rows[0]) transaction = insertResult.rows[0];
        
        // 2. Also Save to transactions table (User facing history) using decimal amount (dollars)
        await saveTransactions(userId, banner_id || null, amountDecimal);
      } catch (e) { console.warn('Failed to insert transaction records:', e.message); }
    }

    // Update banner if banner_id provided
    if (banner_id && providerTransactionId) {
      try {
        await pool.query(
          `UPDATE banner SET transaction_id = $1, paid_status = TRUE WHERE id = $2 AND user_id = $3`,
          [providerTransactionId, banner_id, userId]
        );
      } catch (e) {
        console.warn("Failed to update banner with transaction ID:", e.message);
      }
    }

    // 3. Update User Profile & Subscription Status
    if (targetPlanId && !isBanner) {
      console.log(`[DEBUG] Updating user status for plan_id: ${targetPlanId}`);
      const planUpdate = buildUserPlanUpdate(targetPlanId, amountDecimal);
      if (planUpdate.query) {
        try {
          await pool.query(planUpdate.query, planUpdate.params(userId));
        } catch (e) {
          console.warn("Failed to update user status:", e.message);
        }
      } else {
        console.warn("buildUserPlanUpdate skipped:", planUpdate.error);
      }
      
      // Create subscription record (idempotent)
      try {
        const existSub = await pool.query(`SELECT * FROM subscription WHERE transaction_id = $1 AND user_id = $2 LIMIT 1`, [transaction?.id, userId]);
        if (!existSub.rows || !existSub.rows[0]) {
           const insertSubQuery = `
            INSERT INTO subscription
            (user_id, plan_id, price, status, transaction_id, expired_at, created_at, updated_at)
            VALUES ($1, $2, $3, 'active', $4, $5, NOW(), NOW())
          `;
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 1 month
          await pool.query(insertSubQuery, [userId, String(targetPlanId), amountDecimal, transaction?.id, expiresAt]);
        }
      } catch (e) { console.warn('Failed to create subscription record:', e.message); }
    } else if (isBanner && targetPlanId) {
      // For banners, optionally update banner_subscript_key on users table
      try {
        await pool.query("UPDATE users SET banner_subscript_key = $1 WHERE id = $2", [String(targetPlanId), userId]);
      } catch (e) {
        console.warn("Failed to update users.banner_subscript_key:", e.message);
      }
    }

    return sendSuccessResponse(res, 'Payment verified with Stripe successfully', { 
      status: 'paid', 
      payment_id: transaction?.id,
      transaction_id: providerTransactionId,
      stripePaymentIntentId: providerTransactionId,
      amount: amountDecimal,
      plan_id: targetPlanId,
    });
  } catch (err) {
    console.error('verifyMobileUserPaymentIntent error', err);
    return sendErrorResponse(res, 500, 'STRIPE_ERROR', err.message || 'Error verifying payment intent');
  }
};

export const getUserTransactions = async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) return sendErrorResponse(res, 401, 'AUTH_REQUIRED', 'Authentication required');
  const page = parseInt(req.query.page || 1);
  const limit = parseInt(req.query.limit || 20);
  const offset = (page - 1) * limit;
  try {
    const transactionsResult = await retrieveTransactions(
      userId,
      limit,
      offset
    );

    if (!transactionsResult) {
      const message = `Transaction record are empty`;
      sendSuccessResponse(res, message, []);
    } else {
      const message = `Transaction record retrieved successfully!`;
      sendSuccessResponse(res, message, {
        count: transactionsResult.count,
        data: transactionsResult.data,
      });
    }
  } catch (error) {
    console.error("Error in getting users transactions", error);
    sendErrorResponse(
      res,
      ERROR_INTERNAL_SERVER.statusCode,
      ERROR_INTERNAL_SERVER.code,
      ERROR_INTERNAL_SERVER.message
    );
  }
};

export const getUserCards = async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) return sendErrorResponse(res, 401, 'AUTH_REQUIRED', 'Authentication required');
  const page = parseInt(req.query.page || 1);
  const limit = parseInt(req.query.limit || 20);
  const offset = (page - 1) * limit;
  try {
    const cardResult = await retrieveCards(userId, limit, offset);

    if (!cardResult) {
      const message = `Card record are empty`;
      sendSuccessResponse(res, message, []);
    } else {
      const message = `Card record retrieved successfully!`;
      sendSuccessResponse(res, message, {
        count: cardResult.count,
        data: cardResult.data,
      });
    }
  } catch (error) {
    console.error("Error in transferring payments", error);
    sendErrorResponse(
      res,
      ERROR_INTERNAL_SERVER.statusCode,
      ERROR_INTERNAL_SERVER.code,
      ERROR_INTERNAL_SERVER.message
    );
  }
};