import pool from "../db.config/index.js";
import { requireUser } from "./auth.js";

/**
 * Central write-route policy (QA report C3).
 *
 * Every non-GET request must pass through here. It decides, in order:
 *   1. deleteAll* routes           -> blocked for everybody (they wipe whole tables)
 *   2. PUBLIC_WRITES               -> no login needed (sign-in flow, contact form)
 *   3. ADMIN_ONLY                  -> logged-in AND role = admin (checked in the DB)
 *   4. everything else             -> logged-in user, then
 *        a. identity check: any user id sent in the body must be the caller's own id
 *        b. ownership check: update/delete of a post must target the caller's own row
 * Admins bypass 4a and 4b.
 *
 * Paths here are the full URL path as the client calls it (lower-cased, no trailing slash).
 */

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const PUBLIC_WRITES = [
  "POST /user/login",
  "POST /user/register",
  "POST /user/verifyemailotp",
  "POST /user/resendemailverificationotp",
  "POST /user/forgetpassword",
  "POST /user/verifyotp",
  "POST /user/reset_password",
  "POST /user/validate_reset_password_link",
  "POST /contact/createmessage",
].map((s) => {
  const [method, p] = s.split(" ");
  return `${method} ${p.toLowerCase()}`; // method stays upper-case: it is compared with req.method
});

// Upload routes do their own checks (anonymous image-only upload is allowed for sign-up).
const SELF_GUARDED = [/^\/(api\/)?upload$/];

const ADMIN_ONLY = [
  // categories / sub-categories for every module
  /^\/app\/(createappcategory|updateappcategory|deleteappcategory)/,
  /^\/app\/appsubcategory/,
  /^\/(videocategory|piccategory|itemcategory|itemsubcategory|disccategory|discsubcategory)\//,
  /^\/(cinematics|fanstar|tvprogmax|kidvids|learninghobbies|sports)\/(category|sub_category)\//,
  /^\/(video|pic)\/sub_category\//,
  /^\/(qafi|gebc|news)\/(category|sub_category)\//,
  /^\/index\//,
  // site configuration / content managed from the admin portal
  /^\/bannerconfig\//,
  /^\/blog\/(createblog|deleteblog|updateblog)/,
  /^\/(pages|terms|policy)\/(create|update|createpage|updatepage)/,
  /^\/(rateapp|shareapp)\/(addlink|deletelink|updatelink)/,
  /^\/notification_type\//,
  /^\/contact\/(deletemessage|updatemessage|updatemessagestatus)/,
  /^\/itemreport\/[^/]+(\/status)?$/, // PATCH status / DELETE; POST "/" (report) stays user-level
  /^\/reported_user\/[^/]+\/status$/,
  /^\/banner\/updatebannerstatus/,
  // user administration
  /^\/user\/(blockunblockuser|restoreuser|createsubscription|admin\/)/,
];

// Routes under ADMIN_ONLY that regular users legitimately POST to.
const ADMIN_ONLY_EXCEPTIONS = [/^POST \/itemreport\/?$/];

// Actor-id fields that must equal the caller's id when present in the body.
const ACTOR_FIELDS = ["user_id", "userId", "sender_id", "follower_id", "liked_by_user_id"];
// /user/* routes address "the account" via `id`.
const USER_ROUTE_ID_FIELDS = ["id"];

