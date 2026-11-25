/**
 * Last line of defence against leaking secrets (QA report C1 / C2).
 *
 * Many controllers return whole `users` rows. This wraps res.json and removes
 * credential-type columns from every object in the payload, whatever route sent it.
 * Fields the owner legitimately needs (token, id, email, ...) are untouched.
 */

const ALWAYS_STRIP = new Set([
  "password",
  "two_fa_code",
  "two_fa_code_expires_at",
  "fcm_token",
  "device_id",
  "customer_id",
  "stripe_customer_id",
  "reset_token",
]);

// `code` is the email / reset OTP on a users row, but a generic word elsewhere:
// only strip it from objects that look like a user row.
const looksLikeUserRow = (o) => "email" in o && ("role" in o || "username" in o);

const clean = (value, depth = 0) => {
  if (depth > 12 || value === null || typeof value !== "object") return value;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map((v) => clean(v, depth + 1));
  const userRow = looksLikeUserRow(value);
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (ALWAYS_STRIP.has(k)) continue;
    if (k === "code" && userRow) continue;
    out[k] = clean(v, depth + 1);
  }
  return out;
};

export const sanitizeResponse = (req, res, next) => {
  const original = res.json.bind(res);
  res.json = (body) => original(clean(body));
  next();
};

export const _clean = clean; // exported for tests
