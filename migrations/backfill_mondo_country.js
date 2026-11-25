/**
 * Backfill: add real country_code, country, city, state (and a sensible
 * location string) to every mondo seed item that currently has them NULL.
 *
 *   - Targets: user_id = 7, title LIKE 'mondo %'
 *   - Per region we cycle through 8 real countries (code/name/city/state).
 *   - The slot inside a (sub_category, region) group is the row's position
 *     by id, so reruns are deterministic and idempotent.
 *
 *   - Uncategorized items have region = NULL — they only get their
 *     location set to 'Online' so the column isn't 'Sample location'.
 *
 * Usage (from repo root):
 *   node migrations/backfill_mondo_country.js            # run backfill
 *   node migrations/backfill_mondo_country.js --dry-run  # preview only
 */
import pool from "../db.config/index.js";

const OWNER_USER_ID = 7;

// DB stores region in lowercase (matches seed_mondo_market_full.js).
// 8 countries per region: [code, country, city, state].
const REGION_GEO = {
  asia: [
    ["PK", "Pakistan", "Karachi", "Sindh"],
    ["IN", "India", "Mumbai", "Maharashtra"],
    ["JP", "Japan", "Tokyo", "Tokyo"],
    ["CN", "China", "Shanghai", "Shanghai"],
    ["BD", "Bangladesh", "Dhaka", "Dhaka Division"],
    ["ID", "Indonesia", "Jakarta", "Jakarta"],
    ["SA", "Saudi Arabia", "Riyadh", "Riyadh Region"],
    ["TR", "Turkey", "Istanbul", "Istanbul"],
  ],
  europe: [
    ["FR", "France", "Paris", "Île-de-France"],
    ["DE", "Germany", "Berlin", "Berlin"],
    ["ES", "Spain", "Madrid", "Community of Madrid"],
    ["IT", "Italy", "Rome", "Lazio"],
    ["GB", "United Kingdom", "London", "England"],
    ["NL", "Netherlands", "Amsterdam", "North Holland"],
    ["PL", "Poland", "Warsaw", "Masovia"],
    ["SE", "Sweden", "Stockholm", "Stockholm County"],
  ],
  americas: [
    ["US", "United States", "New York", "New York"],
    ["CA", "Canada", "Toronto", "Ontario"],
    ["BR", "Brazil", "São Paulo", "São Paulo"],
    ["MX", "Mexico", "Mexico City", "Mexico City"],
    ["AR", "Argentina", "Buenos Aires", "Buenos Aires"],
    ["CO", "Colombia", "Bogotá", "Bogotá D.C."],
    ["CL", "Chile", "Santiago", "Santiago Metropolitan"],
    ["PE", "Peru", "Lima", "Lima Region"],
  ],
  africa: [
    ["NG", "Nigeria", "Lagos", "Lagos"],
    ["EG", "Egypt", "Cairo", "Cairo Governorate"],
    ["ZA", "South Africa", "Johannesburg", "Gauteng"],
    ["KE", "Kenya", "Nairobi", "Nairobi County"],
    ["ET", "Ethiopia", "Addis Ababa", "Addis Ababa"],
    ["MA", "Morocco", "Casablanca", "Casablanca-Settat"],
    ["GH", "Ghana", "Accra", "Greater Accra"],
    ["TZ", "Tanzania", "Dar es Salaam", "Dar es Salaam"],
  ],
};

const isDryRun = () => process.argv.includes("--dry-run");

async function assignRegionGeo() {
  let total = 0;
  for (const region of Object.keys(REGION_GEO)) {
    const list = REGION_GEO[region];
    const codes = list.map((r) => r[0]);
    const names = list.map((r) => r[1]);
    const cities = list.map((r) => r[2]);
    const states = list.map((r) => r[3]);

    const params = [
      OWNER_USER_ID,                       // $1
      ...codes,                            // $2..$9
      ...names,                            // $10..$17
      ...cities,                           // $18..$25
      ...states,                           // $26..$33
      region,                              // $34
    ];

    const q = `
      WITH ranked AS (
        SELECT i.id,
               ROW_NUMBER() OVER (
                 PARTITION BY i.sub_category
                 ORDER BY i.id
               ) AS rn
          FROM item i
         WHERE i.user_id = $1
           AND i.title LIKE 'mondo %'
           AND i.region = $34
      )
      UPDATE item i
         SET country_code = (ARRAY[$2::text,$3,$4,$5,$6,$7,$8,$9])[((r.rn - 1) % 8) + 1],
             country      = (ARRAY[$10,$11,$12,$13,$14,$15,$16,$17])[((r.rn - 1) % 8) + 1],
             city         = (ARRAY[$18,$19,$20,$21,$22,$23,$24,$25])[((r.rn - 1) % 8) + 1],
             state        = (ARRAY[$26,$27,$28,$29,$30,$31,$32,$33])[((r.rn - 1) % 8) + 1],
             location     = (ARRAY[$18,$19,$20,$21,$22,$23,$24,$25])[((r.rn - 1) % 8) + 1]
                            || ', '
                            || (ARRAY[$10,$11,$12,$13,$14,$15,$16,$17])[((r.rn - 1) % 8) + 1]
        FROM ranked r
       WHERE i.id = r.id
         AND i.region = $34
    `;
    const res = await pool.query(q, params);
    total += res.rowCount;
    console.log(`  ${region}: updated ${res.rowCount} rows`);
  }
  return total;
}

