import "dotenv/config"; import pkg from "pg"; import { databaseConfig } from "./db.config/db.js";
const c = new pkg.Client(databaseConfig); await c.connect();
const q = async (s) => (await c.query(s)).rows[0];
const t = ["users","xpi_videos","pic_tours","post_letters","item","news","qafi","gebc","sports","cinematics_videos","fan_star_videos","tv_progmax_videos","kid_vids_videos","learning_hobbies_videos","video_comment","like_video","sport_comment","top_entries","signature","item_images","post_letters_images","letter_reciever_info"];
const out = []; for (const x of t) out.push(`${x}=${(await q(`SELECT COUNT(*)::int n FROM ${x}`)).n}`);
console.log(out.join("  "));
console.log("sports cat 1 name:", (await q("SELECT name FROM sports_category WHERE id=1")).name, "| qafi cat 1:", (await q("SELECT name FROM qafi_category ORDER BY id LIMIT 1")).name);
await c.end();
