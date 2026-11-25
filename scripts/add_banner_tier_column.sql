-- Run once against PostgreSQL: psql $DATABASE_URL -f scripts/add_banner_tier_column.sql
ALTER TABLE public.banner
  ADD COLUMN IF NOT EXISTS banner_tier character varying(20);

UPDATE public.banner
SET banner_tier = CASE
  WHEN top_banner = TRUE THEN 'premium'
  ELSE COALESCE(
    CASE category_table
      WHEN 'video_category' THEN 'premium'
      WHEN 'pic_category' THEN 'middle'
      WHEN 'news_category' THEN 'middle'
      WHEN 'sports_category' THEN 'middle'
      WHEN 'disc_category' THEN 'middle'
      WHEN 'tv_progmax_category' THEN 'middle'
      WHEN 'qafi_category' THEN 'middle'
      WHEN 'learning_hobbies_category' THEN 'middle'
      WHEN 'kid_vids_category' THEN 'lower'
      WHEN 'fan_star_category' THEN 'lower'
      WHEN 'cinematics_category' THEN 'lower'
      WHEN 'gebc_category' THEN 'lower'
      WHEN 'item_category' THEN 'lower'
      WHEN 'mass_app' THEN 'lower'
      ELSE 'middle'
    END,
    'middle'
  )
END
WHERE banner_tier IS NULL;

ALTER TABLE public.banner
  ALTER COLUMN banner_tier SET DEFAULT 'middle';

UPDATE public.banner SET banner_tier = 'middle' WHERE banner_tier IS NULL;

ALTER TABLE public.banner
  DROP CONSTRAINT IF EXISTS check_banner_tier;

ALTER TABLE public.banner
  ADD CONSTRAINT check_banner_tier
  CHECK (banner_tier IN ('premium', 'middle', 'lower'));
