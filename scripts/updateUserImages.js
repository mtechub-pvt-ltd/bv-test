import pool from "../db.config/index.js";

const AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=500&q=80"
];

async function main() {
  try {
    const res = await pool.query("SELECT id, username, email, image FROM users ORDER BY id ASC");
    console.log(`Found ${res.rows.length} total users in DB.`);

    let updatedCount = 0;
    for (let i = 0; i < res.rows.length; i++) {
      const u = res.rows[i];
      const avatarUrl = AVATARS[i % AVATARS.length];
      await pool.query("UPDATE users SET image = $1 WHERE id = $2", [avatarUrl, u.id]);
      updatedCount++;
    }

    console.log(`Successfully updated profile images for ${updatedCount} users.`);
    process.exit(0);
  } catch (err) {
    console.error("Error updating user images:", err);
    process.exit(1);
  }
}

main();
