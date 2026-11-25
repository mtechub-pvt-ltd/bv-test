-- Migration: comment moderation, comment likes, report review metadata, lookup indexes.
-- Idempotent: safe to run repeatedly. The same statements are appended to model/init.sql
-- so they are also applied automatically on server start.

-- 1. Report review metadata
ALTER TABLE IF EXISTS public.general_report ADD COLUMN IF NOT EXISTS reviewed_by INT REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS public.general_report ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS public.general_report ADD COLUMN IF NOT EXISTS admin_note TEXT;
CREATE INDEX IF NOT EXISTS idx_general_report_lookup ON public.general_report (type, module_type, target_id);
CREATE INDEX IF NOT EXISTS idx_general_report_status_created ON public.general_report (status, created_at DESC);

-- 2. Comment likes (one table for all 13 comment tables)
CREATE TABLE IF NOT EXISTS public.comment_likes (
    id             SERIAL PRIMARY KEY,
    comment_table  VARCHAR(100) NOT NULL,
    comment_id     INT NOT NULL,
    user_id        INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_comment_like UNIQUE (comment_table, comment_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON public.comment_likes (comment_table, comment_id);

-- The *_id post columns of the comment tables are nullable. Each statement is guarded and idempotent.
DO $$
DECLARE
  stmt text;
BEGIN
  FOREACH stmt IN ARRAY ARRAY[
    'ALTER TABLE public.pic_comment ALTER COLUMN pic_tours_id DROP NOT NULL',
    'ALTER TABLE public.news_comment ALTER COLUMN news_id DROP NOT NULL',
    'ALTER TABLE public.gebc_comment ALTER COLUMN gebc_id DROP NOT NULL',
    'ALTER TABLE public.qafi_comment ALTER COLUMN qafi_id DROP NOT NULL',
    'ALTER TABLE public.sport_comment ALTER COLUMN sport_id DROP NOT NULL',
    'ALTER TABLE public.video_comment ALTER COLUMN video_id DROP NOT NULL'
  ] LOOP
    BEGIN
      EXECUTE stmt;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'skip (%): %', stmt, SQLERRM;
    END;
  END LOOP;
END $$;
