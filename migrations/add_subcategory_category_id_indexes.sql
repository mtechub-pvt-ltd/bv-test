-- Sub-category Category ID Index Migration
-- Eliminates full table scans on category list views with sub-category counts

CREATE INDEX IF NOT EXISTS idx_news_sub_category_category_id ON public.NEWS_sub_category (category_id);
CREATE INDEX IF NOT EXISTS idx_video_sub_category_category_id ON public.video_sub_category (category_id);
CREATE INDEX IF NOT EXISTS idx_pic_sub_category_category_id ON public.pic_sub_category (category_id);
CREATE INDEX IF NOT EXISTS idx_item_sub_category_category_id ON public.item_sub_category (category_id);
CREATE INDEX IF NOT EXISTS idx_qafi_sub_category_category_id ON public.qafi_sub_category (category_id);
CREATE INDEX IF NOT EXISTS idx_gebc_sub_category_category_id ON public.gebc_sub_category (category_id);
CREATE INDEX IF NOT EXISTS idx_cinematics_sub_category_category_id ON public.cinematics_sub_category (category_id);
CREATE INDEX IF NOT EXISTS idx_kid_vids_sub_category_category_id ON public.kid_vids_sub_category (category_id);
CREATE INDEX IF NOT EXISTS idx_fan_star_sub_category_category_id ON public.fan_star_sub_category (category_id);
CREATE INDEX IF NOT EXISTS idx_tv_progmax_sub_category_category_id ON public.tv_progmax_sub_category (category_id);
CREATE INDEX IF NOT EXISTS idx_learning_hobbies_sub_category_category_id ON public.learning_hobbies_sub_category (category_id);
CREATE INDEX IF NOT EXISTS idx_sport_sub_category_category_id ON public.sport_sub_category (category_id);
CREATE INDEX IF NOT EXISTS idx_app_sub_category_category_id ON public.app_sub_category (category_id);
CREATE INDEX IF NOT EXISTS idx_cve_sub_category_category_id ON public.cve_sub_category (category_id);
CREATE INDEX IF NOT EXISTS idx_disc_sub_category_category_id ON public.disc_sub_category (category_id);
