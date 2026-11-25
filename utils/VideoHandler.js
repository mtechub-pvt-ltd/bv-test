import multer from "multer";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { fileURLToPath } from "url";
import { getVideoDurationInSeconds } from "get-video-duration";
import pool from "../db.config/index.js";
import { getUploadLimits, formatUploadTierLabel } from "./uploadLimits.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DURATION_TOLERANCE_SEC = 1;

async function resolveUploadLimitsForRequest(req) {
  const userId = req.user?.userId;
  if (!userId) return getUploadLimits();
  const userRes = await pool.query(
    "SELECT is_subscribed, badge, badge_subscription_key FROM users WHERE id = $1 AND is_deleted = FALSE",
    [userId]
  );
  return getUploadLimits(userRes.rows[0] || {});
}

export const upload = (folderName) => {
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadPath = path.join(__dirname, `../uploads/${folderName}/`);
      fs.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      cb(null, uuidv4() + "-" + Date.now() + path.extname(file.originalname));
    },
  });

  const videoFilter = function (req, file, cb) {
    cb(null, true);
  };

  return multer({
    storage,
    fileFilter: videoFilter,
  });
};

export const uploadVideoWithLengthCheck = (folderName) => {
  const uploadMiddleware = upload(folderName).single("video");

  return (req, res, next) => {
    uploadMiddleware(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: err.message });
      }
      if (!req.file) {
        return next();
      }
      try {
        const userId = req.user?.userId;
        if (userId) {
          const { checkDailyVideoUploadLimit } = await import("./uploadLimits.js");
          const limitCheck = await checkDailyVideoUploadLimit(pool, userId);
          if (!limitCheck.allowed) {
            fs.unlinkSync(req.file.path);
            return res.status(403).json({
              message: limitCheck.message,
            });
          }
        }

        const limits = await resolveUploadLimitsForRequest(req);
        const tierLabel = formatUploadTierLabel(limits.badgeTier);
        if (req.file.size > limits.maxFileSizeBytes) {
          fs.unlinkSync(req.file.path);
          return res.status(400).json({
            message: `File exceeds your upload limit for ${tierLabel}. Upgrade to a Badge to unlock larger file uploads.`,
          });
        }

        const videoPath = req.file.path;
        const duration = await getVideoDurationInSeconds(videoPath);
        if (duration - limits.maxVideoDurationSec > DURATION_TOLERANCE_SEC) {
          fs.unlinkSync(videoPath);
          return res.status(400).json({
            message: `Video length exceeds your ${tierLabel} limit. Upgrade to a Badge to unlock longer video uploads.`,
          });
        }
        next();
      } catch (error) {
        console.error(error);
        if (req.file?.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(500).json({ message: "Video upload and check failed" });
      }
    });
  };
};
