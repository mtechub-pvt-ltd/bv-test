import { getUploadLimits } from "./uploadLimits.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// 1. Free account -> 3 videos/day, 20MB, 120s
const free = getUploadLimits({ is_subscribed: false, badge: null });
assert(free.maxFileSizeBytes === 20 * 1024 * 1024, "free size");
assert(free.maxVideoDurationSec === 120, "free duration");
assert(free.maxVideosPerDay === 3, "free daily videos");

// 2. Basic Blue -> 6 videos/day, 50MB, 600s
const blue = getUploadLimits({ is_subscribed: true, badge: "blue" });
assert(blue.maxFileSizeBytes === 50 * 1024 * 1024, "blue size");
assert(blue.maxVideoDurationSec === 600, "blue duration");
assert(blue.maxVideosPerDay === 6, "blue daily videos");

// 3. Blue Premium -> 10 videos/day, 50MB, 600s
const bluePrem = getUploadLimits({ is_subscribed: true, badge: "blue_premium" });
assert(bluePrem.maxVideosPerDay === 10, "blue_premium daily videos");

// 4. Basic Gold -> 20 videos/day, 200MB, 3600s
const gold = getUploadLimits({ is_subscribed: true, badge: "gold" });
assert(gold.maxFileSizeBytes === 200 * 1024 * 1024, "gold size");
assert(gold.maxVideoDurationSec === 3600, "gold duration");
assert(gold.maxVideosPerDay === 20, "gold daily videos");

// 5. Gold Premium -> 50 videos/day, 200MB, 3600s
const goldPrem = getUploadLimits({ is_subscribed: true, badge: "gold_premium" });
assert(goldPrem.maxVideosPerDay === 50, "gold_premium daily videos");

// 6. Inactive badge returns free
const inactiveGold = getUploadLimits({ is_subscribed: false, badge: "gold" });
assert(inactiveGold.badgeTier === "free", "inactive gold is free");
assert(inactiveGold.maxVideosPerDay === 3, "inactive gold daily videos is 3");

console.log("uploadLimits.test.js PASS - All 5 daily video limit tiers validated!");
