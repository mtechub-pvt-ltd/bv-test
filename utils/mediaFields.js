/** @typedef {'image' | 'video'} MediaType */

/**
 * Single URL in `image` (on-news, qafi).
 * @param {{ image?: string, type?: string }} input
 * @returns {{ image: string, type: MediaType }}
 */
export function normalizeMediaFields(input = {}) {
  const rawType = String(input.type || "").toLowerCase().trim();
  const image = String(input.image || "").trim();

  if (rawType === "video" || rawType === "image") {
    return { image, type: rawType };
  }

  return { image, type: "image" };
}

/**
 * Separate `image` and `video` columns + `type` (sports, fan-star).
 * @param {{ image?: string, video?: string, type?: string }} input
 * @returns {{ image: string, video: string, type: MediaType }}
 */
export function normalizeSeparateMediaFields(input = {}) {
  const rawType = String(input.type || "").toLowerCase().trim();
  let image = String(input.image || "").trim();
  let video = String(input.video || "").trim();

  let type =
    rawType === "video" || rawType === "image"
      ? rawType
      : video
      ? "video"
      : "image";

  if (type === "video" && !video && image) {
    video = image;
    image = "";
  }
  if (type === "image" && !image && video) {
    image = video;
    video = "";
  }

  if (type === "video") {
    return { image, video, type: "video" };
  }
  return { image, video: "", type: "image" };
}

/**
 * Update: keep existing image/video/type when the client omits new media URLs.
 * @param {{ image?: string, video?: string, type?: string }} incoming
 * @param {{ image?: string, video?: string, type?: string }} existing
 */
export function mergeSeparateMediaForUpdate(incoming = {}, existing = {}) {
  const incImage = incoming.image !== undefined && incoming.image !== null;
  const incVideo = incoming.video !== undefined && incoming.video !== null;
  const incType = incoming.type !== undefined && incoming.type !== null && String(incoming.type).trim() !== "";
  const hasIncomingMedia =
    incType ||
    (incVideo && String(incoming.video).trim() !== "") ||
    (incImage && String(incoming.image).trim() !== "");

  if (!hasIncomingMedia) {
    const exType = String(existing.type || "").toLowerCase() === "video" ? "video" : "image";
    return {
      image: String(existing.image || "").trim(),
      video: String(existing.video || "").trim(),
      type: exType,
    };
  }

  return normalizeSeparateMediaFields({
    image: incImage ? incoming.image : existing.image,
    video: incVideo ? incoming.video : existing.video,
    type: incType ? incoming.type : existing.type,
  });
}

/**
 * Fan Star thumbnail on update (same rules as create).
 */
export function resolveFanStarThumbnailForUpdate({ media, thumbnail, existing }) {
  return resolveModuleVideoThumbnail({ media, thumbnail, existing });
}

/**
 * On-news & QAFI: separate video + thumbnail (legacy: video URL may still be in `image`).
 * @param {{ image?: string, video?: string, thumbnail?: string, type?: string }} input
 */
export function normalizeNewsQafiMediaFields(input = {}) {
  const rawType = String(input.type || "").toLowerCase().trim();
  let image = String(input.image || "").trim();
  let video = String(input.video || "").trim();
  const thumbnail = String(input.thumbnail || "").trim();

  let type =
    rawType === "video" || rawType === "image"
      ? rawType
      : video
      ? "video"
      : "image";

  if (type === "video") {
    if (!video && image) {
      video = image;
      image = "";
    }
    return { image, video, thumbnail, type: "video" };
  }

  if (!image && video) {
    image = video;
  }
  return { image, video: "", thumbnail: "", type: "image" };
}

/**
 * Update on-news / QAFI media when client omits unchanged URLs.
 */
export function mergeNewsQafiMediaForUpdate(incoming = {}, existing = {}) {
  const incImage = incoming.image !== undefined && incoming.image !== null;
  const incVideo = incoming.video !== undefined && incoming.video !== null;
  const incThumb = incoming.thumbnail !== undefined && incoming.thumbnail !== null;
  const incType =
    incoming.type !== undefined &&
    incoming.type !== null &&
    String(incoming.type).trim() !== "";
  const hasIncomingMedia =
    incType ||
    (incVideo && String(incoming.video).trim() !== "") ||
    (incImage && String(incoming.image).trim() !== "") ||
    (incThumb && String(incoming.thumbnail).trim() !== "");

  if (!hasIncomingMedia) {
    return normalizeNewsQafiMediaFields({
      image: existing.image,
      video: existing.video,
      thumbnail: existing.thumbnail,
      type: existing.type,
    });
  }

  return normalizeNewsQafiMediaFields({
    image: incImage ? incoming.image : existing.image,
    video: incVideo ? incoming.video : existing.video,
    thumbnail: incThumb ? incoming.thumbnail : existing.thumbnail,
    type: incType ? incoming.type : existing.type,
  });
}

