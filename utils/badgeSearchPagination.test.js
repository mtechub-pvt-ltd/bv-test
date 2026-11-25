import {
  getBadgeTierFromRow,
  interleaveBadgeSearchResults,
  paginateBadgeSearchResults,
} from "./badgeSearchPagination.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function row(id, badge, subscribed, created_at) {
  return { id, badge, is_subscribed: subscribed, created_at };
}

function countTiers(rows) {
  return rows.reduce(
    (acc, r) => {
      acc[getBadgeTierFromRow(r)] += 1;
      return acc;
    },
    { gold: 0, blue: 0, normal: 0 }
  );
}

// Tier detection
assert(getBadgeTierFromRow(row(1, "gold", true)) === "gold", "gold tier");
assert(getBadgeTierFromRow(row(2, "blue", true)) === "blue", "blue tier");
assert(getBadgeTierFromRow(row(3, "blue", false)) === "normal", "unsubscribed blue -> normal");
assert(getBadgeTierFromRow(row(4, null, false)) === "normal", "normal tier");

// 20 rows: expect ~10 gold, ~6 blue, ~4 normal in first 20 slots
const sample = [
  ...Array.from({ length: 8 }, (_, i) => row(`g${i}`, "gold", true, `2026-01-${10 - i}`)),
  ...Array.from({ length: 8 }, (_, i) => row(`b${i}`, "blue", true, `2026-02-${10 - i}`)),
  ...Array.from({ length: 8 }, (_, i) => row(`n${i}`, null, false, `2026-03-${10 - i}`)),
];

const mixed = interleaveBadgeSearchResults(sample);
assert(mixed.length === 24, "preserves all rows");

const first10 = countTiers(mixed.slice(0, 10));
assert(first10.gold === 5, `page1 gold expected 5 got ${first10.gold}`);
assert(first10.blue === 3, `page1 blue expected 3 got ${first10.blue}`);
assert(first10.normal === 2, `page1 normal expected 2 got ${first10.normal}`);

// Pagination page 2 (limit 10)
const page2 = paginateBadgeSearchResults(sample, 2, 10);
assert(page2.rows.length === 10, "page2 has 10 rows");
assert(page2.currentPage === 2, "page2 number");
assert(page2.total === 24, "total count");
assert(
  JSON.stringify(page2.rows.map((r) => r.id)) ===
    JSON.stringify(mixed.slice(10, 20).map((r) => r.id)),
  "page2 matches interleaved slice"
);

// Gold always before blue in slot priority when all present
const firstGoldIdx = mixed.findIndex((r) => getBadgeTierFromRow(r) === "gold");
const firstBlueIdx = mixed.findIndex((r) => getBadgeTierFromRow(r) === "blue");
const firstNormalIdx = mixed.findIndex((r) => getBadgeTierFromRow(r) === "normal");
assert(firstGoldIdx < firstBlueIdx, "gold appears before first blue in mix");
assert(firstBlueIdx < firstNormalIdx, "blue appears before first normal in mix");

console.log("badgeSearchPagination.test.js — all assertions passed");
