-- Add parent_comment_id to Qafi comments
ALTER TABLE IF EXISTS public.qafi_comment
  ADD COLUMN IF NOT EXISTS parent_comment_id INT REFERENCES public.qafi_comment(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_qafi_comment_parent_id ON public.qafi_comment (parent_comment_id);

-- Add parent_comment_id to GEBC comments
ALTER TABLE IF EXISTS public.gebc_comment
  ADD COLUMN IF NOT EXISTS parent_comment_id INT REFERENCES public.gebc_comment(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_gebc_comment_parent_id ON public.gebc_comment (parent_comment_id);

-- Add parent_comment_id to NEWS comments
ALTER TABLE IF EXISTS public.news_comment
  ADD COLUMN IF NOT EXISTS parent_comment_id INT REFERENCES public.news_comment(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_news_comment_parent_id ON public.news_comment (parent_comment_id);

-- Add parent_comment_id to Pic (Tours) comments
ALTER TABLE IF EXISTS public.pic_comment
  ADD COLUMN IF NOT EXISTS parent_comment_id INT REFERENCES public.pic_comment(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_pic_comment_parent_id ON public.pic_comment (parent_comment_id);

-- Add parent_comment_id to Mondon Market (Item) comments
ALTER TABLE IF EXISTS public.mondon_market_comment
  ADD COLUMN IF NOT EXISTS parent_comment_id INT REFERENCES public.mondon_market_comment(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_mondon_market_comment_parent_id ON public.mondon_market_comment (parent_comment_id);

-- Add parent_comment_id to Post Letter comments
ALTER TABLE IF EXISTS public.comment_post_letter
  ADD COLUMN IF NOT EXISTS parent_comment_id INT REFERENCES public.comment_post_letter(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_comment_post_letter_parent_id ON public.comment_post_letter (parent_comment_id);

-- Add parent_comment_id to Kid Vids comments
ALTER TABLE IF EXISTS public.kid_vids_video_comment
  ADD COLUMN IF NOT EXISTS parent_comment_id INT REFERENCES public.kid_vids_video_comment(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_kid_vids_video_comment_parent_id ON public.kid_vids_video_comment (parent_comment_id);

-- Add parent_comment_id to Fan Star comments
ALTER TABLE IF EXISTS public.fan_star_video_comment
  ADD COLUMN IF NOT EXISTS parent_comment_id INT REFERENCES public.fan_star_video_comment(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_fan_star_video_comment_parent_id ON public.fan_star_video_comment (parent_comment_id);

-- Add parent_comment_id to TV Progmax comments
ALTER TABLE IF EXISTS public.tv_progmax_video_comment
  ADD COLUMN IF NOT EXISTS parent_comment_id INT REFERENCES public.tv_progmax_video_comment(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_tv_progmax_video_comment_parent_id ON public.tv_progmax_video_comment (parent_comment_id);

-- Add parent_comment_id to Learning Hobbies comments
ALTER TABLE IF EXISTS public.learning_hobbies_video_comment
  ADD COLUMN IF NOT EXISTS parent_comment_id INT REFERENCES public.learning_hobbies_video_comment(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_learning_hobbies_video_comment_parent_id ON public.learning_hobbies_video_comment (parent_comment_id);

-- Add parent_comment_id to Cinematics comments
ALTER TABLE IF EXISTS public.cinematics_video_comment
  ADD COLUMN IF NOT EXISTS parent_comment_id INT REFERENCES public.cinematics_video_comment(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_cinematics_video_comment_parent_id ON public.cinematics_video_comment (parent_comment_id);

-- Add parent_comment_id to Sport comments
ALTER TABLE IF EXISTS public.sport_comment
  ADD COLUMN IF NOT EXISTS parent_comment_id INT REFERENCES public.sport_comment(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_sport_comment_parent_id ON public.sport_comment (parent_comment_id);
