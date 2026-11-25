/**
 * Detect French UI from common client signals (query, Accept-Language, x-lang, cookies).
 */
function languageFromCookie(req) {
  const cookie = req.headers?.cookie;
  if (!cookie || typeof cookie !== "string") return "";
  const parts = cookie.split(";");
  for (const part of parts) {
    const p = part.trim();
    const eq = p.indexOf("=");
    if (eq === -1) continue;
    const k = p.slice(0, eq).trim().toLowerCase();
    let v = p.slice(eq + 1).trim();
    try {
      v = decodeURIComponent(v);
    } catch {
      /* keep raw */
    }
    v = v.toLowerCase();
    if (
      k === "i18next" ||
      k === "i18nextlng" ||
      k === "next_locale" ||
      k === "locale" ||
      k === "preferred_language" ||
      k === "preferredlanguage"
    )
      return v;
  }
  return "";
}

export function prefersFrench(req) {
  if (!req) return false;
  const raw = (key) => {
    const v = req.query?.[key];
    if (v === undefined || v === null) return "";
    return String(v).trim().toLowerCase();
  };
  const isFrToken = (s) =>
    s === "fr" ||
    s === "fra" ||
    s === "french" ||
    s === "fr-fr" ||
    s === "fr_fr";

  if (raw("lang") === "en" || raw("lang") === "english") return false;
  if (raw("language") === "en" || raw("language") === "english")
    return false;

  if (isFrToken(raw("lang")) || isFrToken(raw("language"))) return true;
  const loc = raw("locale");
  if (loc && (loc === "fr" || loc.startsWith("fr-") || loc.startsWith("fr_")))
    return true;

  const al = String(
    req.headers?.["accept-language"] || req.headers?.["Accept-Language"] || ""
  );
  const first = al.split(",")[0]?.split(";")[0]?.trim().toLowerCase() || "";
  if (first.startsWith("fr")) return true;

  const x = String(
    req.headers?.["x-lang"] ||
      req.headers?.["X-Lang"] ||
      req.headers?.["x-language"] ||
      ""
  )
    .trim()
    .toLowerCase();
  if (isFrToken(x)) return true;

  const ck = languageFromCookie(req);
  if (ck && (ck.startsWith("fr") || ck === "fra")) return true;

  return false;
}

/** Single-field display label for subcategories when clients only bind `sub_category_name`. */
export function pickSubcategoryDisplayName(name, frenchName, useFrench) {
  const n = name != null ? String(name) : "";
  const f = frenchName != null ? String(frenchName).trim() : "";
  if (!useFrench) return n;
  return f.length > 0 ? f : n;
}
