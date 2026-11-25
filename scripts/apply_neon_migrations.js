import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../db.config/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, "../migrations");

const customPatches = [
  {
    name: "Add caption_url to xpi_videos",
    sql: `
      ALTER TABLE public.xpi_videos ADD COLUMN IF NOT EXISTS caption_url TEXT;
    `,
  },
  {
    name: "Create gold_badge_applications table",
    sql: `
      CREATE TABLE IF NOT EXISTS public.gold_badge_applications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        business_name VARCHAR(255) NOT NULL,
        entity_type VARCHAR(100) NOT NULL,
        official_website VARCHAR(500),
        registration_document_url TEXT,
        business_license_url TEXT,
        media_coverage_urls JSONB DEFAULT '[]'::jsonb,
        status VARCHAR(50) DEFAULT 'pending',
        rejection_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_gold_badge_applications_user_id ON public.gold_badge_applications(user_id);
      CREATE INDEX IF NOT EXISTS idx_gold_badge_applications_status ON public.gold_badge_applications(status);
    `,
  },
  {
    name: "Create chat_messages table",
    sql: `
      CREATE TABLE IF NOT EXISTS public.chat_messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        receiver_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        content TEXT,
        message_type VARCHAR(50) DEFAULT 'text',
        image_url TEXT,
        voice_url TEXT,
        file_name VARCHAR(255),
        file_size BIGINT,
        mime_type VARCHAR(100),
        room_id VARCHAR(100) NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        offer_item JSONB DEFAULT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON public.chat_messages(room_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON public.chat_messages(sender_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver_id ON public.chat_messages(receiver_id);
    `,
  },
  {
    name: "Create uppercase compatibility views for NEWS, QAFI, GEBC",
    sql: `
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'news') THEN
          EXECUTE 'CREATE OR REPLACE VIEW public."NEWS" AS SELECT * FROM public.news';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'news_category') THEN
          EXECUTE 'CREATE OR REPLACE VIEW public."NEWS_category" AS SELECT * FROM public.news_category';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'news_sub_category') THEN
          EXECUTE 'CREATE OR REPLACE VIEW public."NEWS_sub_category" AS SELECT * FROM public.news_sub_category';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'qafi') THEN
          EXECUTE 'CREATE OR REPLACE VIEW public."QAFI" AS SELECT * FROM public.qafi';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'qafi_category') THEN
          EXECUTE 'CREATE OR REPLACE VIEW public."QAFI_category" AS SELECT * FROM public.qafi_category';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'qafi_sub_category') THEN
          EXECUTE 'CREATE OR REPLACE VIEW public."QAFI_sub_category" AS SELECT * FROM public.qafi_sub_category';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gebc') THEN
          EXECUTE 'CREATE OR REPLACE VIEW public."GEBC" AS SELECT * FROM public.gebc';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gebc_category') THEN
          EXECUTE 'CREATE OR REPLACE VIEW public."GEBC_category" AS SELECT * FROM public.gebc_category';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gebc_sub_category') THEN
          EXECUTE 'CREATE OR REPLACE VIEW public."GEBC_sub_category" AS SELECT * FROM public.gebc_sub_category';
        END IF;
      END $$;
    `,
  },
];

const prioritySqlFiles = [
  "add_index_to_categories.sql",
  "add_comment_edit_delete_all_modules.sql",
  "update_users_table_migration.sql",
  "add_badge_subscription_key.sql",
  "add_user_location_columns.sql",
  "add_user_bio_column.sql",
  "add_user_profession_column.sql",
  "add_user_state_region_columns.sql",
  "add_user_2fa_login_alerts.sql",
  "add_user_privacy_and_likes.sql",
  "add_item_city_state_columns.sql",
  "add_banner_category_columns.sql",
  "add_banner_transaction_columns.sql",
  "add_stripe_payments_table.sql",
  "create_subscription_table.sql",
  "migration_general_save_item.sql",
  "add_name_column_news.sql",
  "add_nested_comments_all_modules.sql",
  "add_nested_comment_reply_support.sql",
  "add_subcategory_category_id_indexes.sql",
  "create_general_report_and_add_hidden_to_comments.sql",
  "drop_all_module_category_fks.sql",
  "drop_all_shared_post_fks.sql",
  "drop_xpi_shared_post_fk.sql",
  "make_banner_link_nullable.sql",
  "make_categories_nullable.sql",
  "make_item_location_region_optional.sql",
  "make_open_letter_contact_no_optional.sql",
  "remove_check_valid_banner_link.sql",
  "remove_xpi_video_category_fks.sql",
  "replace_app_storage_with_app_stash.sql",
  "disc_sub_category_open_letters_french.sql",
  "item_category_mondo_market_french_name.sql",
  "001_add_performance_indexes.sql",
  "002_materialized_view_leaderboard.sql",
  "add_additional_admin_query_indexes.sql",
  "add_admin_performance_indexes.sql",
];

async function run() {
  console.log("🚀 Starting database schema updates on Neon...");

  // 1. Run custom patches
  for (const patch of customPatches) {
    try {
      console.log(`Applying patch: ${patch.name}...`);
      await pool.query(patch.sql);
      console.log(`✅ Patch "${patch.name}" applied successfully.`);
    } catch (err) {
      console.warn(`⚠️ Patch "${patch.name}" error:`, err.message || err);
    }
  }

  // 2. Run priority migration SQL files
  for (const fileName of prioritySqlFiles) {
    const filePath = path.join(migrationsDir, fileName);
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found, skipping: ${fileName}`);
      continue;
    }
    console.log(`Running migration file: ${fileName}...`);
    try {
      const sql = fs.readFileSync(filePath, "utf-8");
      await pool.query(sql);
      console.log(`✅ Migration "${fileName}" completed successfully.`);
    } catch (err) {
      console.warn(`⚠️ Migration "${fileName}" notice:`, err.message || err);
    }
  }

  console.log("\n✨ All pending migrations and patches executed!");
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Fatal error executing migrations:", err);
  process.exit(1);
});