async function assignUncategorizedGeo() {
  // Uncategorized rows have region = NULL. Cycle through the combined pool
  // (32 countries across all 4 regions) deterministically by sub_category +
  // position, so they look geographically diverse instead of all "Online".
  const combined = [].concat(...Object.values(REGION_GEO));
  const codes = combined.map((r) => r[0]);
  const names = combined.map((r) => r[1]);
  const cities = combined.map((r) => r[2]);
  const states = combined.map((r) => r[3]);
  const mod = combined.length; // 32

  // We need positional array indexing on ROW_NUMBER() — build a parameter
  // list long enough (2..33 for codes, plus same length slots for
  // names/cities/states by shifting base indices).
  const codeParams = codes.map((_, i) => `$${i + 2}::text`).join(",");
  const nameParams = names.map((_, i) => `$${i + 2 + mod}`).join(",");
  const cityParams = cities.map((_, i) => `$${i + 2 + mod * 2}`).join(",");
  const stateParams = states.map((_, i) => `$${i + 2 + mod * 3}`).join(",");
  const codeArr = `ARRAY[${codeParams}]`;
  const nameArr = `ARRAY[${nameParams}]`;
  const cityArr = `ARRAY[${cityParams}]`;
  const stateArr = `ARRAY[${stateParams}]`;

  const params = [
    OWNER_USER_ID,           // $1
    ...codes,                // $2..$(2+mod-1)
    ...names,                // next mod
    ...cities,
    ...states,
    mod,                     // last param, used only for the modulo
  ];

  const q = `
    WITH ranked AS (
      SELECT i.id,
             ROW_NUMBER() OVER (
               PARTITION BY i.sub_category
               ORDER BY i.id
             ) AS rn
        FROM item i
       WHERE i.user_id = $1
         AND i.title LIKE 'mondo %'
         AND i.region IS NULL
    )
    UPDATE item i
       SET country_code = ${codeArr}[((r.rn - 1) % ${mod}) + 1],
           country      = ${nameArr}[((r.rn - 1) % ${mod}) + 1],
           city         = ${cityArr}[((r.rn - 1) % ${mod}) + 1],
           state        = ${stateArr}[((r.rn - 1) % ${mod}) + 1],
           location     = ${cityArr}[((r.rn - 1) % ${mod}) + 1]
                          || ', '
                          || ${nameArr}[((r.rn - 1) % ${mod}) + 1]
      FROM ranked r
     WHERE i.id = r.id
       AND i.region IS NULL
  `;
  const res = await pool.query(q, params);
  return res.rowCount;
}

async function summarize() {
  const r = await pool.query(`
    SELECT i.region,
           COUNT(*)::int                                                   AS n,
           COUNT(*) FILTER (WHERE i.country_code IS NOT NULL)::int         AS with_code,
           COUNT(*) FILTER (WHERE i.country IS NOT NULL)::int             AS with_country,
           COUNT(*) FILTER (WHERE i.city IS NOT NULL)::int                AS with_city,
           COUNT(*) FILTER (WHERE i.state IS NOT NULL)::int               AS with_state
      FROM item i
     WHERE i.user_id = $1 AND i.title LIKE 'mondo %'
     GROUP BY i.region
     ORDER BY i.region NULLS LAST
  `, [OWNER_USER_ID]);
  return r.rows;
}

async function run() {
  const dry = isDryRun();
  console.log(`=== mondo seed: country backfill (${dry ? "DRY RUN" : "LIVE"}) ===`);
  try {
    if (dry) {
      console.log("Before:", await summarize());
      console.log("(dry-run: not writing)");
      process.exit(0);
    }
    const updated = await assignRegionGeo();
    const uncategorized = await assignUncategorizedGeo();
    console.log(`Region rows updated: ${updated}. Uncategorized rows updated: ${uncategorized}.`);
    console.log("After:", await summarize());
    process.exit(0);
  } catch (err) {
    console.error("Backfill failed:", err);
    process.exit(1);
  }
}

run();