import pool from "../db.config/index.js";
import { clearAllCache } from "../utils/cacheService.js";

const CLEAN_REPLACEMENTS = [
  {
    name: "Elephants Dream (Award-Winning 3D Animation)",
    desc: "A stunning animated journey exploring an extraordinary world of machinery, technology, and visionary wonder.",
    video: "https://archive.org/download/ElephantsDream/ed_1024.mp4",
    thumb: "https://archive.org/services/img/ElephantsDream"
  },
  {
    name: "Big Buck Bunny (High-Definition 3D Animation)",
    desc: "A charming, world-famous animated forest adventure filled with humorous woodland characters and delightful moments.",
    video: "https://archive.org/download/BigBuckBunny_328/BigBuckBunny_512kb.mp4",
    thumb: "https://archive.org/services/img/BigBuckBunny_328"
  },
  {
    name: "Sita Sings the Blues (Feature Animated Film)",
    desc: "An internationally acclaimed animated musical masterpiece blending mythic folklore with vibrant jazz rhythms.",
    video: "https://archive.org/download/Sita_Sings_the_Blues/SITA_SINGS_MOVIE_ONLY.mp4",
    thumb: "https://archive.org/services/img/Sita_Sings_the_Blues"
  },
  {
    name: "About Bananas (Global Expedition Documentary)",
    desc: "A fascinating documentary voyage exploring global tropical agriculture, harvest techniques, and worldwide shipping routes.",
    video: "https://archive.org/download/AboutBan1935/AboutBan1935.mp4",
    thumb: "https://archive.org/services/img/AboutBan1935"
  },
  {
    name: "Automotive Service Excellence (Engineering Innovation)",
    desc: "A deep dive into advanced automotive precision engineering, mechanical craftsmanship, and performance maintenance.",
    video: "https://archive.org/download/Automoti1940/Automoti1940.mp4",
    thumb: "https://archive.org/services/img/Automoti1940"
  },
  {
    name: "Care of the Skin & Health (Wellness Masterclass)",
    desc: "A comprehensive health and wellness guide covering daily skincare habits, nutrition, and natural hygiene practices.",
    video: "https://archive.org/download/Careofth1949/Careofth1949.mp4",
    thumb: "https://archive.org/services/img/Careofth1949"
  },
  {
    name: "Sniffles and Sneezes (Health & Science Educational)",
    desc: "An informative, accessible educational feature demonstrating immunology, seasonal health protection, and body wellness.",
    video: "https://archive.org/download/Sniffles1955/Sniffles1955.mp4",
    thumb: "https://archive.org/services/img/Sniffles1955"
  },
  {
    name: "Cherry Knight (Broadcast Feature Production)",
    desc: "A high-definition broadcast entertainment special featuring creative talent and engaging on-screen performances.",
    video: "https://archive.org/download/CherryKnight/CherryKnight.mp4",
    thumb: "https://archive.org/services/img/CherryKnight"
  },
  {
    name: "Duck and Cover (Historical Documentary Feature)",
    desc: "A classic mid-century educational documentary exploring Cold War cultural history and civil defense programs.",
    video: "https://archive.org/download/DuckandC1951/DuckandC1951.ia.mp4",
    thumb: "https://archive.org/services/img/DuckandC1951"
  },
  {
    name: "Viva La Bam (Extreme Stunts & Comedy Edition)",
    desc: "High-energy comedic antics and wild team challenges filled with non-stop laughter and lighthearted entertainment.",
    video: "https://archive.org/download/vivalabam/Viva%20La%20Bam%2FS01%2Fviva.la.bam.s01e01.phils.hell.day.dvdrip.xvid-fqm.mp4",
    thumb: "https://archive.org/services/img/vivalabam"
  }
];

const BAD_KEYWORDS = [
  "panties",
  "vibrating",
  "bikini",
  "swim suit",
  "swimsuit",
  "yoga pant",
  "sex",
  "porn",
  "lingerie",
  "underwear",
  "try on haul",
  "dressing room",
  "boys beware",
  "as boys grow",
  "child sex"
];

const TABLES = [
  "xpi_videos",
  "tv_progmax_videos",
  "kid_vids_videos",
  "fan_star_videos",
  "learning_hobbies_videos",
  "cinematics_videos"
];

async function purgeInappropriateMedia() {
  console.log("==========================================================");
  console.log("🛡 PURGING AND REPLACING ALL INAPPROPRIATE / NSFW MEDIA");
  console.log("==========================================================");

  let totalReplaced = 0;
  let repIdx = 0;

  for (const table of TABLES) {
    const whereConditions = BAD_KEYWORDS.map(k => `LOWER(name) LIKE '%${k}%' OR LOWER(description) LIKE '%${k}%'`).join(" OR ");
    const query = `SELECT id, name FROM ${table} WHERE ${whereConditions}`;
    const res = await pool.query(query);

    if (res.rows.length > 0) {
      console.log(`\nTable ${table}: found ${res.rows.length} records to sanitize.`);
      for (const row of res.rows) {
        const rep = CLEAN_REPLACEMENTS[repIdx % CLEAN_REPLACEMENTS.length];
        repIdx++;

        if (table === "fan_star_videos") {
          await pool.query(
            `UPDATE ${table} 
             SET name = $1, description = $2, video = $3, thumbnail = $4, image = $4, type = 'video', status = 'approved', updated_at = NOW() 
             WHERE id = $5`,
            [rep.name, rep.desc, rep.video, rep.thumb, row.id]
          );
        } else {
          await pool.query(
            `UPDATE ${table} 
             SET name = $1, description = $2, video = $3, thumbnail = $4, status = 'approved', updated_at = NOW() 
             WHERE id = $5`,
            [rep.name, rep.desc, rep.video, rep.thumb, row.id]
          );
        }
        totalReplaced++;
        console.log(`  ✔ Replaced ID ${row.id} ("${row.name}") -> "${rep.name}"`);
      }
    } else {
      console.log(`Table ${table}: 0 inappropriate records found.`);
    }
  }

  // Clear application cache
  try {
    await clearAllCache();
    console.log("\n✔ Application and Redis cache cleared!");
  } catch (e) {
    console.warn("Cache notice:", e.message);
  }

  console.log(`\n==========================================================`);
  console.log(`🎉 PURGE COMPLETE! Successfully sanitized and replaced ${totalReplaced} records.`);
  console.log(`==========================================================`);
  process.exit(0);
}

purgeInappropriateMedia();
