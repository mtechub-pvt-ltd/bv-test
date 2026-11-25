/**
 * DEMO / TEST DATA SEEDER
 *
 * Fills an (almost) empty database with realistic-looking content so every screen has something to show:
 *   - 10 demo users (different from the admin), each with a profile and avatar
 *   - ~24 posts per module, written by those users, spread over the last 40 days
 *   - comments (some are replies) and likes from the other demo users
 *   - 3 top posts for most modules (on_news 2, qafi 1) so the Top List and the carousel can be seen
 *   - module-specific categories / sub-categories (renamed in place, English + French) for modules whose
 *     placeholder categories did not fit (Video Mania and Pic Tours keep theirs)
 *
 * It is test data. Media is reused on purpose: a handful of public videos (Mixkit CDN) and seeded photos
 * (picsum.photos) with different titles. Text comes from public APIs: DummyJSON (posts, comments, products),
 * OpenTDB (quiz questions), BBC News RSS (headlines), Unicode emoji list. Everything fetched is cached in
 * scripts/data/demo_content_cache.json so re-runs work offline.
 *
 * Usage (from /backend):
 *   node scripts/seed_demo_content.js              seed (refuses to run twice)
 *   node scripts/seed_demo_content.js --dry-run    fetch + validate + print the plan, write nothing
 *   node scripts/seed_demo_content.js --remove     delete the demo users and everything they own, drop their
 *                                                  top entries and restore the original category names
 *   node scripts/seed_demo_content.js --refresh    ignore the cache and fetch again
 *
 * Demo logins:  <username>@demo.wotchagotcha.app  /  Demo@12345
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import pkg from "pg";
import { databaseConfig } from "../db.config/db.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.join(here, "data", "demo_content_cache.json");
const BACKUP = path.join(here, "data", "demo_taxonomy_backup.json");
const DEMO_DOMAIN = "demo.wotchagotcha.app";
const DEMO_PASSWORD = "Demo@12345";
const ARGS = new Set(process.argv.slice(2));
const UA = "WotchaGotchaDemoSeeder/1.0 (test data; contact admin@gmail.com)";

// ---------------------------------------------------------------------------------------------------------
// small helpers
// ---------------------------------------------------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let seed = 20261110;
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const daysAgo = (d, jitterHours = 0) => new Date(Date.now() - d * 864e5 - rnd() * jitterHours * 36e5);
const trim = (s, n) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s);
const decode = (s = "") => s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n)).replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&eacute;/g, "é").replace(/&ldquo;|&rdquo;/g, '"').replace(/&rsquo;|&lsquo;/g, "'").replace(/&hellip;/g, "…").replace(/&#039;/g, "'");

async function getJson(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30000) });
      if (r.ok) return r.json();
    } catch { /* retry */ }
    await sleep(1500);
  }
  return null;
}
async function getText(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30000) });
      if (r.ok) return r.text();
    } catch { /* retry */ }
    await sleep(1500);
  }
  return null;
}
async function mediaOk(url, kind) {
  try {
    const r = await fetch(url, { headers: { Range: "bytes=0-512", "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(20000) });
    return r.ok && (r.headers.get("content-type") || "").startsWith(kind);
  } catch { return false; }
}

// ---------------------------------------------------------------------------------------------------------
// the 10 demo users
// ---------------------------------------------------------------------------------------------------------
const USERS = [
  ["ava_martin", "women", 12, "Photographer", "Lyon", "France", "Auvergne-Rhône-Alpes", "Europe", "Chasing light and good coffee."],
  ["liam_okafor", "men", 32, "Software Engineer", "Lagos", "Nigeria", "Lagos", "Africa", "Building things, breaking things, fixing things."],
  ["sofia_rossi", "women", 44, "Chef", "Milan", "Italy", "Lombardy", "Europe", "Pasta is a love language."],
  ["noah_kim", "men", 45, "Sports Coach", "Seoul", "South Korea", "Seoul", "Asia", "Train hard, rest harder."],
  ["mia_hernandez", "women", 68, "Teacher", "Mexico City", "Mexico", "CDMX", "North America", "Teaching curious minds since 2012."],
  ["ethan_dubois", "men", 22, "Filmmaker", "Montreal", "Canada", "Quebec", "North America", "Short films, long walks."],
  ["zara_khan", "women", 90, "Journalist", "Karachi", "Pakistan", "Sindh", "Asia", "Always asking why."],
  ["lucas_silva", "men", 75, "Travel Blogger", "São Paulo", "Brazil", "São Paulo", "South America", "40 countries and counting."],
  ["nina_petrov", "women", 26, "Illustrator", "Sofia", "Bulgaria", "Sofia City", "Europe", "Ink, tea and cats."],
  ["omar_haddad", "men", 18, "Entrepreneur", "Dubai", "United Arab Emirates", "Dubai", "Middle East", "Small ideas, big follow-through."],
];

// ---------------------------------------------------------------------------------------------------------
// taxonomies: [categoryEN, categoryFR, [[subEN, subFR], [subEN, subFR]]] x 6   (renamed in place, ids unchanged)
// ---------------------------------------------------------------------------------------------------------
const T = {
  sports: ["sports_category", "sport_sub_category", [
    ["Team Sports", "Sports d'équipe", [["Football", "Football"], ["Basketball", "Basketball"]]],
    ["Water Sports", "Sports nautiques", [["Swimming", "Natation"], ["Surfing", "Surf"]]],
    ["Racquet Sports", "Sports de raquette", [["Tennis", "Tennis"], ["Badminton", "Badminton"]]],
    ["Athletics", "Athlétisme", [["Running", "Course à pied"], ["Gymnastics", "Gymnastique"]]],
    ["Combat Sports", "Sports de combat", [["Boxing", "Boxe"], ["Martial Arts", "Arts martiaux"]]],
    ["Outdoor & Extreme", "Plein air et extrême", [["Cycling", "Cyclisme"], ["Skateboarding", "Skateboard"]]]]],
  cinematics: ["cinematics_category", "cinematics_sub_category", [
    ["Action & Adventure", "Action et aventure", [["Chase Scenes", "Scènes de poursuite"], ["Epic Journeys", "Voyages épiques"]]],
    ["Drama", "Drame", [["Family Stories", "Histoires de famille"], ["Period Pieces", "Films d'époque"]]],
    ["Sci-Fi & Fantasy", "Science-fiction et fantastique", [["Space Odyssey", "Odyssée spatiale"], ["Magical Worlds", "Mondes magiques"]]],
    ["Documentary", "Documentaire", [["Nature Docs", "Documentaires nature"], ["Behind the Lens", "Dans l'objectif"]]],
    ["Comedy", "Comédie", [["Stand-up Moments", "Moments de stand-up"], ["Sketches", "Sketchs"]]],
    ["Short Films", "Courts métrages", [["Animation", "Animation"], ["Experimental", "Expérimental"]]]]],
  fan_star: ["fan_star_category", "fan_star_sub_category", [
    ["Music Stars", "Stars de la musique", [["Pop Icons", "Icônes de la pop"], ["Rock Legends", "Légendes du rock"]]],
    ["Movie Stars", "Stars du cinéma", [["Hollywood", "Hollywood"], ["World Cinema", "Cinéma du monde"]]],
    ["Sports Stars", "Stars du sport", [["Football Heroes", "Héros du football"], ["Olympic Champions", "Champions olympiques"]]],
    ["TV & Streaming", "TV et streaming", [["Series Fans", "Fans de séries"], ["Talk Shows", "Talk-shows"]]],
    ["Creators & Influencers", "Créateurs et influenceurs", [["Vloggers", "Vloggeurs"], ["Gamers", "Gamers"]]],
    ["Fan Art & Events", "Fan art et événements", [["Fan Art", "Fan art"], ["Meet & Greets", "Rencontres"]]]]],
  tv_progmax: ["tv_progmax_category", "tv_progmax_sub_category", [
    ["News & Current Affairs", "Actualités", [["Breaking News", "Flash info"], ["Debates", "Débats"]]],
    ["Entertainment", "Divertissement", [["Game Shows", "Jeux télévisés"], ["Reality TV", "Télé-réalité"]]],
    ["Series & Drama", "Séries et drames", [["Crime Dramas", "Séries policières"], ["Romance Series", "Séries romantiques"]]],
    ["Documentaries", "Documentaires", [["Nature & Wildlife", "Nature et faune"], ["History & Culture", "Histoire et culture"]]],
    ["Kids & Family TV", "TV jeunesse", [["Cartoons", "Dessins animés"], ["Family Shows", "Émissions familiales"]]],
    ["Lifestyle", "Style de vie", [["Cooking Shows", "Émissions de cuisine"], ["Travel Shows", "Émissions de voyage"]]]]],
  kid_vids: ["kid_vids_category", "kid_vids_sub_category", [
    ["Cartoons & Animation", "Dessins animés", [["Classic Cartoons", "Dessins animés classiques"], ["New Adventures", "Nouvelles aventures"]]],
    ["Songs & Rhymes", "Chansons et comptines", [["Nursery Rhymes", "Comptines"], ["Sing-Along", "Chansons à reprendre"]]],
    ["Learning Fun", "Apprendre en s'amusant", [["ABC & Numbers", "ABC et chiffres"], ["Science for Kids", "Sciences pour enfants"]]],
    ["Animals & Nature", "Animaux et nature", [["Farm Friends", "Amis de la ferme"], ["Wild Animals", "Animaux sauvages"]]],
    ["Arts & Crafts", "Arts et bricolage", [["Drawing", "Dessin"], ["DIY Crafts", "Bricolage"]]],
    ["Stories & Bedtime", "Histoires et coucher", [["Fairy Tales", "Contes de fées"], ["Bedtime Stories", "Histoires du soir"]]]]],
  learning_hobbies: ["learning_hobbies_category", "learning_hobbies_sub_category", [
    ["Cooking & Baking", "Cuisine et pâtisserie", [["Home Cooking", "Cuisine maison"], ["Baking", "Pâtisserie"]]],
    ["Arts & Crafts", "Arts et artisanat", [["Painting & Drawing", "Peinture et dessin"], ["Pottery & Knitting", "Poterie et tricot"]]],
    ["Music", "Musique", [["Guitar", "Guitare"], ["Piano", "Piano"]]],
    ["Gardening & Outdoors", "Jardinage et plein air", [["Home Gardening", "Jardinage"], ["Hiking & Camping", "Randonnée et camping"]]],
    ["Tech & Coding", "Technologie et programmation", [["Coding Basics", "Bases de la programmation"], ["Electronics & DIY", "Électronique et bricolage"]]],
    ["Languages & Study", "Langues et études", [["Language Learning", "Apprentissage des langues"], ["Study Skills", "Méthodes d'étude"]]]]],
  item: ["item_category", "item_sub_category", [
    ["Electronics", "Électronique", [["Phones & Accessories", "Téléphones et accessoires"], ["Laptops & Tablets", "Ordinateurs et tablettes"]]],
    ["Fashion", "Mode", [["Men's Fashion", "Mode homme"], ["Women's Fashion", "Mode femme"]]],
    ["Home & Living", "Maison et vie", [["Furniture", "Meubles"], ["Decor & Kitchen", "Déco et cuisine"]]],
    ["Beauty & Care", "Beauté et soins", [["Skincare", "Soins de la peau"], ["Fragrances", "Parfums"]]],
    ["Sports & Outdoors", "Sport et plein air", [["Sports Gear", "Équipement sportif"], ["Eyewear", "Lunettes"]]],
    ["Vehicles", "Véhicules", [["Motorcycles", "Motos"], ["Cars & Vehicles", "Voitures et véhicules"]]]]],
  disc: ["disc_category", "disc_sub_category", [
    ["Society & Community", "Société et communauté", [["Neighbourhood", "Quartier"], ["Community Spirit", "Esprit communautaire"]]],
    ["Environment", "Environnement", [["Climate Action", "Action climatique"], ["Clean Cities", "Villes propres"]]],
    ["Education", "Éducation", [["Schools & Teachers", "Écoles et enseignants"], ["Student Life", "Vie étudiante"]]],
    ["Health & Wellbeing", "Santé et bien-être", [["Public Health", "Santé publique"], ["Mental Wellbeing", "Bien-être mental"]]],
    ["Work & Economy", "Travail et économie", [["Fair Work", "Travail équitable"], ["Small Business", "Petites entreprises"]]],
    ["Technology & Future", "Technologie et avenir", [["Digital Rights", "Droits numériques"], ["AI & Society", "IA et société"]]]]],
  news: ["news_category", "news_sub_category", [
    ["World", "Monde", [["Africa", "Afrique"], ["Asia", "Asie"]]],
    ["Europe & Americas", "Europe et Amériques", [["Europe", "Europe"], ["Latin America", "Amérique latine"]]],
    ["Business & Tech", "Économie et tech", [["Business", "Économie"], ["Technology", "Technologie"]]],
    ["Science & Health", "Science et santé", [["Science & Environment", "Science et environnement"], ["Health", "Santé"]]],
    ["Culture", "Culture", [["Entertainment & Arts", "Divertissement et arts"], ["Education", "Éducation"]]],
    ["Middle East & UK", "Moyen-Orient et Royaume-Uni", [["Middle East", "Moyen-Orient"], ["UK", "Royaume-Uni"]]]]],
  qafi: ["qafi_category", "qafi_sub_category", [
    ["Science", "Science", [["Space & Physics", "Espace et physique"], ["Biology & Chemistry", "Biologie et chimie"]]],
    ["History", "Histoire", [["Ancient World", "Monde antique"], ["Modern Era", "Époque moderne"]]],
    ["Geography", "Géographie", [["Countries & Capitals", "Pays et capitales"], ["Landmarks", "Sites emblématiques"]]],
    ["Technology", "Technologie", [["Computers", "Ordinateurs"], ["Inventions", "Inventions"]]],
    ["Arts & Literature", "Arts et littérature", [["Books", "Livres"], ["Art & Music", "Art et musique"]]],
    ["Nature & Animals", "Nature et animaux", [["Wildlife", "Faune"], ["Earth & Weather", "Terre et météo"]]]]],
  gebc: ["gebc_category", "gebc_sub_category", [
    ["Smileys & Emotion", "Smileys et émotions", [["Smiling Faces", "Visages souriants"], ["Affection Faces", "Visages tendres"]]],
    ["People & Body", "Personnes et corps", [["Hands", "Mains"], ["Gestures", "Gestes"]]],
    ["Animals & Nature", "Animaux et nature", [["Mammals", "Mammifères"], ["Birds", "Oiseaux"]]],
    ["Food & Drink", "Nourriture et boissons", [["Fruit", "Fruits"], ["Prepared Food", "Plats préparés"]]],
    ["Travel & Places", "Voyages et lieux", [["Ground Transport", "Transport terrestre"], ["Places", "Lieux"]]],
    ["Activities", "Activités", [["Sport", "Sport"], ["Games", "Jeux"]]]]],
};
// modules whose categories are NOT renamed (they already fit): their names are only read, for titles
const KEEP = { video_mania: ["video_category", "video_sub_category"], pic_tours: ["pic_category", "pic_sub_category"] };

const HOOKS = ["Top 5 moments", "A beginner's guide", "Weekend highlights", "Behind the scenes", "You have to see this", "Hidden gems", "Real stories", "Quick tips that work", "Golden hour", "Live recap", "What I learned this week", "Community favourites", "Unexpected twist", "Slow and simple", "The full picture", "Fresh and new", "My honest take", "Caught on camera", "Little things that matter", "Throwback", "Step by step", "Best of the month", "From scratch", "Up close", "On the road", "Daily dose", "Pure joy", "Deep dive", "Sunday session", "Just for fun"];
const COUNTRIES = [["US", "United States", "California", "North America"], ["GB", "United Kingdom", "England", "Europe"], ["FR", "France", "Île-de-France", "Europe"], ["DE", "Germany", "Bavaria", "Europe"], ["CA", "Canada", "Ontario", "North America"], ["AE", "United Arab Emirates", "Dubai", "Middle East"], ["NG", "Nigeria", "Lagos", "Africa"], ["BR", "Brazil", "São Paulo", "South America"], ["IN", "India", "Maharashtra", "Asia"], ["JP", "Japan", "Tokyo", "Asia"]];
const CITIES = { US: "Los Angeles", GB: "London", FR: "Paris", DE: "Munich", CA: "Toronto", AE: "Dubai", NG: "Lagos", BR: "São Paulo", IN: "Mumbai", JP: "Tokyo" };
const VIDEO_IDS = [4132, 4396, 2168, 1191, 49845, 1606, 19179, 11007, 49231, 40524, 46635, 99786];
const CONDITIONS = ["new", "used_Like_new", "used_Good", "used_Fair"];

// ---------------------------------------------------------------------------------------------------------
// fetch + cache the content pools
// ---------------------------------------------------------------------------------------------------------
async function loadPools() {
  if (!ARGS.has("--refresh") && fs.existsSync(CACHE)) {
    console.log("using cached content:", path.relative(process.cwd(), CACHE));
    return JSON.parse(fs.readFileSync(CACHE, "utf8"));
  }
  console.log("fetching content from the internet ...");
  const pools = { fetched_at: new Date().toISOString(), posts: [], comments: [], products: [], quiz: {}, news: {}, emoji: {}, videos: [] };

  const posts = await getJson("https://dummyjson.com/posts?limit=0&select=title,body,tags");
  pools.posts = (posts?.posts || []).map((p) => ({ title: p.title, body: p.body, tags: p.tags }));
  const comments = await getJson("https://dummyjson.com/comments?limit=0&select=body");
  pools.comments = (comments?.comments || []).map((c) => c.body).filter((b) => b && b.length > 8 && b.length < 220);
  const products = await getJson("https://dummyjson.com/products?limit=0&select=title,description,category,price,images,thumbnail,brand");
  pools.products = products?.products || [];
  console.log(`  dummyjson: ${pools.posts.length} posts, ${pools.comments.length} comments, ${pools.products.length} products`);

  // OpenTDB asks for 1 request / 5 s per IP
  const quizCats = { science1: 17, science2: 17, history1: 23, history2: 23, geo1: 22, geo2: 22, tech1: 18, tech2: 15, arts1: 10, arts2: 25, nature1: 27, nature2: 17 };
  for (const [k, cat] of Object.entries(quizCats)) {
    const j = await getJson(`https://opentdb.com/api.php?amount=3&category=${cat}&type=multiple`);
    pools.quiz[k] = (j?.results || []).map((q) => ({ q: decode(q.question), a: decode(q.correct_answer) }));
    await sleep(5600);
  }
  console.log("  opentdb:", Object.entries(pools.quiz).map(([k, v]) => `${k}=${v.length}`).join(" "));

  const feeds = { africa: "world/africa", asia: "world/asia", europe: "world/europe", latin: "world/latin_america", business: "business", tech: "technology", science: "science_and_environment", health: "health", arts: "entertainment_and_arts", edu: "education", me: "world/middle_east", uk: "uk" };
  for (const [k, f] of Object.entries(feeds)) {
    const xml = await getText(`https://feeds.bbci.co.uk/news/${f}/rss.xml`);
    const items = [...(xml || "").matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
      const g = (tag) => { const x = m[1].match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`)); return x ? decode(x[1].trim()) : ""; };
      return { title: g("title"), body: g("description") };
    }).filter((i) => i.title && i.body);
    pools.news[k] = items.slice(0, 6);
  }
  console.log("  bbc news:", Object.entries(pools.news).map(([k, v]) => `${k}=${v.length}`).join(" "));

  const emojiTxt = (await getText("https://unicode.org/Public/emoji/latest/emoji-test.txt")) || "";
  let sub = "";
  for (const line of emojiTxt.split("\n")) {
    const s = line.match(/^# subgroup: (.+)/); if (s) { sub = s[1].trim(); continue; }
    const m = line.match(/^[0-9A-F ]+;\s*fully-qualified\s*#\s*(\S+)\s+E[\d.]+\s+(.+)$/);
    if (m && !m[1].includes("‍")) (pools.emoji[sub] ||= []).push({ ch: m[1], name: m[2].trim() });
  }
  console.log("  unicode emoji subgroups:", Object.keys(pools.emoji).length);

  console.log("  checking media links ...");
  for (const id of VIDEO_IDS) {
    const v = `https://assets.mixkit.co/videos/${id}/${id}-360.mp4`;
    const t = `https://assets.mixkit.co/videos/${id}/${id}-thumb-720-0.jpg`;
    if ((await mediaOk(v, "video")) && (await mediaOk(t, "image"))) pools.videos.push({ video: v, thumbnail: t });
  }
  console.log(`  videos that respond: ${pools.videos.length}/${VIDEO_IDS.length}`);
  if (pools.posts.length < 20 || pools.comments.length < 20 || pools.videos.length < 3) throw new Error("not enough content could be fetched; check your internet connection and re-run");
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  fs.writeFileSync(CACHE, JSON.stringify(pools));
  return pools;
}

// ---------------------------------------------------------------------------------------------------------
// db helpers
// ---------------------------------------------------------------------------------------------------------
async function insertMany(client, table, cols, rows, { returning = "id", conflict = false } = {}) {
  const ids = [];
  for (let i = 0; i < rows.length; i += 150) {
    const chunk = rows.slice(i, i + 150);
    const params = [];
    const values = chunk.map((r) => `(${r.map((v) => { params.push(v); return `$${params.length}`; }).join(",")})`).join(",");
    const res = await client.query(`INSERT INTO ${table} (${cols.join(",")}) VALUES ${values}${conflict ? " ON CONFLICT DO NOTHING" : ""}${returning ? ` RETURNING ${returning}` : ""}`, params);
    if (returning) ids.push(...res.rows.map((r) => r[returning]));
  }
  return ids;
}
const columnsOf = async (client, table) => new Set((await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1", [table])).rows.map((r) => r.column_name));

/** Rename a module's categories in place (ids unchanged). Returns { cats:[{id,name}], subs:[[{id,name},{id,name}] x6] } */
async function applyTaxonomy(client, key, backup) {
  const [catT, subT, defs] = T[key];
  const cats = (await client.query(`SELECT id, name, french_name FROM ${catT} ORDER BY id`)).rows;
  const subs = (await client.query(`SELECT id, category_id, name, french_name FROM ${subT} ORDER BY category_id, id`)).rows;
  if (cats.length < 6 || subs.length < 12) throw new Error(`${key}: expected at least 6 categories and 12 sub-categories, found ${cats.length}/${subs.length}`);
  backup[catT] = cats; backup[subT] = subs;
  const out = { cats: [], subs: [] };
  for (let i = 0; i < 6; i++) {
    const [en, fr, subDefs] = defs[i];
    await client.query(`UPDATE ${catT} SET name=$1, french_name=$2, "index"=$3, updated_at=NOW() WHERE id=$4`, [en, fr, i, cats[i].id]);
    out.cats.push({ id: cats[i].id, name: en });
    const mine = subs.filter((s) => s.category_id === cats[i].id);
    if (mine.length < 2) throw new Error(`${key}: category ${cats[i].id} has fewer than 2 sub-categories`);
    out.subs.push([]);
    for (let j = 0; j < 2; j++) {
      await client.query(`UPDATE ${subT} SET name=$1, french_name=$2, "index"=$3, updated_at=NOW() WHERE id=$4`, [subDefs[j][0], subDefs[j][1], j, mine[j].id]);
      out.subs[i].push({ id: mine[j].id, name: subDefs[j][0] });
    }
  }
  return out;
}
async function readTaxonomy(client, [catT, subT]) {
  const cats = (await client.query(`SELECT id, name FROM ${catT} ORDER BY id LIMIT 6`)).rows;
  const subs = (await client.query(`SELECT id, category_id, name FROM ${subT} ORDER BY category_id, id`)).rows;
  return { cats, subs: cats.map((c) => subs.filter((s) => s.category_id === c.id).slice(0, 2)) };
}

// ---------------------------------------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------------------------------------
async function remove(client) {
  const demo = (await client.query("SELECT id FROM users WHERE email LIKE $1", [`%@${DEMO_DOMAIN}`])).rows.map((r) => r.id);
  console.log(`removing ${demo.length} demo user(s) and everything they own (cascade) ...`);
  await client.query("BEGIN");
  if (demo.length) await client.query("DELETE FROM users WHERE id = ANY($1::int[])", [demo]);
  const tops = { video_mania: "xpi_videos", pic_tours: "pic_tours", open_letters: "post_letters", mondo_market: "item", on_news: "news", qafi: "qafi", gebc: "gebc", sports: "sports", cinematics: "cinematics_videos", fan_star: "fan_star_videos", tv_progmax: "tv_progmax_videos", kid_vids: "kid_vids_videos", learning_hobbies: "learning_hobbies_videos" };
  for (const [mod, table] of Object.entries(tops)) {
    const r = await client.query(`DELETE FROM top_entries te WHERE te.module = $1 AND NOT EXISTS (SELECT 1 FROM ${table} p WHERE p.id = te.item_id)`, [mod]);
    if (r.rowCount) console.log(`  top_entries ${mod}: removed ${r.rowCount} dead entr${r.rowCount === 1 ? "y" : "ies"}`);
  }
  if (fs.existsSync(BACKUP)) {
    const b = JSON.parse(fs.readFileSync(BACKUP, "utf8"));
    for (const [table, rows] of Object.entries(b)) for (const r of rows) await client.query(`UPDATE ${table} SET name=$1, french_name=$2, updated_at=NOW() WHERE id=$3`, [r.name, r.french_name, r.id]);
    console.log("  original category names restored");
    fs.unlinkSync(BACKUP);
  }
  await client.query("COMMIT");
  console.log("done.");
}

async function main() {
  const client = new pkg.Client(databaseConfig);
  await client.connect();
  try {
    if (ARGS.has("--remove")) return await remove(client);

    const already = (await client.query("SELECT COUNT(*)::int n FROM users WHERE email LIKE $1", [`%@${DEMO_DOMAIN}`])).rows[0].n;
    if (already && !ARGS.has("--dry-run")) { console.log(`demo data already present (${already} demo users). Run with --remove first to re-seed.`); return; }

    const pools = await loadPools();
    const admin = (await client.query("SELECT id FROM users WHERE lower(role)='admin' AND is_deleted=FALSE ORDER BY id LIMIT 1")).rows[0];
    if (!admin) throw new Error("no admin user found");
    const dry = ARGS.has("--dry-run");
    if (dry) console.log("DRY RUN: content fetched and checked; nothing will be written.");
    if (dry) { console.log(`would create ${USERS.length} users and ~${13 * 24} posts with comments, likes and top entries`); return; }

    await client.query("BEGIN");
    const backup = {};

    // ---- users --------------------------------------------------------------------------------------------
    const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const userRows = USERS.map(([username, gender, n, profession, city, country, state, region, bio], i) =>
      [username, `${username}@${DEMO_DOMAIN}`, hash, "user", `https://randomuser.me/api/portraits/${gender}/${n}.jpg`, true, city, country, state, state, region, profession, bio, i === 2 || i === 7]);
    const U = await insertMany(client, "users", ["username", "email", "password", "role", "image", "verified", "city", "country", "province", "state", "region", "profession", "bio", "is_premium"], userRows);
    console.log(`users: ${U.length} created (password for all: ${DEMO_PASSWORD})`);
    const uname = Object.fromEntries(U.map((id, i) => [id, USERS[i][0]]));

    // ---- taxonomies ---------------------------------------------------------------------------------------
    const TAX = {};
    for (const key of Object.keys(T)) TAX[key] = await applyTaxonomy(client, key, backup);
    for (const [key, tables] of Object.entries(KEEP)) TAX[key] = await readTaxonomy(client, tables);
    fs.mkdirSync(path.dirname(BACKUP), { recursive: true });
    fs.writeFileSync(BACKUP, JSON.stringify(backup));
    console.log("categories: 11 modules re-themed (video_mania and pic_tours kept)");

    // ---- shared content ----------------------------------------------------------------------------------
    let hookN = 0;
    const title = (sub) => `${sub}: ${HOOKS[hookN++ % HOOKS.length]}`;
    const blurb = () => { const p = pick(pools.posts); return trim(p.body, 260); };
    let imgN = 0;
    const photo = (w = 800, h = 600) => `https://picsum.photos/seed/wg-demo-${++imgN}/${w}/${h}`;
    let vidN = 0;
    const video = () => pools.videos[vidN++ % pools.videos.length];
    const made = {}; // module -> [{ id, user, at }]

    /** one entry per (category, sub, copy) */
    const plan = (key, perSub = 2) => {
      const out = [];
      TAX[key].cats.forEach((cat, ci) => TAX[key].subs[ci].forEach((sub) => { for (let k = 0; k < perSub; k++) out.push({ cat, sub, user: pick(U), at: daysAgo(int(1, 40), 20) }); }));
      return shuffle(out);
    };
    const track = (key, items, ids) => { made[key] = items.map((it, i) => ({ id: ids[i], user: it.user, at: it.at })); console.log(`${key.padEnd(17)} ${ids.length} posts`); };

    // ---- plain video modules ------------------------------------------------------------------------------
    const videoModule = async (key, table, catCol, subCol) => {
      const items = plan(key);
      const rows = items.map((it) => { const v = video(); return [it.user, title(it.sub.name), blurb(), it.cat.id, it.sub.id, v.video, v.thumbnail, it.at, it.at]; });
      track(key, items, await insertMany(client, table, ["user_id", "name", "description", catCol, subCol, "video", "thumbnail", "created_at", "updated_at"], rows));
    };
    await videoModule("video_mania", "xpi_videos", "video_category", "sub_category");
    await videoModule("cinematics", "cinematics_videos", "category_id", "sub_category_id");
    await videoModule("tv_progmax", "tv_progmax_videos", "category_id", "sub_category_id");
    await videoModule("kid_vids", "kid_vids_videos", "category_id", "sub_category_id");
    await videoModule("learning_hobbies", "learning_hobbies_videos", "category_id", "sub_category_id");

    // ---- pic tours ------------------------------------------------------------------------------------------
    {
      const items = plan("pic_tours");
      const rows = items.map((it) => [it.user, title(it.sub.name), blurb(), it.cat.id, it.sub.id, photo(), it.at, it.at]);
      track("pic_tours", items, await insertMany(client, "pic_tours", ["user_id", "name", "description", "pic_category", "sub_category", "image", "created_at", "updated_at"], rows));
    }

    // ---- sports (image or video) --------------------------------------------------------------------------
    {
      const items = plan("sports");
      const rows = items.map((it, i) => { const asVideo = i % 3 === 0; const v = video(); const img = asVideo ? v.thumbnail : photo();
        return [it.user, title(it.sub.name), blurb(), it.cat.id, it.sub.id, img, asVideo ? v.video : "", asVideo ? "video" : "image", asVideo ? v.thumbnail : "", it.at, it.at]; });
      track("sports", items, await insertMany(client, "sports", ["user_id", "name", "description", "category_id", "sub_category_id", "image", "video", "type", "thumbnail", "created_at", "updated_at"], rows));
    }

    // ---- fan star (video or image) -----------------------------------------------------------------------
    {
      const items = plan("fan_star");
      const rows = items.map((it, i) => { const asVideo = i % 2 === 0; const v = video();
        return [it.user, title(it.sub.name), blurb(), it.cat.id, it.sub.id, asVideo ? "" : photo(), asVideo ? "video" : "image", asVideo ? v.thumbnail : "", asVideo ? v.video : "", it.at, it.at]; });
      track("fan_star", items, await insertMany(client, "fan_star_videos", ["user_id", "name", "description", "category_id", "sub_category_id", "image", "type", "thumbnail", "video", "created_at", "updated_at"], rows));
    }

    // ---- on news (BBC headlines) ---------------------------------------------------------------------------
    {
      const feedFor = [["africa", "asia"], ["europe", "latin"], ["business", "tech"], ["science", "health"], ["arts", "edu"], ["me", "uk"]];
      const cols = await columnsOf(client, "news");
      const items = plan("news");
      const used = {};
      const rows = items.map((it) => {
        const ci = TAX.news.cats.findIndex((c) => c.id === it.cat.id);
        const si = TAX.news.subs[ci].findIndex((s) => s.id === it.sub.id);
        const feed = feedFor[ci][si]; const list = pools.news[feed] || []; const n = (used[feed] = (used[feed] || 0) + 1) - 1;
        const art = list[n % Math.max(list.length, 1)] || { title: title(it.sub.name), body: blurb() };
        const base = { user_id: it.user, description: trim(`${art.title}. ${art.body}`, 480), category: it.cat.id, sub_category: it.sub.id, image: photo(), name: trim(art.title, 120), type: "image", created_at: it.at, updated_at: it.at };
        return base;
      });
      const useCols = Object.keys(rows[0]).filter((c) => cols.has(c));
      track("on_news", items, await insertMany(client, "news", useCols, rows.map((r) => useCols.map((c) => r[c]))));
    }

    // ---- qafi (quiz Q&A) ----------------------------------------------------------------------------------
    {
      const keys = [["science1", "science2"], ["history1", "history2"], ["geo1", "geo2"], ["tech1", "tech2"], ["arts1", "arts2"], ["nature1", "nature2"]];
      const cols = await columnsOf(client, "qafi");
      const items = plan("qafi");
      const used = {};
      const rows = items.map((it) => {
        const ci = TAX.qafi.cats.findIndex((c) => c.id === it.cat.id);
        const si = TAX.qafi.subs[ci].findIndex((s) => s.id === it.sub.id);
        const k = keys[ci][si]; const list = pools.quiz[k] || []; const n = (used[k] = (used[k] || 0) + 1) - 1;
        const qa = list[n % Math.max(list.length, 1)] || { q: `What do you know about ${it.sub.name}?`, a: "Share your answer in the comments!" };
        return { user_id: it.user, description: `Q: ${qa.q}\nA: ${qa.a}`, category: it.cat.id, sub_category: it.sub.id, image: photo(), name: trim(qa.q, 100), type: "image", created_at: it.at, updated_at: it.at };
      });
      const useCols = Object.keys(rows[0]).filter((c) => cols.has(c));
      track("qafi", items, await insertMany(client, "qafi", useCols, rows.map((r) => useCols.map((c) => r[c]))));
    }

    // ---- ebic (emoji) -------------------------------------------------------------------------------------
    {
      const subgroups = [["face-smiling", "face-affection"], ["hands", "person-gesture"], ["animal-mammal", "animal-bird"], ["food-fruit", "food-prepared"], ["transport-ground", "place-geographic"], ["sport", "game"]];
      const cols = await columnsOf(client, "gebc");
      const items = plan("gebc");
      const used = {};
      const rows = items.map((it) => {
        const ci = TAX.gebc.cats.findIndex((c) => c.id === it.cat.id);
        const si = TAX.gebc.subs[ci].findIndex((s) => s.id === it.sub.id);
        const sg = subgroups[ci][si]; const list = pools.emoji[sg] || [{ ch: "✨", name: "sparkles" }]; const n = (used[sg] = (used[sg] || 0) + 1) - 1;
        const e = list[(n * 3) % list.length];
        return { user_id: it.user, description: `${e.ch}  ${e.name.charAt(0).toUpperCase()}${e.name.slice(1)}. ${trim(pick(pools.comments), 90)}`, category: it.cat.id, sub_category: it.sub.id, image: e.ch, name: e.name, created_at: it.at, updated_at: it.at };
      });
      const useCols = Object.keys(rows[0]).filter((c) => cols.has(c));
      track("gebc", items, await insertMany(client, "gebc", useCols, rows.map((r) => useCols.map((c) => r[c]))));
    }

    // ---- mondo market (DummyJSON products) -----------------------------------------------------------------
    {
      const byCat = (...cats) => shuffle(pools.products.filter((p) => cats.includes(p.category)));
      const pools2 = [
        [byCat("smartphones", "mobile-accessories"), byCat("laptops", "tablets")],
        [byCat("mens-shirts", "mens-shoes", "mens-watches"), byCat("womens-dresses", "womens-shoes", "womens-bags", "womens-jewellery", "womens-watches", "tops")],
        [byCat("furniture"), byCat("home-decoration", "kitchen-accessories")],
        [byCat("skin-care", "beauty"), byCat("fragrances")],
        [byCat("sports-accessories"), byCat("sunglasses")],
        [byCat("motorcycle"), byCat("vehicle")],
      ];
      const used = {};
      const items = plan("item");
      const itemRows = items.map((it) => {
        const ci = TAX.item.cats.findIndex((c) => c.id === it.cat.id);
        const si = TAX.item.subs[ci].findIndex((s) => s.id === it.sub.id);
        const list = pools2[ci][si]; const n = (used[`${ci}${si}`] = (used[`${ci}${si}`] || 0) + 1) - 1;
        const p = list[n % Math.max(list.length, 1)] || pools.products[n % pools.products.length];
        const [cc, country, state, region] = pick(COUNTRIES);
        it.product = p;
        return [it.user, it.cat.id, it.sub.id, trim(p.title, 100), trim(p.description, 400), Math.max(1, Math.round(p.price)), pick(CONDITIONS), `${CITIES[cc]}, ${country}`, CITIES[cc], state, region, cc, country, true, "active", it.at, it.at];
      });
      const ids = await insertMany(client, "item", ["user_id", "item_category", "sub_category", "title", "description", "price", "condition", "location", "city", "state", "region", "country_code", "country", "paid_status", "status", "created_at", "updated_at"], itemRows);
      const imgRows = [];
      items.forEach((it, i) => (it.product.images?.length ? it.product.images : [it.product.thumbnail]).slice(0, 3).forEach((img) => imgRows.push([ids[i], img])));
      await insertMany(client, "item_images", ["item_id", "image"], imgRows, { returning: null });
      track("mondo_market", items, ids);
    }

    // ---- open letters ---------------------------------------------------------------------------------------
    {
      const sigByUser = {};
      const sigIds = await insertMany(client, "signature", ["user_id", "image"], U.map((u) => [u, `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(uname[u])}&backgroundColor=ffffff&textColor=1e293b`]));
      U.forEach((u, i) => (sigByUser[u] = sigIds[i]));
      const publicTargets = ["general", "celebrities", "authorities", "leader"];
      const privateTargets = ["peers", "friends", "followers"];
      const greetings = ["Dear neighbours,", "To whom it may concern,", "Dear friends,", "Dear Mayor,", "Dear readers,", "Respected leaders,"];
      const appeals = ["Let us act together, starting today.", "I kindly ask for your attention and support.", "Please share this letter and join the conversation.", "Together we can make this better."];
      const items = plan("disc", 1);
      const letterRows = []; const meta = [];
      items.forEach((it, i) => {
        const priv = i % 6 === 5; // a few private letters
        const owner = it.user; const writer = uname[owner];
        const receiver = priv ? pick(U.filter((u) => u !== owner)) : null;
        const post = pick(pools.posts); const post2 = pick(pools.posts);
        const sentences = trim(`${post.body} ${post2.body}`, 700);
        const country = USERS[U.indexOf(owner)];
        meta.push({ priv, receiver, owner });
        letterRows.push([owner, priv ? "private" : "public", priv ? pick(privateTargets) : pick(publicTargets), it.cat.id, it.sub.id, writer.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()), `${country[4]}, ${country[5]}`, `${writer}@${DEMO_DOMAIN}`, `+${int(10, 99)}${int(100000000, 999999999)}`,
          `An open letter about ${it.sub.name}`, it.at, pick(greetings), trim(post.title + ".", 160), sentences, pick(appeals), null, sigByUser[owner], priv, "active", it.at, it.at]);
      });
      const ids = await insertMany(client, "post_letters", ["user_id", "post_type", "receiver_type", "disc_category", "disc_sub_category", "name", "address", "email", "contact_no", "subject_place", "post_date", "greetings", "introduction", "body", "form_of_appeal", "video", "signature_id", "paid_status", "status", "created_at", "updated_at"], letterRows);
      await insertMany(client, "post_letters_images", ["letter_id", "image"], ids.map((id) => [id, photo()]), { returning: null });
      const recvRows = []; meta.forEach((m, i) => { if (m.priv) recvRows.push([ids[i], m.receiver, `${USERS[U.indexOf(m.receiver)][4]}, ${USERS[U.indexOf(m.receiver)][5]}`]); });
      if (recvRows.length) await insertMany(client, "letter_reciever_info", ["letter_id", "reciever_id", "address"], recvRows, { returning: null });
      track("open_letters", items, ids);
    }

    // ---- comments + likes ---------------------------------------------------------------------------------
    const ENGAGE = {
      video_mania: ["video_comment", "video_id", "like_video", "video_id"], pic_tours: ["pic_comment", "pic_tours_id", "like_pic", "pic_tours_id"],
      open_letters: ["comment_post_letter", "letter_id", "like_post_letter", "letter_id"], mondo_market: ["mondon_market_comment", "item_id", "mondon_market_like", "item_id"],
      on_news: ["news_comment", "news_id", "like_news", "news_id"], qafi: ["qafi_comment", "qafi_id", "like_qafi", "qafi_id"], gebc: ["gebc_comment", "gebc_id", "like_gebc", "gebc_id"],
      sports: ["sport_comment", "sport_id", "sport_like", "sport_id"], cinematics: ["cinematics_video_comment", "video_id", "cinematics_video_like", "video_id"],
      fan_star: ["fan_star_video_comment", "video_id", "fan_star_video_like", "video_id"], tv_progmax: ["tv_progmax_video_comment", "video_id", "tv_progmax_video_like", "video_id"],
      kid_vids: ["kid_vids_video_comment", "video_id", "kid_vids_video_like", "video_id"], learning_hobbies: ["learning_hobbies_video_comment", "video_id", "learning_hobbies_video_like", "video_id"],
    };
    let totalComments = 0, totalLikes = 0;
    for (const [mod, [cTable, cCol, lTable, lCol]] of Object.entries(ENGAGE)) {
      const top = []; const likes = [];
      for (const post of made[mod]) {
        const others = U.filter((u) => u !== post.user);
        shuffle(others).slice(0, int(2, 8)).forEach((u) => likes.push([post.id, u, new Date(post.at.getTime() + rnd() * 5 * 864e5)]));
        shuffle(others).slice(0, int(0, 3)).forEach((u) => top.push({ post, u, text: pick(pools.comments), at: new Date(post.at.getTime() + (0.1 + rnd() * 6) * 864e5) }));
      }
      const parents = await insertMany(client, cTable, [cCol, "user_id", "comment", "created_at", "updated_at"], top.map((c) => [c.post.id, c.u, c.text, c.at, c.at]));
      const replies = [];
      top.forEach((c, i) => { if (rnd() < 0.35) { const who = pick(U.filter((u) => u !== c.u)); replies.push([c.post.id, who, `@${uname[c.u]} ${pick(pools.comments)}`, parents[i], new Date(c.at.getTime() + 36e5 * int(1, 20))]); } });
      if (replies.length) await insertMany(client, cTable, [cCol, "user_id", "comment", "parent_comment_id", "created_at"], replies, { returning: null });
      await insertMany(client, lTable, [lCol, "user_id", "created_at"], likes, { returning: null, conflict: true });
      totalComments += top.length + replies.length; totalLikes += likes.length;
    }
    console.log(`engagement: ${totalComments} comments (with replies), ${totalLikes} likes`);

    // ---- top entries --------------------------------------------------------------------------------------
    const topCount = { on_news: 2, qafi: 1 };
    let tops = 0;
    for (const mod of Object.keys(ENGAGE)) {
      const n = topCount[mod] ?? 3;
      const posts = made[mod];
      const chosen = [0, Math.floor(posts.length / 3), Math.floor((2 * posts.length) / 3)].slice(0, n).map((i) => posts[i]);
      await insertMany(client, "top_entries", ["module", "item_id", "position", "created_by"], chosen.map((p, i) => [mod, p.id, i + 1, admin.id]), { returning: null });
      tops += chosen.length;
    }
    console.log(`top entries: ${tops} (3 per module; on_news 2, qafi 1; mass_apps none)`);

    await client.query("COMMIT");
    console.log("\nDone. Log in as any demo user, e.g.  ava_martin@" + DEMO_DOMAIN + "  /  " + DEMO_PASSWORD);
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch { /* none */ }
    console.error("\nFAILED, nothing was written:", err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}
main();
