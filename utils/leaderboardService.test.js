import assert from "assert";
import {
  resolveBadgeTier,
  assignRanks,
  buildEngagementScoreSql,
} from "./leaderboardService.js";

assert.strictEqual(resolveBadgeTier({ is_subscribed: true, badge: "gold" }), "gold");
assert.strictEqual(resolveBadgeTier({ is_subscribed: true, badge: "blue" }), "blue");
assert.strictEqual(resolveBadgeTier({ is_subscribed: false, badge: "gold" }), "free");
assert.strictEqual(resolveBadgeTier({ is_subscribed: true, badge: null }), "free");

const ranked = assignRanks([
  { id: 1, engagement_score: 10, is_subscribed: true, badge: "gold" },
  { id: 2, engagement_score: 10, is_subscribed: true, badge: "blue" },
  { id: 3, engagement_score: 5, is_subscribed: false, badge: null },
]);
assert.strictEqual(ranked[0].rank, 1);
assert.strictEqual(ranked[0].id, 1);
assert.strictEqual(ranked[0].badge_tier, "gold");
assert.strictEqual(ranked[1].rank, 2);
assert.strictEqual(ranked[1].badge_tier, "blue");
assert.strictEqual(ranked[2].rank, 3);
assert.strictEqual(ranked[2].badge_tier, "free");

const sql = buildEngagementScoreSql([
  {
    contentTable: "xpi_videos",
    likeTable: "like_video",
    likeFk: "video_id",
    commentTable: "video_comment",
    commentFk: "video_id",
  },
]);
assert(sql.includes("like_video"), "includes like table");
assert(sql.includes("video_comment"), "includes comment table");
assert(sql.includes("shared_post_id"), "includes share scoring");
assert(sql.includes("UNION ALL"), "unions metric fragments");

console.log("leaderboardService.test.js: PASS");
