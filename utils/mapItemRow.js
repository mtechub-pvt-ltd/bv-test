function countItemImages(images) {
  if (!Array.isArray(images)) return 0;
  return images.filter((img) => {
    if (img == null) return false;
    if (typeof img === "string") return Boolean(String(img).trim());
    if (typeof img === "object") {
      return Boolean(img.image || img.url || img.path || img.secure_url);
    }
    return false;
  }).length;
}

/** Add `image_count` to mondo market item API rows (from `images` array). */
export function mapItemRow(row) {
  if (!row) return row;
  const mapped = { ...row };
  mapped.image_count = countItemImages(mapped.images);

  if (mapped.original_post && typeof mapped.original_post === "object") {
    mapped.original_post = {
      ...mapped.original_post,
      image_count: countItemImages(mapped.original_post.images),
    };
  }

  return mapped;
}

export function mapItemRows(rows) {
  return (rows || []).map(mapItemRow);
}

export default mapItemRow;
