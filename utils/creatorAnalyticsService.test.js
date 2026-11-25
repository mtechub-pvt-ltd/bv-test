import { zeroFillSeries, buildDateRange, CREATOR_ANALYTICS_MODULES } from "./creatorAnalyticsService.js";
import { getModuleByKey } from "./creatorAnalyticsRegistry.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(CREATOR_ANALYTICS_MODULES.length === 13, "13 modules");
assert(getModuleByKey("videoMania")?.likeTable === "like_video", "video module");
assert(getModuleByKey("mondoMarket")?.likeFk === "item_id", "market item fk");

const range = buildDateRange(3);
assert(range.startDate && range.endDate, "date range");

const series = zeroFillSeries(3, [
  { date: range.endDate, views: 1, likes: 2, comments: 0 },
]);
assert(series.length === 3, "zero fill days");
assert(series[series.length - 1].likes === 2, "likes on filled day");

console.log("creatorAnalyticsService.test.js PASS");
