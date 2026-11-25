export function classifyPlan(planId) {
  const p = String(planId || "").toLowerCase();
  if (p.includes("badge")) return "badge";
  if (p.includes("banner")) return "banner";
  if (p.includes("premium") || p.includes("annual") || p.includes("vip")) return "premium";
  return "unknown";
}

export function badgeTierFromPlan(planId) {
  const p = String(planId || "").toLowerCase();
  if (p.includes("gold") && p.includes("premium")) return "gold_premium";
  if (p.includes("gold")) return "gold";
  if (p.includes("blue") && p.includes("premium")) return "blue_premium";
  if (p.includes("blue")) return "blue";
  return null;
}

/** users.subscription_amount is BIGINT — store whole cents. */
export function amountToCents(amountDecimal) {
  if (amountDecimal == null || amountDecimal === "") return null;
  const n = Number(amountDecimal);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

/**
 * Apply a paid plan to the user.
 * Badge plans always set is_subscribed + badge (+ key), so Blue→Gold upgrades replace the tier.
 */
export function buildUserPlanUpdate(planId, amountDecimal) {
  const planType = classifyPlan(planId);
  const amountCents = amountToCents(amountDecimal);

  if (planType === "unknown") {
    return {
      query: null,
      params: () => [],
      error: `Unknown subscription plan ID: "${planId}"`,
    };
  }

  if (planType === "banner") {
    return {
      query: "UPDATE users SET banner_subscript_key = $1 WHERE id = $2",
      params: (userId) => [planId, userId],
    };
  }

  if (planType === "badge") {
    const tier = badgeTierFromPlan(planId);
    if (!tier) {
      return {
        query: null,
        params: () => [],
        error: `Unknown badge tier for plan: ${planId}`,
      };
    }
    if (tier === "gold" || tier === "gold_premium") {
      // Gold Badge: Record subscription payment; update badge column if user's business verification is approved
      return {
        query: `UPDATE users SET is_subscribed = TRUE, badge_subscription_key = $1, subscription_amount = $2,
                badge = CASE WHEN EXISTS (SELECT 1 FROM gold_badge_applications WHERE user_id = $3 AND status = 'approved') THEN $1 ELSE badge END
                WHERE id = $3`,
        params: (userId) => [planId, amountCents, userId],
      };
    }
    // Blue & Blue Premium: keep existing two_fa_enabled; always set badge fields.
    return {
      query: `UPDATE users SET is_subscribed = TRUE, badge = $1, badge_subscription_key = $2, subscription_amount = $3 WHERE id = $4`,
      params: (userId) => [tier, planId, amountCents, userId],
    };
  }

  return {
    query: "UPDATE users SET premium_subscription_key = $1, is_premium = TRUE WHERE id = $2",
    params: (userId) => [planId, userId],
  };
}

/**
 * Resolve the plan from Stripe data only (the real price's lookup_key first, then the
 * metadata we wrote when the session was created). The client-supplied plan id is
 * deliberately NOT an input any more: it let a $0.50 payment unlock a gold plan.
 */
export function resolvePlanIdFromStripeSession(session, lineItems = []) {
  const lookup = lineItems?.[0]?.price?.lookup_key;
  if (lookup) return String(lookup);

  const meta =
    session?.metadata?.planId ||
    session?.metadata?.plan_id ||
    session?.metadata?.lookupKey ||
    session?.metadata?.lookup_key;
  if (meta) return String(meta);
  return null;
}
