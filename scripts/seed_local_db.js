import bcrypt from "bcryptjs";
import pool from "../db.config/index.js";

async function seedDatabase() {
  try {
    console.log("1. Creating / updating default admin user...");
    const hashedPassword = await bcrypt.hash("admin123", 10);
    
    // Insert/update admin user
    const checkUser = await pool.query("SELECT * FROM users WHERE email = $1", ["admin@gmail.com"]);
    if (checkUser.rows.length === 0) {
      await pool.query(
        `INSERT INTO users (username, email, password, role, verified, is_deleted, block) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ["Admin", "admin@gmail.com", hashedPassword, "admin", true, false, false]
      );
      console.log("✔ Admin user created: admin@gmail.com / admin123");
    } else {
      await pool.query(
        `UPDATE users SET password = $1, role = 'admin', verified = true, is_deleted = false, block = false WHERE email = $2`,
        [hashedPassword, "admin@gmail.com"]
      );
      console.log("✔ Admin user updated: admin@gmail.com / admin123");
    }

    console.log("2. Populating sample categories & sub-categories...");

    const seedModule = async (catTable, subTable, moduleName, sampleData) => {
      try {
        for (let i = 0; i < sampleData.length; i++) {
          const cat = sampleData[i];
          let catRes = await pool.query(`SELECT id FROM ${catTable} WHERE name = $1`, [cat.name]);
          let catId;
          if (catRes.rows.length === 0) {
            const insRes = await pool.query(
              `INSERT INTO ${catTable} (name, french_name, "index") VALUES ($1, $2, $3) RETURNING id`,
              [cat.name, cat.french_name, i]
            );
            catId = insRes.rows[0].id;
          } else {
            catId = catRes.rows[0].id;
          }

          if (cat.subs && cat.subs.length > 0) {
            for (let j = 0; j < cat.subs.length; j++) {
              const sub = cat.subs[j];
              const subCheck = await pool.query(
                `SELECT id FROM ${subTable} WHERE category_id = $1 AND name = $2`,
                [catId, sub.name]
              );
              if (subCheck.rows.length === 0) {
                await pool.query(
                  `INSERT INTO ${subTable} (category_id, name, french_name, "index") VALUES ($1, $2, $3, $4)`,
                  [catId, sub.name, sub.french_name, j]
                );
              }
            }
          }
        }
        console.log(`  ✔ Seeded ${moduleName} categories.`);
      } catch (err) {
        console.warn(`  ⚠ Warning seeding ${moduleName}:`, err.message);
      }
    };

    // Sample data definitions
    const sampleCategories = [
      { name: "Nature & Landscapes", french_name: "Nature et paysages", subs: [{ name: "Mountain Views", french_name: "Vues sur la montagne" }, { name: "Ocean & Beaches", french_name: "Océan et plages" }] },
      { name: "City & Architecture", french_name: "Ville et architecture", subs: [{ name: "Skyscrapers", french_name: "Gratte-ciel" }, { name: "Historic Monuments", french_name: "Monuments historiques" }] },
      { name: "Wildlife & Safari", french_name: "Faune et safari", subs: [{ name: "African Safari", french_name: "Safari africain" }, { name: "Marine Life", french_name: "Vie marine" }] },
      { name: "Culinary & Food", french_name: "Cuisine et nourriture", subs: [{ name: "Street Food", french_name: "Cuisine de rue" }, { name: "Fine Dining", french_name: "Restauration gastronomique" }] },
      { name: "Technology & Gadgets", french_name: "Technologie et gadgets", subs: [{ name: "Smartphones", french_name: "Smartphones" }, { name: "AI & Robotics", french_name: "IA et robotique" }] },
      { name: "Arts & Culture", french_name: "Arts et culture", subs: [{ name: "Modern Painting", french_name: "Peinture moderne" }, { name: "Classical Music", french_name: "Musique classique" }] }
    ];

    const modulesList = [
      { cat: "pic_category", sub: "pic_sub_category", name: "Pic Tours" },
      { cat: "video_category", sub: "video_sub_category", name: "Video Mania" },
      { cat: "app_category", sub: "app_sub_category", name: "Apps" },
      { cat: "item_category", sub: "item_sub_category", name: "Mondo Market" },
      { cat: "disc_category", sub: "disc_sub_category", name: "Open Letters / Disc" },
      { cat: "cinematics_category", sub: "cinematics_sub_category", name: "Cinematics" },
      { cat: "fan_star_category", sub: "fan_star_sub_category", name: "Fan Star" },
      { cat: "kid_vids_category", sub: "kid_vids_sub_category", name: "Kid Vids" },
      { cat: "learning_hobbies_category", sub: "learning_hobbies_sub_category", name: "Learning Hobbies" },
      { cat: "sports_category", sub: "sport_sub_category", name: "Sports" },
      { cat: "tv_progmax_category", sub: "tv_progmax_sub_category", name: "Tv Progmax" },
      { cat: "gebc_category", sub: "gebc_sub_category", name: "GEBC" },
      { cat: "news_category", sub: "news_sub_category", name: "News" },
      { cat: "qafi_category", sub: "qafi_sub_category", name: "QAFI" }
    ];

    for (const mod of modulesList) {
      await seedModule(mod.cat, mod.sub, mod.name, sampleCategories);
    }

    console.log("🎉 All local database modules seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Database seeding failed:", error);
    process.exit(1);
  }
}

seedDatabase();
