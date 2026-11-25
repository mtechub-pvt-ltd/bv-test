/** Helpers for badge login 2FA + login alerts (time-only). */

/** Strip spaces / non-digits so emailed "3 4 8 9" still matches stored "3489". */
export function normalizeLoginOtp(value) {
  return String(value ?? "").replace(/\D/g, "");
}

export function generateLogin2faCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function getTwoFaExpiryDate(minutes = 10) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

export function isTwoFaCodeValid(storedCode, storedExpiresAt, submittedOtp) {
  const expected = normalizeLoginOtp(storedCode);
  const got = normalizeLoginOtp(submittedOtp);
  if (!expected || !got || expected.length < 4 || got !== expected) return false;
  if (!storedExpiresAt) return false;
  return new Date(storedExpiresAt).getTime() > Date.now();
}

/** True when DB still has a usable login OTP (avoid minting a new one on every Sign In click). */
export function hasActiveTwoFaCode(user) {
  const code = normalizeLoginOtp(user?.two_fa_code);
  if (!code || code.length < 4 || !user?.two_fa_code_expires_at) return false;
  return new Date(user.two_fa_code_expires_at).getTime() > Date.now();
}

export function formatLoginAlertTime(date = new Date()) {
  return (
    new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(date) + " UTC"
  );
}

export function userHasBadge(user) {
  const isSubscribed = user?.is_subscribed === true || user?.is_subscribed === "true";
  const badgeStr = String(user?.badge || "").toLowerCase();
  const hasBadgeTier =
    badgeStr === "blue" ||
    badgeStr === "gold" ||
    badgeStr.includes("blue") ||
    badgeStr.includes("gold");
  return Boolean(isSubscribed && hasBadgeTier);
}

/** OTP 2FA only for active Blue/Gold badge users who enabled it. Free users never get OTP. */
export function isLogin2faRequired(user) {
  return Boolean(userHasBadge(user) && user?.two_fa_enabled);
}

export function buildLoginUserPayload(row, token, deviceId) {
  return {
    id: row.id,
    token,
    username: row.username,
    email: row.email,
    block: row.block,
    image: row.image,
    device_id: deviceId || row.device_id,
    fcm_token: row.fcm_token || null,
    city: row.city,
    country: row.country,
    province: row.province,
    profession: row.profession,
    state: row.state,
    region: row.region,
    banner_subscript_key: row.banner_subscript_key,
    premium_subscription_key: row.premium_subscription_key,
    is_premium: row.is_premium,
    is_subscribed: row.is_subscribed,
    badge: row.badge,
    badge_subscription_key: row.badge_subscription_key,
    subscription_amount: row.subscription_amount,
    two_fa_enabled: isLogin2faRequired(row),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
