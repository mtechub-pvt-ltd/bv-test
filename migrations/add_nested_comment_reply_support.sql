ALTER TABLE IF EXISTS public.video_comment
  ADD COLUMN IF NOT EXISTS parent_comment_id INT REFERENCES public.video_comment(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_video_comment_parent_comment_id
  ON public.video_comment (parent_comment_id);

CREATE INDEX IF NOT EXISTS idx_video_comment_video_parent
  ON public.video_comment (video_id, parent_comment_id);
