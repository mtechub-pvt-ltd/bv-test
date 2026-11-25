import { getLiveStreamLimits } from "./liveStreamLimits.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const free = getLiveStreamLimits({ is_subscribed: false, badge: null });
assert(free.badgeTier === "free", "free tier");
assert(free.quality === "480p", "free quality");
assert(free.maxDurationSec === 3600 && free.expiresIn === 3600, "free duration");

const blue = getLiveStreamLimits({ is_subscribed: true, badge: "blue" });
assert(blue.badgeTier === "blue" && blue.quality === "720p", "blue");
assert(blue.maxDurationSec === 9000 && blue.expiresIn === 9000, "blue duration");

const gold = getLiveStreamLimits({ is_subscribed: true, badge: "gold" });
assert(gold.badgeTier === "gold" && gold.quality === "1080p", "gold");
assert(gold.maxDurationSec === 14400 && gold.expiresIn === 14400, "gold duration");

const inactiveGold = getLiveStreamLimits({ is_subscribed: false, badge: "gold" });
assert(inactiveGold.badgeTier === "free", "inactive gold is free");

const noBadge = getLiveStreamLimits({ is_subscribed: true, badge: null });
assert(noBadge.badgeTier === "free", "subscribed without badge is free");

console.log("liveStreamLimits.test.js PASS");