// Posts a user may only change/delete when user_id on the row is theirs.
// idFrom: "param" = last path segment, "body" = body.id
const OWNED = [
  { re: /^\/pictour\/(deletepictour)\/([^/]+)$/, table: "pic_tours", idFrom: "param" },
  { re: /^\/pictour\/updatepictour$/, table: "pic_tours", idFrom: "body" },
  { re: /^\/qafi\/deleteqafi\/([^/]+)$/, table: "qafi", idFrom: "param" },
  { re: /^\/qafi\/updateqafi$/, table: "qafi", idFrom: "body" },
  { re: /^\/gebc\/deletegebc\/([^/]+)$/, table: "gebc", idFrom: "param" },
  { re: /^\/gebc\/updategebc$/, table: "gebc", idFrom: "body" },
  { re: /^\/news\/deletenews\/([^/]+)$/, table: "news", idFrom: "param" },
  { re: /^\/news\/updatenews$/, table: "news", idFrom: "body" },
  { re: /^\/item\/deleteitem\/([^/]+)$/, table: "item", idFrom: "param" },
  { re: /^\/item\/(updateitem|changepaidstatus)$/, table: "item", idFrom: "body", idFields: ["item_id", "id"] },
  { re: /^\/letter\/deleteletter\/([^/]+)$/, table: "post_letters", idFrom: "param" },
  { re: /^\/letter\/(updatepostletter|updatepostletterimages)$/, table: "post_letters", idFrom: "body", idFields: ["letterId", "letter_id", "id"] },
  { re: /^\/signature\/deletesignature\/([^/]+)$/, table: "signature", idFrom: "param" },
  { re: /^\/signature\/updatesignature$/, table: "signature", idFrom: "body" },
  { re: /^\/banner\/deletebanner\/([^/]+)$/, table: "banner", idFrom: "param" },
  { re: /^\/banner\/updatebanner$/, table: "banner", idFrom: "body" },
  { re: /^\/massapp\/removemassapp\/([^/]+)$/, table: "mass_app", idFrom: "param" },
  { re: /^\/xpi\/deletexpivideo\/([^/]+)$/, table: "xpi_videos", idFrom: "param" },
  { re: /^\/xpi\/updatexpivideo$/, table: "xpi_videos", idFrom: "body" },
  // video-style modules
  { re: /^\/cinematics\/delete\/([^/]+)$/, table: "cinematics_videos", idFrom: "param" },
  { re: /^\/cinematics\/update$/, table: "cinematics_videos", idFrom: "body" },
  { re: /^\/fanstar\/delete\/([^/]+)$/, table: "fan_star_videos", idFrom: "param" },
  { re: /^\/fanstar\/update$/, table: "fan_star_videos", idFrom: "body" },
  { re: /^\/tvprogmax\/delete\/([^/]+)$/, table: "tv_progmax_videos", idFrom: "param" },
  { re: /^\/tvprogmax\/update$/, table: "tv_progmax_videos", idFrom: "body" },
  { re: /^\/kidvids\/delete\/([^/]+)$/, table: "kid_vids_videos", idFrom: "param" },
  { re: /^\/kidvids\/update$/, table: "kid_vids_videos", idFrom: "body" },
  { re: /^\/learninghobbies\/delete\/([^/]+)$/, table: "learning_hobbies_videos", idFrom: "param" },
  { re: /^\/learninghobbies\/update$/, table: "learning_hobbies_videos", idFrom: "body" },
  { re: /^\/sports\/delete\/([^/]+)$/, table: "sports", idFrom: "param" },
  { re: /^\/sports\/update$/, table: "sports", idFrom: "body" },
];

const normalise = (p) => {
  let s = String(p || "/").toLowerCase().split("?")[0];
  if (s.length > 1) s = s.replace(/\/+$/, "");
  return s;
};

const deny = (res, status, message) =>
  res.status(status).json({ statusCode: status, success: false, message });

const isAdmin = (req) => String(req.authUser?.role || "").toLowerCase() === "admin";

const checkIdentity = (req, path) => {
  const body = req.body && typeof req.body === "object" ? req.body : null;
  if (!body) return true;
  const me = Number(req.authUser.id);
  const fields = path.startsWith("/user/") ? [...ACTOR_FIELDS, ...USER_ROUTE_ID_FIELDS] : ACTOR_FIELDS;
  for (const f of fields) {
    if (body[f] === undefined || body[f] === null || body[f] === "") continue;
    if (Number(body[f]) !== me) return false;
  }
  // Account routes that carry the account id in the URL: /user/deleteUser/:id etc.
  const m = path.match(/^\/user\/(deleteuser|deleteuserpermanently)\/([^/]+)$/);
  if (m && Number(m[2]) !== me) return false;
  return true;
};

const checkOwnership = async (req, path) => {
  for (const rule of OWNED) {
    const m = path.match(rule.re);
    if (!m) continue;
    // Every id the controller might read must belong to the caller (a request that carries
    // two different id fields cannot smuggle a victim's id past the check).
    const rawIds =
      rule.idFrom === "param"
        ? [m[m.length - 1]]
        : (rule.idFields || ["id"]).map((f) => req.body?.[f]).filter((v) => v !== undefined && v !== null && v !== "");
    for (const rawId of rawIds) {
      const id = Number(rawId);
      if (!Number.isInteger(id) || id <= 0) continue; // controller returns its own 400
      // Table names come from the constant list above, never from the request.
      const { rows } = await pool.query(`SELECT user_id FROM ${rule.table} WHERE id = $1`, [id]);
      if (rows.length === 0) continue; // controller returns its own 404
      if (Number(rows[0].user_id) !== Number(req.authUser.id)) return { ok: false };
    }
    return { ok: true };
  }
  return { ok: true };
};

export const writePolicy = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  const path = normalise(req.originalUrl || req.url);
  const key = `${req.method} ${path}`;

  if (SELF_GUARDED.some((re) => re.test(path))) return next();

  if (/\/deleteall/.test(path)) {
    return deny(res, 403, "This bulk-delete route is disabled");
  }

  if (PUBLIC_WRITES.includes(key)) return next();

  const adminOnly =
    ADMIN_ONLY.some((re) => re.test(path)) && !ADMIN_ONLY_EXCEPTIONS.some((re) => re.test(key));

  return requireUser(req, res, async () => {
    try {
      if (isAdmin(req)) return next();
      if (adminOnly) return deny(res, 403, "Admin access required");
      if (!checkIdentity(req, path)) return deny(res, 403, "You can only act on your own account");
      const own = await checkOwnership(req, path);
      if (!own.ok) return deny(res, 403, "You can only change your own posts");
      return next();
    } catch (err) {
      console.error("writePolicy error:", err.message);
      return deny(res, 500, "Could not verify permissions");
    }
  });
};
