/** @deprecated Use badgeSearchPagination.js for 50/30/20 mix. Kept for reference. */
export function badgeRankOrderBy(alias = "u") {
  return `CASE
    WHEN ${alias}.is_subscribed = TRUE AND LOWER(${alias}.badge) = 'gold' THEN 0
    WHEN ${alias}.is_subscribed = TRUE AND LOWER(${alias}.badge) = 'blue' THEN 1
    ELSE 2
  END`;
}

export default badgeRankOrderBy;
