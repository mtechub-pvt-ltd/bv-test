-- Migration: Create Materialized View for Leaderboard Engagement Scores
-- Pre-aggregates engagement metrics across all 13 content modules and follow table.

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_creator_engagement AS
WITH module_scores AS (
  -- xpi_videos
  SELECT c.user_id, COUNT(l.id)::bigint AS likes, 0::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM xpi_videos c LEFT JOIN like_video l ON l.video_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT c.user_id, 0::bigint AS likes, COUNT(cm.id)::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM xpi_videos c LEFT JOIN video_comment cm ON cm.video_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT orig.user_id, 0::bigint AS likes, 0::bigint AS comments, COUNT(share.id)::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM xpi_videos share INNER JOIN xpi_videos orig ON share.shared_post_id = orig.id WHERE orig.user_id IS NOT NULL AND share.shared_post_id IS NOT NULL GROUP BY orig.user_id
  UNION ALL
  SELECT c.user_id, 0::bigint AS likes, 0::bigint AS comments, 0::bigint AS shares, COUNT(v.id)::bigint AS views, 0::bigint AS followers
  FROM xpi_videos c LEFT JOIN viewed_video v ON v.video_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id

  -- pic_tours
  UNION ALL
  SELECT c.user_id, COUNT(l.id)::bigint AS likes, 0::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM pic_tours c LEFT JOIN like_pic l ON l.pic_tours_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT c.user_id, 0::bigint AS likes, COUNT(cm.id)::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM pic_tours c LEFT JOIN pic_comment cm ON cm.pic_tours_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT orig.user_id, 0::bigint AS likes, 0::bigint AS comments, COUNT(share.id)::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM pic_tours share INNER JOIN pic_tours orig ON share.shared_post_id = orig.id WHERE orig.user_id IS NOT NULL AND share.shared_post_id IS NOT NULL GROUP BY orig.user_id
  UNION ALL
  SELECT c.user_id, 0::bigint AS likes, 0::bigint AS comments, 0::bigint AS shares, COUNT(v.id)::bigint AS views, 0::bigint AS followers
  FROM pic_tours c LEFT JOIN viewed_pic v ON v.pic_tours_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id

  -- qafi
  UNION ALL
  SELECT c.user_id, COUNT(l.id)::bigint AS likes, 0::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM qafi c LEFT JOIN like_qafi l ON l.qafi_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT c.user_id, 0::bigint AS likes, COUNT(cm.id)::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM qafi c LEFT JOIN qafi_comment cm ON cm.qafi_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT orig.user_id, 0::bigint AS likes, 0::bigint AS comments, COUNT(share.id)::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM qafi share INNER JOIN qafi orig ON share.shared_post_id = orig.id WHERE orig.user_id IS NOT NULL AND share.shared_post_id IS NOT NULL GROUP BY orig.user_id

  -- gebc
  UNION ALL
  SELECT c.user_id, COUNT(l.id)::bigint AS likes, 0::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM gebc c LEFT JOIN like_gebc l ON l.gebc_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT c.user_id, 0::bigint AS likes, COUNT(cm.id)::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM gebc c LEFT JOIN gebc_comment cm ON cm.gebc_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT orig.user_id, 0::bigint AS likes, 0::bigint AS comments, COUNT(share.id)::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM gebc share INNER JOIN gebc orig ON share.shared_post_id = orig.id WHERE orig.user_id IS NOT NULL AND share.shared_post_id IS NOT NULL GROUP BY orig.user_id

  -- news
  UNION ALL
  SELECT c.user_id, COUNT(l.id)::bigint AS likes, 0::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM news c LEFT JOIN like_news l ON l.news_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT c.user_id, 0::bigint AS likes, COUNT(cm.id)::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM news c LEFT JOIN news_comment cm ON cm.news_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT orig.user_id, 0::bigint AS likes, 0::bigint AS comments, COUNT(share.id)::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM news share INNER JOIN news orig ON share.shared_post_id = orig.id WHERE orig.user_id IS NOT NULL AND share.shared_post_id IS NOT NULL GROUP BY orig.user_id

  -- post_letters
  UNION ALL
  SELECT c.user_id, COUNT(l.id)::bigint AS likes, 0::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM post_letters c LEFT JOIN like_post_letter l ON l.letter_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT c.user_id, 0::bigint AS likes, COUNT(cm.id)::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM post_letters c LEFT JOIN comment_post_letter cm ON cm.letter_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT orig.user_id, 0::bigint AS likes, 0::bigint AS comments, COUNT(share.id)::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM post_letters share INNER JOIN post_letters orig ON share.shared_post_id = orig.id WHERE orig.user_id IS NOT NULL AND share.shared_post_id IS NOT NULL GROUP BY orig.user_id

  -- item
  UNION ALL
  SELECT c.user_id, COUNT(l.id)::bigint AS likes, 0::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM item c LEFT JOIN mondon_market_like l ON l.item_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT c.user_id, 0::bigint AS likes, COUNT(cm.id)::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM item c LEFT JOIN mondon_market_comment cm ON cm.item_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT orig.user_id, 0::bigint AS likes, 0::bigint AS comments, COUNT(share.id)::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM item share INNER JOIN item orig ON share.shared_post_id = orig.id WHERE orig.user_id IS NOT NULL AND share.shared_post_id IS NOT NULL GROUP BY orig.user_id

  -- sports
  UNION ALL
  SELECT c.user_id, COUNT(l.id)::bigint AS likes, 0::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM sports c LEFT JOIN sport_like l ON l.sport_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT c.user_id, 0::bigint AS likes, COUNT(cm.id)::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM sports c LEFT JOIN sport_comment cm ON cm.sport_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT orig.user_id, 0::bigint AS likes, 0::bigint AS comments, COUNT(share.id)::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM sports share INNER JOIN sports orig ON share.shared_post_id = orig.id WHERE orig.user_id IS NOT NULL AND share.shared_post_id IS NOT NULL GROUP BY orig.user_id

  -- cinematics_videos
  UNION ALL
  SELECT c.user_id, COUNT(l.id)::bigint AS likes, 0::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM cinematics_videos c LEFT JOIN cinematics_video_like l ON l.video_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT c.user_id, 0::bigint AS likes, COUNT(cm.id)::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM cinematics_videos c LEFT JOIN cinematics_video_comment cm ON cm.video_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT orig.user_id, 0::bigint AS likes, 0::bigint AS comments, COUNT(share.id)::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM cinematics_videos share INNER JOIN cinematics_videos orig ON share.shared_post_id = orig.id WHERE orig.user_id IS NOT NULL AND share.shared_post_id IS NOT NULL GROUP BY orig.user_id
  UNION ALL
  SELECT c.user_id, 0::bigint AS likes, 0::bigint AS comments, 0::bigint AS shares, COUNT(v.id)::bigint AS views, 0::bigint AS followers
  FROM cinematics_videos c LEFT JOIN cinematics_video_viewed v ON v.video_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id

  -- fan_star_videos
  UNION ALL
  SELECT c.user_id, COUNT(l.id)::bigint AS likes, 0::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM fan_star_videos c LEFT JOIN fan_star_video_like l ON l.video_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT c.user_id, 0::bigint AS likes, COUNT(cm.id)::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM fan_star_videos c LEFT JOIN fan_star_video_comment cm ON cm.video_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT orig.user_id, 0::bigint AS likes, 0::bigint AS comments, COUNT(share.id)::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM fan_star_videos share INNER JOIN fan_star_videos orig ON share.shared_post_id = orig.id WHERE orig.user_id IS NOT NULL AND share.shared_post_id IS NOT NULL GROUP BY orig.user_id
  UNION ALL
  SELECT c.user_id, 0::bigint AS likes, 0::bigint AS comments, 0::bigint AS shares, COUNT(v.id)::bigint AS views, 0::bigint AS followers
  FROM fan_star_videos c LEFT JOIN fan_star_video_viewed v ON v.video_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id

  -- tv_progmax_videos
  UNION ALL
  SELECT c.user_id, COUNT(l.id)::bigint AS likes, 0::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM tv_progmax_videos c LEFT JOIN tv_progmax_video_like l ON l.video_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT c.user_id, 0::bigint AS likes, COUNT(cm.id)::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM tv_progmax_videos c LEFT JOIN tv_progmax_video_comment cm ON cm.video_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT orig.user_id, 0::bigint AS likes, 0::bigint AS comments, COUNT(share.id)::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM tv_progmax_videos share INNER JOIN tv_progmax_videos orig ON share.shared_post_id = orig.id WHERE orig.user_id IS NOT NULL AND share.shared_post_id IS NOT NULL GROUP BY orig.user_id
  UNION ALL
  SELECT c.user_id, 0::bigint AS likes, 0::bigint AS comments, 0::bigint AS shares, COUNT(v.id)::bigint AS views, 0::bigint AS followers
  FROM tv_progmax_videos c LEFT JOIN tv_progmax_video_viewed v ON v.video_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id

  -- kid_vids_videos
  UNION ALL
  SELECT c.user_id, COUNT(l.id)::bigint AS likes, 0::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM kid_vids_videos c LEFT JOIN kid_vids_video_like l ON l.video_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT c.user_id, 0::bigint AS likes, COUNT(cm.id)::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM kid_vids_videos c LEFT JOIN kid_vids_video_comment cm ON cm.video_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT orig.user_id, 0::bigint AS likes, 0::bigint AS comments, COUNT(share.id)::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM kid_vids_videos share INNER JOIN kid_vids_videos orig ON share.shared_post_id = orig.id WHERE orig.user_id IS NOT NULL AND share.shared_post_id IS NOT NULL GROUP BY orig.user_id
  UNION ALL
  SELECT c.user_id, 0::bigint AS likes, 0::bigint AS comments, 0::bigint AS shares, COUNT(v.id)::bigint AS views, 0::bigint AS followers
  FROM kid_vids_videos c LEFT JOIN kid_vids_video_viewed v ON v.video_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id

  -- learning_hobbies_videos
  UNION ALL
  SELECT c.user_id, COUNT(l.id)::bigint AS likes, 0::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM learning_hobbies_videos c LEFT JOIN learning_hobbies_video_like l ON l.video_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT c.user_id, 0::bigint AS likes, COUNT(cm.id)::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM learning_hobbies_videos c LEFT JOIN learning_hobbies_video_comment cm ON cm.video_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT orig.user_id, 0::bigint AS likes, 0::bigint AS comments, COUNT(share.id)::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM learning_hobbies_videos share INNER JOIN learning_hobbies_videos orig ON share.shared_post_id = orig.id WHERE orig.user_id IS NOT NULL AND share.shared_post_id IS NOT NULL GROUP BY orig.user_id
  UNION ALL
  SELECT c.user_id, 0::bigint AS likes, 0::bigint AS comments, 0::bigint AS shares, COUNT(v.id)::bigint AS views, 0::bigint AS followers
  FROM learning_hobbies_videos c LEFT JOIN learning_hobbies_video_viewed v ON v.video_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id

  -- followers
  UNION ALL
  SELECT f.following_id AS user_id, 0::bigint AS likes, 0::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, COUNT(f.id)::bigint AS followers
  FROM follow f WHERE f.following_id IS NOT NULL GROUP BY f.following_id
)
SELECT
  user_id,
  COALESCE(SUM(likes), 0)::int AS post_likes,
  COALESCE(SUM(comments), 0)::int AS post_comments,
  COALESCE(SUM(shares), 0)::int AS post_shares,
  COALESCE(SUM(views), 0)::int AS post_views,
  COALESCE(SUM(followers), 0)::int AS followers,
  (COALESCE(SUM(likes), 0) + COALESCE(SUM(comments), 0) + COALESCE(SUM(shares), 0) + COALESCE(SUM(views), 0) + COALESCE(SUM(followers), 0))::int AS engagement_score
FROM module_scores
GROUP BY user_id;

-- Create unique index on user_id to enable CONCURRENTLY refreshes
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_creator_engagement_user_id ON public.mv_creator_engagement (user_id);
