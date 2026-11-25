/**
 * SQL safety helpers (QA report C4).
 *
 * Search controllers build `ILIKE '%word%'` clauses by string concatenation.
 * Every word is passed through safeSearchWord() first, which removes the only
 * characters that can break out of a quoted SQL string literal (quotes, backslash,
 * NUL, semicolon), so user input can never become SQL.
 */
export const safeSearchWord = (word) =>
  String(word ?? "")
    .replace(/[\u0000'"\\;]/g, "")
    .slice(0, 100);

/** Return `value` only if it is one of the allowed column names, otherwise the fallback. */
export const pickAllowed = (value, allowed, fallback) =>
  allowed.includes(String(value)) ? String(value) : fallback;

/** ASC or DESC only. */
export const pickSortOrder = (value, fallback = "DESC") => {
  const v = String(value || "").toUpperCase();
  return v === "ASC" || v === "DESC" ? v : fallback;
};
