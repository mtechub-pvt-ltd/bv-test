-- Migration: Create general_report table and add is_hidden to all comment tables

CREATE TABLE IF NOT EXISTS public.general_report (
    id                 SERIAL PRIMARY KEY,
    type               VARCHAR(50) NOT NULL DEFAULT 'comment',
    module_type        VARCHAR(100) NOT NULL,
    target_id          INT NOT NULL,
    reporter_user_id   INT REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    reported_user_id   INT REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    reason             TEXT NOT NULL,
    details            TEXT,
    status             VARCHAR(50) NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_general_report_type ON public.general_report (type);
CREATE INDEX IF NOT EXISTS idx_general_report_status ON public.general_report (status);
CREATE INDEX IF NOT EXISTS idx_general_report_target ON public.general_report (type, target_id);
CREATE INDEX IF NOT EXISTS idx_general_report_reporter ON public.general_report (reporter_user_id);
CREATE INDEX IF NOT EXISTS idx_general_report_reported ON public.general_report (reported_user_id);

-- Add is_hidden to all 13 comment tables

ALTER TABLE IF EXISTS public.cinematics_video_comment
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE NOT NULL;

ALTER TABLE IF EXISTS public.comment_post_letter
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE NOT NULL;

ALTER TABLE IF EXISTS public.fan_star_video_comment
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE NOT NULL;

ALTER TABLE IF EXISTS public.gebc_comment
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE NOT NULL;

ALTER TABLE IF EXISTS public.kid_vids_video_comment
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE NOT NULL;

ALTER TABLE IF EXISTS public.learning_hobbies_video_comment
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE NOT NULL;

ALTER TABLE IF EXISTS public.mondon_market_comment
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE NOT NULL;

ALTER TABLE IF EXISTS public.news_comment
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE NOT NULL;

ALTER TABLE IF EXISTS public.pic_comment
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE NOT NULL;

ALTER TABLE IF EXISTS public.qafi_comment
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE NOT NULL;

ALTER TABLE IF EXISTS public.sport_comment
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE NOT NULL;

ALTER TABLE IF EXISTS public.tv_progmax_video_comment
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE NOT NULL;

ALTER TABLE IF EXISTS public.video_comment
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE NOT NULL;
