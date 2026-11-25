/**
 * Removes the OLD top system from the database. The new system is the `top_entries` table
 * (see md/TOP_LIST_API.md); nothing reads or writes the objects below any more.
 *
 * Dropped
 *   tables   top_video, top_video_like, top_video_viewed, top_tours, top_QAFI, top_GEBC, top_NEWS
 *   columns  video_comment.top_video_id, pic_comment.top_tours_id, news_comment.top_news_id,
 *            gebc_comment.top_gebc_id, qafi_comment.top_qafi_id, sport_comment.top_sport_id,
 *            xpi_videos.top, item.top_post, item.top_added_date,
 *            post_letters.top_letter, post_letters.top_added_date
 * Deleted rows
 *   comments that belong to a top copy (top_*_id IS NOT NULL) and their comment likes. Those comments
 *   point at a copy that is being dropped, so they can never be shown again.
 *
 * Usage (from /backend):
 *   node migrations/drop_legacy_top_system.js            DRY RUN: runs everything in a transaction, prints what
 *                                                        would change, then ROLLS BACK (nothing is modified)
 *   node migrations/drop_legacy_top_system.js --apply    saves a JSON backup of the affected rows to
 *                                                        migrations/backups/, then COMMITS
 *
 * Idempotent: objects that are already gone are skipped.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "pg";
import { databaseConfig } from "../db.config/db.js";

const APPLY = process.argv.includes("--apply");
const here = path.dirname(fileURLToPath(import.meta.url));

const TABLES = ["top_video_viewed", "top_video_like", "top_video", "top_tours", "top_QAFI", "top_GEBC", "top_NEWS"];
const COMMENT_TOP_COLUMNS = [
  ["video_comment", "top_video_id"],
  ["pic_comment", "top_tours_id"],
  ["news_comment", "top_news_id"],
  ["gebc_comment", "top_gebc_id"],
  ["qafi_comment", "top_qafi_id"],
  ["sport_comment", "top_sport_id"],
];
const OTHER_COLUMNS = [
  ["xpi_videos", "top"],
  ["item", "top_post"],
  ["item", "top_added_date"],
  ["post_letters", "top_letter"],
  ["post_letters", "top_added_date"],
];

const client = new pkg.Client(databaseConfig);
const tableExists = async (t) =>
  (await client.query("SELECT to_regclass($1) IS NOT NULL AS ok", [`public.${t}`])).rows[0].ok;
const columnExists = async (t, c) =>
  (
    await client.query(
      "SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND lower(table_name)=lower($1) AND column_name=$2",
      [t, c]
    )
  ).rowCount > 0;

try {
  await client.connect();
  console.log(APPLY ? "APPLY mode: changes will be committed" : "DRY RUN: everything is rolled back at the end");

  const backup = { created_at: new Date().toISOString(), tables: {}, deleted_comments: {}, deleted_comment_likes: [] };

  // 1) back up the legacy tables
  for (const t of TABLES) {
    if (!(await tableExists(t))) continue;
    backup.tables[t] = (await client.query(`SELECT * FROM public.${t}`)).rows;
  }

  // 2) back up the comments that belong to top copies
  for (const [table, col] of COMMENT_TOP_COLUMNS) {
    if (!(await tableExists(table)) || !(await columnExists(table, col))) continue;
    backup.deleted_comments[table] = (await client.query(`SELECT * FROM public.${table} WHERE ${col} IS NOT NULL`)).rows;
  }

  if (APPLY) {
    const dir = path.join(here, "backups");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `legacy_top_backup_${Date.now()}.json`);
    // ids/timestamps are plain JSON; nothing in these tables needs special encoding
    fs.writeFileSync(file, JSON.stringify(backup, null, 2));
    console.log("backup written:", file);
  }

  await client.query("BEGIN");

  // 3) comments of top copies (+ their likes)
  for (const [table, col] of COMMENT_TOP_COLUMNS) {
    if (!(await tableExists(table)) || !(await columnExists(table, col))) continue;
    const ids = (await client.query(`SELECT id FROM public.${table} WHERE ${col} IS NOT NULL`)).rows.map((r) => r.id);
    if (ids.length && (await tableExists("comment_likes"))) {
      const del = await client.query("DELETE FROM public.comment_likes WHERE comment_table = $1 AND comment_id = ANY($2::int[])", [table, ids]);
      if (del.rowCount) console.log(`  deleted ${del.rowCount} like(s) on top comments of ${table}`);
    }
    const res = await client.query(`DELETE FROM public.${table} WHERE ${col} IS NOT NULL`);
    console.log(`  ${table}: deleted ${res.rowCount} comment(s) on top copies`);
  }

  // 4) the copy tables
  for (const t of TABLES) {
    if (!(await tableExists(t))) continue;
    const n = (await client.query(`SELECT COUNT(*)::int AS n FROM public.${t}`)).rows[0].n;
    await client.query(`DROP TABLE public.${t} CASCADE`);
    console.log(`  dropped table ${t} (${n} row(s))`);
  }

  // 5) the columns
  for (const [table, col] of [...COMMENT_TOP_COLUMNS, ...OTHER_COLUMNS]) {
    if (!(await tableExists(table)) || !(await columnExists(table, col))) continue;
    await client.query(`ALTER TABLE public.${table} DROP COLUMN ${col}`);
    console.log(`  dropped column ${table}.${col}`);
  }

  // 6) verify nothing legacy is left
  const leftTables = (
    await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND lower(table_name) IN ('top_video','top_video_like','top_video_viewed','top_tours','top_qafi','top_gebc','top_news')"
    )
  ).rows;
  if (leftTables.length) throw new Error("tables still present: " + leftTables.map((r) => r.table_name).join(", "));

  if (APPLY) {
    await client.query("COMMIT");
    console.log("COMMITTED. Legacy top system removed.");
  } else {
    await client.query("ROLLBACK");
    console.log("ROLLED BACK (dry run). Run again with --apply to make these changes.");
  }
} catch (err) {
  try {
    await client.query("ROLLBACK");
  } catch {
    /* no open transaction */
  }
  console.error("FAILED, nothing was changed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
