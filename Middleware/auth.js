import "dotenv/config";
import jwt from "jsonwebtoken";
import pool from "../db.config/index.js";

const JWT_SECRET = () => process.env.JWT_SECRET_KEY || process.env.JWT_SECRET;

const extractToken = (req) => {
  const header = req.headers?.authorization;
  if (!header || typeof header !== "string") return null;
  const parts = header.trim().split(/\s+/);
  if (parts.length === 2 && /^bearer$/i.test(parts[0])) return parts[1];
  return null;
};

const readUserId = (payload) => {
  const raw = payload?.userId ?? payload?.id ?? payload?.user_id;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const loadUser = async (userId) => {
  const { rows } = await pool.query(
    "SELECT id, username, role, is_deleted, block, image FROM users WHERE id = $1",
    [userId]
  );
  return rows[0] || null;
};

/**
 * Requires a valid login. The user identity ALWAYS comes from the token,
 * never from the request body. Sets:
 *   req.user      (token payload, kept for older controllers)
 *   req.authUser  { id, username, role, image }
 */
export const requireUser = async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ statusCode: 401, success: false, message: "Please log in to continue" });
  }
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET());
  } catch (err) {
    return res.status(401).json({ statusCode: 401, success: false, message: "Your session has expired. Please log in again" });
  }
  const userId = readUserId(payload);
  if (!userId) {
    return res.status(401).json({ statusCode: 401, success: false, message: "Invalid session" });
  }
  try {
    const user = await loadUser(userId);
    if (!user || user.is_deleted) {
      return res.status(401).json({ statusCode: 401, success: false, message: "Account not found" });
    }
    if (user.block) {
      return res.status(403).json({ statusCode: 403, success: false, message: "Your account has been blocked" });
    }
    req.user = { ...payload, userId };
    req.authUser = { id: user.id, username: user.username, role: user.role, image: user.image };
    return next();
  } catch (err) {
    console.error("requireUser error:", err.message);
    return res.status(500).json({ statusCode: 500, success: false, message: "Could not verify your session" });
  }
};

/** Same as requireUser, but anonymous visitors are let through (req.authUser stays undefined). */
export const optionalUser = async (req, res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, JWT_SECRET());
    const userId = readUserId(payload);
    if (userId) {
      const user = await loadUser(userId);
      if (user && !user.is_deleted && !user.block) {
        req.user = { ...payload, userId };
        req.authUser = { id: user.id, username: user.username, role: user.role, image: user.image };
      }
    }
  } catch {
    // invalid / expired token on a public endpoint: continue as a guest
  }
  return next();
};

/** Logged-in AND role = admin (checked in the database, not trusted from the client). */
export const requireAdmin = (req, res, next) =>
  requireUser(req, res, () => {
    if (String(req.authUser?.role || "").toLowerCase() !== "admin") {
      return res.status(403).json({ statusCode: 403, success: false, message: "Admin access required" });
    }
    return next();
  });