/** Resolve playable video URL for API responses (supports legacy rows). */
export function resolveResponseVideo(row = {}) {
  const type = String(row.type || "").toLowerCase();
  const video = String(row.video || "").trim();
  const image = String(row.image || "").trim();
  if (type === "video") {
    return video || image || "";
  }
  return "";
}

/** Thumbnail/poster for video posts on API responses. */
export function resolveResponseThumbnail(row = {}) {
  const thumb = String(row.thumbnail || "").trim();
  if (thumb) return thumb;
  const type = String(row.type || "").toLowerCase();
  const image = String(row.image || "").trim();
  const video = resolveResponseVideo(row);
  if (type === "video" && image && image !== video) {
    return image;
  }
  return "";
}

export function buildNewsQafiOriginalPost(row) {
  if (!row?.shared_post_id) return null;
  const original = {
    id: row.shared_post_id,
    name: row.original_name,
    description: row.original_description,
    image: row.original_image,
    video: row.original_video,
    thumbnail: row.original_thumbnail,
    type: row.original_type,
    username: row.original_username,
    user_image: row.original_user_image,
    premium: row.original_premium,
    is_subscribed: row.original_is_subscribed,
    badge: row.original_badge,
    created_at: row.original_created_at,
  };
  original.video = resolveResponseVideo({
    type: original.type,
    video: original.video,
    image: original.image,
  });
  original.thumbnail = resolveResponseThumbnail({
    type: original.type,
    thumbnail: original.thumbnail,
    image: original.image,
    video: original.video,
  });
  if (String(original.type || "").toLowerCase() === "video") {
    original.image = original.thumbnail || "";
  }
  return original;
}

export function mapNewsQafiRow(row) {
  if (!row) return row;
  const mapped = { ...row };
  mapped.video = resolveResponseVideo(mapped);
  mapped.thumbnail = resolveResponseThumbnail(mapped);
  if (String(mapped.type || "").toLowerCase() === "video") {
    mapped.image = mapped.thumbnail || mapped.image || "";
  }
  mapped.original_post = buildNewsQafiOriginalPost(mapped);
  if (!mapped.shared_post_id) {
    mapped.original_post = null;
  }
  return mapped;
}

export function buildSportsOriginalPost(row) {
  if (!row?.shared_post_id) return null;
  return {
    id: row.shared_post_id,
    name: row.original_name,
    description: row.original_description,
    image: row.original_image,
    video: row.original_video,
    thumbnail: row.original_thumbnail,
    type: row.original_type,
    username: row.original_username,
    user_image: row.original_user_image,
    is_subscribed: row.original_is_subscribed,
    badge: row.original_badge,
    created_at: row.original_created_at,
  };
}

export function mapSportRow(row) {
  if (!row) return row;
  const mapped = { ...row };
  if (mapped.shared_post_id) {
    mapped.original_post = buildSportsOriginalPost(mapped);
  } else {
    mapped.original_post = null;
  }
  if (String(mapped.type || "").toLowerCase() === "video" && !mapped.thumbnail) {
    const image = String(mapped.image || "").trim();
    const video = String(mapped.video || "").trim();
    if (image && image !== video) {
      mapped.thumbnail = image;
    }
  }
  return mapped;
}

/**
 * Sports / fan-star thumbnail on create or update.
 */
export function resolveModuleVideoThumbnail({ media, thumbnail, existing }) {
  if (media.type === "image") {
    return media.image || "";
  }
  const thumbIn = String(thumbnail ?? "").trim();
  if (thumbIn) {
    return thumbIn;
  }
  const legacyPoster = String(media.image || "").trim();
  const video = String(media.video || "").trim();
  if (legacyPoster && legacyPoster !== video) {
    return legacyPoster;
  }
  const sameVideo =
    String(existing?.video || "").trim() &&
    String(existing.video).trim() === String(media.video || "").trim();
  if (sameVideo && String(existing?.thumbnail || "").trim()) {
    return String(existing.thumbnail).trim();
  }
  return "";
}

export default normalizeMediaFields;
