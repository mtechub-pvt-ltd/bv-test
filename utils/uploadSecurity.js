import path from "path";

/**
 * Upload allow-list (QA report C7).
 *
 * Only these extensions are ever stored. Anything that a browser can execute
 * (.html, .svg, .js, .xml ...) or that a server can run (.exe, .php ...) is refused,
 * whatever Content-Type the client claims.
 */
const IMAGE_EXT = ["jpg", "jpeg", "png", "gif", "webp", "avif", "bmp", "heic", "heif"];
const VIDEO_EXT = ["mp4", "webm", "mov", "m4v", "ogv", "avi", "mkv", "3gp"];
const AUDIO_EXT = ["mp3", "wav", "ogg", "m4a", "aac", "weba"];
const DOC_EXT = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "rtf", "zip"];

export const IMAGE_EXTENSIONS = new Set(IMAGE_EXT);
export const ALLOWED_EXTENSIONS = new Set([...IMAGE_EXT, ...VIDEO_EXT, ...AUDIO_EXT, ...DOC_EXT]);

const BLOCKED_MIME = /^(text\/html|text\/javascript|application\/javascript|application\/x-javascript|image\/svg\+xml|application\/xhtml\+xml|text\/xml|application\/xml|application\/x-msdownload|application\/x-sh|application\/x-httpd-php)/i;

export const extensionOf = (filename) =>
  path.extname(String(filename || "")).replace(".", "").toLowerCase();

/** mime type from a data: URL -> safe extension, or null when not allowed */
const MIME_TO_EXT = {
  "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/gif": "gif",
  "image/webp": "webp", "image/avif": "avif", "image/bmp": "bmp", "image/heic": "heic", "image/heif": "heif",
  "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov", "video/ogg": "ogv",
  "audio/mpeg": "mp3", "audio/wav": "wav", "audio/ogg": "ogg", "audio/mp4": "m4a", "audio/aac": "aac",
  "application/pdf": "pdf",
};
export const extensionForMime = (mime) => MIME_TO_EXT[String(mime || "").toLowerCase()] || null;

/** Is this multer file acceptable? `imagesOnly` is used for anonymous (sign-up) uploads. */
export const isAllowedUpload = (file, { imagesOnly = false } = {}) => {
  const ext = extensionOf(file?.originalname);
  const mime = String(file?.mimetype || "");
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) return false;
  if (BLOCKED_MIME.test(mime)) return false;
  if (imagesOnly) return IMAGE_EXTENSIONS.has(ext) && mime.startsWith("image/");
  return true;
};

export const ANONYMOUS_MAX_BYTES = 5 * 1024 * 1024;
