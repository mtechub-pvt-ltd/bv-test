import {
  generateLogin2faCode,
  userHasBadge,
  isLogin2faRequired,
  formatLoginAlertTime,
  normalizeLoginOtp,
  isTwoFaCodeValid,
  hasActiveTwoFaCode,
} from "./loginSecurity.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const code = generateLogin2faCode();
assert(/^\d{4}$/.test(code), "OTP must be 4 digits");

assert(normalizeLoginOtp("3 4 8 9") === "3489", "spaces stripped");
assert(normalizeLoginOtp("3\u00a04\u00a08\u00a09") === "3489", "nbsp stripped");
assert(
  isTwoFaCodeValid("3489", new Date(Date.now() + 60000), "3 4 8 9") === true,
  "spaced otp matches"
);
assert(
  isTwoFaCodeValid("3489", new Date(Date.now() - 1000), "3489") === false,
  "expired rejected"
);
assert(
  hasActiveTwoFaCode({
    two_fa_code: "1234",
    two_fa_code_expires_at: new Date(Date.now() + 60000),
  }) === true,
  "active code"
);

assert(userHasBadge({ is_subscribed: true, badge: "gold" }) === true, "gold badge");
assert(userHasBadge({ is_subscribed: true, badge: "gold_badge_basic_annual_key" }) === true, "gold badge basic key");
assert(userHasBadge({ is_subscribed: true, badge: "blue" }) === true, "blue badge");
assert(userHasBadge({ is_subscribed: false, badge: "gold" }) === false, "inactive");
assert(userHasBadge({ is_subscribed: true, badge: null }) === false, "no tier");

assert(
  isLogin2faRequired({ is_subscribed: false, badge: null, two_fa_enabled: true }) === false,
  "free user never OTP even if flag stale"
);
assert(
  isLogin2faRequired({ is_subscribed: true, badge: "gold", two_fa_enabled: true }) === true,
  "gold with 2fa on"
);
assert(
  isLogin2faRequired({ is_subscribed: true, badge: "blue", two_fa_enabled: false }) === false,
  "blue with 2fa off"
);

const formatted = formatLoginAlertTime(new Date("2026-07-22T10:34:00.000Z"));
assert(typeof formatted === "string" && formatted.length > 5, "time string");

console.log("loginSecurity.test.js PASS");
