import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { extensionForMime } from "../utils/uploadSecurity.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_ROOT = path.resolve(__dirname, "../uploads");

/**
 * Resolve a client-supplied path to a file INSIDE uploads/. Returns null for anything
 * that escapes it (../, absolute paths) - QA report C7.
 */
function resolveInsideUploads(relPath) {
  if (!relPath || relPath.includes("\0")) return null;
  const full = path.resolve(UPLOADS_ROOT, relPath);
  if (!full.startsWith(UPLOADS_ROOT + path.sep)) return null;
  return full;
}

/**
 * Helper to extract relative filesystem path under `uploads/` from a file string or URL.
 */
function getRelativeFilePath(fileParam) {
  if (!fileParam || typeof fileParam !== "string") return null;
  let cleanPath = fileParam.trim();
  if (cleanPath.startsWith("http://") || cleanPath.startsWith("https://")) {
    try {
      const parsed = new URL(cleanPath);
      cleanPath = parsed.pathname;
    } catch {
      // Fallback
    }
  }
  cleanPath = cleanPath.replace(/^\/+/, "");
  if (cleanPath.startsWith("uploads/")) {
    cleanPath = cleanPath.replace(/^uploads\//, "");
  }
  return cleanPath;
}

/**
 * Robustly extract files from req.files (Array or Object) or req.file.
 */
function extractFilesFromRequest(req) {
  if (Array.isArray(req.files) && req.files.length) {
    return req.files;
  }
  if (req.files && typeof req.files === "object") {
    const flat = Object.values(req.files).flat();
    if (flat.length) return flat;
  }
  if (req.file) {
    return [req.file];
  }
  if (req.body) {
    const possibleBase64 = req.body.file || req.body.image || req.body.media || req.body.data;
    if (typeof possibleBase64 === "string" && possibleBase64.startsWith("data:")) {
      try {
        const matches = possibleBase64.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const ext = extensionForMime(mimeType);
          const maxBytes = req.uploadPolicy?.maxBytes || 5 * 1024 * 1024;
          if (!ext || Buffer.byteLength(base64Data, "base64") > maxBytes) {
            return [];
          }
          const filename = `base64-${Date.now()}-${Math.floor(Math.random() * 10000)}.${ext}`;
          const uploadDir = path.join(__dirname, "../uploads/fileUpload/");
          fs.mkdirSync(uploadDir, { recursive: true });
          const fullPath = path.join(uploadDir, filename);
          fs.writeFileSync(fullPath, Buffer.from(base64Data, "base64"));
          return [
            {
              filename,
              mimetype: mimeType,
              size: Buffer.byteLength(base64Data, "base64"),
              originalname: `signature.${ext}`,
            },
          ];
        }
      } catch (e) {
        console.error("Base64 decoding error:", e);
      }
    }
  }
  return [];
}

/**
 * Upload one or multiple media files (image/video).
 * POST /api/upload
 */
export const uploadMedia = async (req, res) => {
  try {
    const files = extractFilesFromRequest(req);
    if (!files.length) {
      return res.status(400).json({ statusCode: 400, message: "No file uploaded" });
    }

    const host = req.get("host") || "localhost:3801";
    const protocol = req.protocol || "http";
    const mediaPaths = files.map((file) => `/fileUpload/${file.filename}`);
    const fullUrls = files.map((file) => `${protocol}://${host}/fileUpload/${file.filename}`);

    res.status(200).json({
      statusCode: 200,
      status: true,
      message: "Media uploaded successfully",
      url: fullUrls[0],
      urls: fullUrls,
      file: mediaPaths,
      secure_url: fullUrls[0],
      storage_key: files[0].filename,
      mime_type: files[0].mimetype,
      file_size: files[0].size,
      original_filename: files[0].originalname,
    });
  } catch (error) {
    console.error("Upload media error:", error);
    res.status(500).json({ statusCode: 500, message: "Failed to upload media" });
  }
};

/**
 * Update/replace media file (uploads new file, deletes old file if provided).
 * PUT /api/upload
 */
export const updateMedia = async (req, res) => {
  try {
    const files = extractFilesFromRequest(req);
    if (!files.length) {
      return res.status(400).json({ statusCode: 400, message: "No new file uploaded for update" });
    }

    const oldFile = req.body?.oldFile || req.body?.oldUrl || req.query?.oldFile || req.query?.oldUrl;
    if (oldFile) {
      const relPath = getRelativeFilePath(oldFile);
      if (relPath) {
        const fullPath = resolveInsideUploads(relPath);
        if (fullPath && fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
          try {
            fs.unlinkSync(fullPath);
          } catch (e) {
            console.warn("Could not delete old file during update:", e.message);
          }
        }
      }
    }

    const host = req.get("host") || "localhost:3801";
    const protocol = req.protocol || "http";
    const mediaPaths = files.map((file) => `/fileUpload/${file.filename}`);
    const fullUrls = files.map((file) => `${protocol}://${host}/fileUpload/${file.filename}`);

    res.status(200).json({
      statusCode: 200,
      status: true,
      message: "Media updated successfully",
      url: fullUrls[0],
      urls: fullUrls,
      file: mediaPaths,
      secure_url: fullUrls[0],
      storage_key: files[0].filename,
      mime_type: files[0].mimetype,
      file_size: files[0].size,
      original_filename: files[0].originalname,
    });
  } catch (error) {
    console.error("Update media error:", error);
    res.status(500).json({ statusCode: 500, message: "Failed to update media" });
  }
};

/**
 * Delete media file from server storage.
 * DELETE /api/upload?file=...
 */
export const deleteMedia = async (req, res) => {
  try {
    const fileParam = req.query?.file || req.query?.url || req.body?.file || req.body?.url;
    if (!fileParam) {
      return res.status(400).json({ statusCode: 400, message: "File path or URL is required for deletion" });
    }

    const relPath = getRelativeFilePath(fileParam);
    if (!relPath) {
      return res.status(400).json({ statusCode: 400, message: "Invalid file parameter" });
    }

    const fullPath = resolveInsideUploads(relPath);
    if (!fullPath) {
      return res.status(400).json({ statusCode: 400, message: "Invalid file parameter" });
    }
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      fs.unlinkSync(fullPath);
      return res.status(200).json({
        statusCode: 200,
        status: true,
        message: "File deleted successfully",
      });
    } else {
      return res.status(404).json({
        statusCode: 404,
        status: false,
        message: "File not found on server",
      });
    }
  } catch (error) {
    console.error("Delete media error:", error);
    res.status(500).json({ statusCode: 500, message: "Failed to delete media" });
  }
};
