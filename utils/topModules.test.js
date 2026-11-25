import test from "node:test";
import assert from "node:assert/strict";
import {
  TOP_LIMIT,
  TOP_MODULES,
  listTopModules,
  resolveTopModule,
  toPositiveInt,
} from "./topModules.js";

const IDENT = /^[a-z_][a-z0-9_]*$/i;

test("limit is 3", () => assert.equal(TOP_LIMIT, 3));

test("every module has the required fields and safe identifiers", () => {
  for (const m of listTopModules()) {
    assert.ok(m.key && m.label && m.table && m.userColumn && m.titleColumns?.length, m.key);
    for (const id of [m.key, m.table, m.userColumn, m.categoryTable, m.categoryColumn,
      m.subCategoryTable, m.subCategoryColumn, ...m.titleColumns].filter(Boolean)) {
      assert.match(id, IDENT, `${m.key}: unsafe identifier ${id}`);
    }
    if (m.categoryTable) assert.ok(m.categoryColumn, `${m.key}: categoryColumn missing`);
    if (m.subCategoryTable) assert.ok(m.subCategoryColumn, `${m.key}: subCategoryColumn missing`);
  }
});

test("engagement tables / columns are plain identifiers and comment tables are known to the comment registry", async () => {
  const { COMMENT_MODULES } = await import("./commentModules.js");
  for (const m of listTopModules()) {
    if (!m.engagement) { assert.equal(m.key, "mass_apps"); continue; }
    for (const part of Object.values(m.engagement)) {
      assert.match(part.table, IDENT, `${m.key}: ${part.table}`);
      assert.match(part.column, IDENT, `${m.key}: ${part.column}`);
    }
    assert.ok(m.engagement.comments && m.engagement.likes, `${m.key}: comments + likes required`);
    assert.ok(COMMENT_MODULES[m.engagement.comments.table], `${m.key}: ${m.engagement.comments.table} is not in COMMENT_MODULES`);
  }
});

test("keys fit the VARCHAR(50) column and are unique", () => {
  const keys = listTopModules().map((m) => m.key);
  assert.equal(new Set(keys).size, keys.length);
  for (const k of keys) assert.ok(k.length <= 50);
});

test("aliases never collide across modules", () => {
  const seen = new Map();
  for (const m of listTopModules()) {
    for (const name of [m.key, ...m.aliases]) {
      const sq = name.toLowerCase().replace(/[^a-z0-9]/g, "");
      assert.ok(!seen.has(sq) || seen.get(sq) === m.key, `${name} used by ${seen.get(sq)} and ${m.key}`);
      seen.set(sq, m.key);
    }
  }
});

test("resolveTopModule accepts keys, aliases and loose spelling", () => {
  assert.equal(resolveTopModule("video_mania").key, "video_mania");
  assert.equal(resolveTopModule("Video-Mania").key, "video_mania");
  assert.equal(resolveTopModule("xpi").key, "video_mania");
  assert.equal(resolveTopModule("tvProgmax").key, "tv_progmax");
  assert.equal(resolveTopModule("mondoMarket").key, "mondo_market");
  assert.equal(resolveTopModule("nope"), null);
  assert.equal(resolveTopModule(""), null);
  assert.equal(resolveTopModule("constructor"), null);
});

test("registry is frozen", () => assert.ok(Object.isFrozen(TOP_MODULES)));

test("toPositiveInt", () => {
  assert.equal(toPositiveInt("12"), 12);
  assert.equal(toPositiveInt(7), 7);
  for (const bad of [0, -1, "1.5", "abc", "", null, undefined, 2147483648, "1; DROP"]) {
    assert.equal(toPositiveInt(bad), null, String(bad));
  }
});
