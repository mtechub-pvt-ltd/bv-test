import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { fileURLToPath } from "url";
import pool from "../db.config/index.js";
import { requireUser, optionalUser } from "../Middleware/auth.js";
import { getUploadLimits } from "../utils/uploadLimits.js";
import { isAllowedUpload, extensionOf, ANONYMOUS_MAX_BYTES } from "../utils/uploadSecurity.js";
import {
  uploadMedia,
  updateMedia,
  deleteMedia,
} from "../Controllers/mediaController.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, "../uploads/fileUpload/");

const mediaRoute = Router();

/* ---------- anonymous (sign-up photo) throttle: 20 uploads / hour / IP ---------- */
const anonHits = new Map();
const anonThrottle = (req, res, next) => {
  const now = Date.now();
  const key = req.ip || "unknown";
  const recent = (anonHits.get(key) || []).filter((t) => now - t < 60 * 60 * 1000);
  if (recent.length >= 20) {
    return res.status(429).json({ statusCode: 429, success: false, message: "Too many uploads. Please try again later." });
  }
  recent.push(now);
  anonHits.set(key, recent);
  next();
};

/**
 * Work out who is uploading and how much they may upload.
 *  - logged in: size limit of their badge tier (free 20 MB, blue 50 MB, gold 200 MB)
 *  - anonymous: images only, 5 MB (needed for the profile photo on the sign-up form)
 */
const resolveUploadPolicy = async (req, res, next) => {
  try {
    if (req.authUser) {
      const { rows } = await pool.query(
        "SELECT is_subscribed, badge, badge_subscription_key FROM users WHERE id = $1",
        [req.authUser.id]
      );
      req.uploadPolicy = { imagesOnly: false, maxBytes: getUploadLimits(rows[0] || {}).maxFileSizeBytes };
    } else {
      req.uploadPolicy = { imagesOnly: true, maxBytes: ANONYMOUS_MAX_BYTES };
    }
    next();
  } catch (err) {
    console.error("resolveUploadPolicy error:", err.message);
    res.status(500).json({ statusCode: 500, success: false, message: "Could not verify upload permissions" });
  }
};

/** Build the multer handler for THIS request so the size limit matches the caller's plan. */
const secureUpload = (req, res, next) => {
  const { imagesOnly, maxBytes } = req.uploadPolicy;
  const handler = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        cb(null, UPLOAD_DIR);
      },
      // the extension is allow-listed below, so it is safe to keep
      filename: (_req, file, cb) => cb(null, `${uuidv4()}-${Date.now()}.${extensionOf(file.originalname)}`),
    }),
    limits: { fileSize: maxBytes, files: imagesOnly ? 1 : 10 },
    fileFilter: (_req, file, cb) => {
      if (!isAllowedUpload(file, { imagesOnly })) {
        const err = new Error(imagesOnly ? "Only image files can be uploaded without logging in" : "This file type is not allowed");
        err.code = "UPLOAD_TYPE_NOT_ALLOWED";
        return cb(err);
      }
      cb(null, true);
    },
  }).any();

  handler(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        statusCode: 413,
        success: false,
        message: `File is too large. Your limit is ${Math.round(maxBytes / (1024 * 1024))} MB.`,
      });
    }
    if (err.code === "UPLOAD_TYPE_NOT_ALLOWED" || err.name === "MulterError") {
      return res.status(400).json({ statusCode: 400, success: false, message: err.message });
    }
    console.error("upload error:", err);
    return res.status(500).json({ statusCode: 500, success: false, message: "Upload failed" });
  });
};

// Anonymous visitors may upload a (small) image; everything else needs a login.
mediaRoute.post(
  "/",
  optionalUser,
  (req, res, next) => (req.authUser ? next() : anonThrottle(req, res, next)),
  resolveUploadPolicy,
  secureUpload,
  uploadMedia
);
mediaRoute.put("/", requireUser, resolveUploadPolicy, secureUpload, updateMedia);
mediaRoute.delete("/", requireUser, deleteMedia);

export default mediaRoute;
