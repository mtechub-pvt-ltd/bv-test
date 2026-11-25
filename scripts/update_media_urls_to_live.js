import pool from "../db.config/index.js";

const OLD_URL_PREFIX = "http://localhost:3801";
const NEW_URL_PREFIX = "https://wocha-gocha.testing.mtechub.org";

async function updateMediaUrls() {
  console.log(`Starting media URL update in database...`);
  console.log(`Replacing "${OLD_URL_PREFIX}" with "${NEW_URL_PREFIX}"\n`);

  const client = await pool.connect();

  try {
    // 1. Get all text/varchar/character columns in the public schema
    const colQuery = `
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND data_type IN ('text', 'character varying', 'character', 'json', 'jsonb')
      ORDER BY table_name, column_name;
    `;
    const { rows: cols } = await client.query(colQuery);

    let totalUpdatedCols = 0;
    let totalUpdatedRows = 0;

    for (const col of cols) {
      // Check if this column contains localhost
      const countCheck = await client.query(
        `SELECT COUNT(*) as count FROM "${col.table_name}" WHERE "${col.column_name}"::text LIKE $1`,
        ["%localhost%"]
      );
      const matchingCount = parseInt(countCheck.rows[0].count, 10);

      if (matchingCount > 0) {
        console.log(`[UPDATE] ${col.table_name}.${col.column_name} has ${matchingCount} rows with localhost.`);
        
        // Update the column
        // We use REPLACE(column_name, 'http://localhost:3801', 'https://wocha-gocha.testing.mtechub.org')
        const updateQuery = `
          UPDATE "${col.table_name}"
          SET "${col.column_name}" = REPLACE("${col.column_name}", $1, $2)
          WHERE "${col.column_name}" LIKE $3
        `;
        
        const updateRes = await client.query(updateQuery, [
          OLD_URL_PREFIX,
          NEW_URL_PREFIX,
          `%${OLD_URL_PREFIX}%`
        ]);

        console.log(`  ✔ Updated ${updateRes.rowCount} rows in ${col.table_name}.${col.column_name}`);
        totalUpdatedCols++;
        totalUpdatedRows += updateRes.rowCount;

        // Check if any other localhost patterns remain in this column (e.g. without port 3801)
        const remCheck = await client.query(
          `SELECT COUNT(*) as count FROM "${col.table_name}" WHERE "${col.column_name}"::text LIKE $1`,
          ["%localhost%"]
        );
        const remCount = parseInt(remCheck.rows[0].count, 10);
        if (remCount > 0) {
          console.log(`  ⚠️ Notice: ${remCount} rows still have localhost with other patterns. Performing regex replace...`);
          const regexUpdate = `
            UPDATE "${col.table_name}"
            SET "${col.column_name}" = REGEXP_REPLACE("${col.column_name}", 'http://localhost(:[0-9]+)?', $1, 'g')
            WHERE "${col.column_name}" LIKE '%localhost%'
          `;
          const regexRes = await client.query(regexUpdate, [NEW_URL_PREFIX]);
          console.log(`  ✔ Regex updated additional ${regexRes.rowCount} rows.`);
        }
      }
    }

    console.log(`\n========================================`);
    console.log(`SUMMARY: Updated ${totalUpdatedRows} rows across ${totalUpdatedCols} columns.`);
    console.log(`========================================\n`);

    // Verify
    console.log("Verifying remaining localhost occurrences across all columns...");
    let remainingTotal = 0;
    for (const col of cols) {
      try {
        const checkQ = `SELECT COUNT(*) as count FROM "${col.table_name}" WHERE "${col.column_name}"::text LIKE $1`;
        const res = await client.query(checkQ, ["%localhost%"]);
        const count = parseInt(res.rows[0].count, 10);
        if (count > 0) {
          console.log(`⚠️ Remaining: ${col.table_name}.${col.column_name} has ${count} matching records.`);
          remainingTotal += count;
        }
      } catch (err) {}
    }

    if (remainingTotal === 0) {
      console.log("✅ VERIFICATION SUCCESSFUL: 0 localhost URLs remain in the database!");
    } else {
      console.log(`⚠️ Warning: ${remainingTotal} localhost occurrences remain.`);
    }

    // Sample check on cinematics_videos (like the example in user request)
    console.log("\nSample check from cinematics_videos:");
    const sampleRes = await client.query(`
      SELECT id, name, thumbnail, video 
      FROM cinematics_videos 
      ORDER BY id ASC 
      LIMIT 3
    `);
    console.log(JSON.stringify(sampleRes.rows, null, 2));

  } catch (err) {
    console.error("Error executing update:", err);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

updateMediaUrls();
