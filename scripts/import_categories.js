import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import pkg from "pg";
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "user6",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "watchagocha-db",
  port: Number(process.env.DB_PORT) || 5432,
});

async function checkColumnExists(client, tableName, columnName) {
  const res = await client.query(
    `SELECT 1 FROM information_schema.columns 
     WHERE table_schema = 'public' 
       AND LOWER(table_name) = LOWER($1) 
       AND LOWER(column_name) = LOWER($2)`,
    [tableName, columnName]
  );
  return res.rows.length > 0;
}

async function runImport() {
  const client = await pool.connect();
  try {
    const jsonPath = fs.existsSync(path.join(__dirname, "categories_parsed_from_excel.json"))
      ? path.join(__dirname, "categories_parsed_from_excel.json")
      : path.join(__dirname, "../categories_parsed_from_excel.json");
    const rawData = fs.readFileSync(jsonPath, "utf8");
    const moduleList = JSON.parse(rawData);

    // Get admin user ID
    const adminRes = await client.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    const adminId = adminRes.rows[0]?.id || 1;

    console.log("==================================================");
    console.log("🚀 STARTING CATEGORIES IMPORT FROM SPREADSHEET");
    console.log("==================================================");
    console.log(`Admin User ID: ${adminId}`);
    console.log(`Total Modules to Process: ${moduleList.length}\n`);

    let totalCatsInserted = 0;
    let totalSubsInserted = 0;

    for (const mod of moduleList) {
      const { moduleName, catTable, subTable, categories, subcategories } = mod;
      console.log(`▶ Processing Module: [${moduleName}]`);
      console.log(`  Tables: ${catTable} (Main) -> ${subTable} (Sub)`);
      console.log(`  Main Categories: ${categories.length}, Subcategories: ${subcategories.length}`);

      const hasCatIndex = await checkColumnExists(client, catTable, "index");
      const hasCatUserId = await checkColumnExists(client, catTable, "user_id");
      const hasSubIndex = await checkColumnExists(client, subTable, "index");

      let modCats = 0;
      let modSubs = 0;

      for (let i = 0; i < categories.length; i++) {
        const cat = categories[i];
        let catInsertSql = "";
        let catArgs = [];

        if (hasCatUserId && hasCatIndex) {
          catInsertSql = `INSERT INTO "${catTable}" (user_id, name, french_name, "index") VALUES ($1, $2, $3, $4) RETURNING id`;
          catArgs = [adminId, cat.name, cat.french_name, i];
        } else if (hasCatUserId) {
          catInsertSql = `INSERT INTO "${catTable}" (user_id, name, french_name) VALUES ($1, $2, $3) RETURNING id`;
          catArgs = [adminId, cat.name, cat.french_name];
        } else if (hasCatIndex) {
          catInsertSql = `INSERT INTO "${catTable}" (name, french_name, "index") VALUES ($1, $2, $3) RETURNING id`;
          catArgs = [cat.name, cat.french_name, i];
        } else {
          catInsertSql = `INSERT INTO "${catTable}" (name, french_name) VALUES ($1, $2) RETURNING id`;
          catArgs = [cat.name, cat.french_name];
        }

        const catRes = await client.query(catInsertSql, catArgs);
        const catId = catRes.rows[0].id;
        modCats++;

        // Insert all subcategories under this main category
        for (let j = 0; j < subcategories.length; j++) {
          const sub = subcategories[j];
          let subInsertSql = "";
          let subArgs = [];

          if (hasSubIndex) {
            subInsertSql = `INSERT INTO "${subTable}" (category_id, name, french_name, "index") VALUES ($1, $2, $3, $4)`;
            subArgs = [catId, sub.name, sub.french_name, j];
          } else {
            subInsertSql = `INSERT INTO "${subTable}" (category_id, name, french_name) VALUES ($1, $2, $3)`;
            subArgs = [catId, sub.name, sub.french_name];
          }

          await client.query(subInsertSql, subArgs);
          modSubs++;
        }
      }

      console.log(`  ✔ Inserted ${modCats} main categories & ${modSubs} subcategories.\n`);
      totalCatsInserted += modCats;
      totalSubsInserted += modSubs;
    }

    console.log("==================================================");
    console.log(`🎉 ALL CATEGORIES SUCCESSFULLY IMPORTED!`);
    console.log(`Total Main Categories: ${totalCatsInserted}`);
    console.log(`Total Sub-categories: ${totalSubsInserted}`);
    console.log("==================================================");
    process.exit(0);
  } catch (error) {
    console.error("❌ Import Failed:", error);
    process.exit(1);
  } finally {
    client.release();
  }
}

runImport();
