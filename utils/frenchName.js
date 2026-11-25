/** Normalize optional French label from JSON body (admin sends `french_name`). */
export function frenchNameFromRequest(req) {
  const raw = req.body?.french_name ?? req.body?.frenchName;
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  return s.length ? s : null;
}
