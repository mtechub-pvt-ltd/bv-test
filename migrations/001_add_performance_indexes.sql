-- Migration: Add Performance Indexes (Section A)
-- Creates indexes on high-frequency search and filter columns across all content tables, follow table, and likes tables.

-- 1. Follow & User Profile Likes
CREATE INDEX IF NOT EXISTS idx_follow_follower_id ON public.follow (follower_id);
CREATE INDEX IF NOT EXISTS idx_follow_following_id ON public.follow (following_id);
CREATE INDEX IF NOT EXISTS idx_user_profile_likes_liked_user ON public.user_profile_likes (liked_user_id);
CREATE INDEX IF NOT EXISTS idx_user_profile_likes_liked_by ON public.user_profile_likes (liked_by_user_id);

-- 2. Notifications
CREATE INDEX IF NOT EXISTS idx_notification_receiver_is_read ON public.notification (receiver_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notification_sender_id ON public.notification (sender_id);

-- 3. Core Content Tables (user_id, category, status & created_at)
CREATE INDEX IF NOT EXISTS idx_xpi_videos_user_id ON public.xpi_videos (user_id);
CREATE INDEX IF NOT EXISTS idx_xpi_videos_video_category ON public.xpi_videos (video_category);
CREATE INDEX IF NOT EXISTS idx_xpi_videos_status_created ON public.xpi_videos (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pic_tours_user_id ON public.pic_tours (user_id);
CREATE INDEX IF NOT EXISTS idx_pic_tours_pic_category ON public.pic_tours (pic_category);
CREATE INDEX IF NOT EXISTS idx_pic_tours_status_created ON public.pic_tours (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_news_user_id ON public.news (user_id);
CREATE INDEX IF NOT EXISTS idx_news_category ON public.news (category);
CREATE INDEX IF NOT EXISTS idx_news_status_created ON public.news (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_qafi_user_id ON public.qafi (user_id);
CREATE INDEX IF NOT EXISTS idx_qafi_category ON public.qafi (category);
CREATE INDEX IF NOT EXISTS idx_qafi_status_created ON public.qafi (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gebc_user_id ON public.gebc (user_id);
CREATE INDEX IF NOT EXISTS idx_gebc_category ON public.gebc (category);
CREATE INDEX IF NOT EXISTS idx_gebc_status_created ON public.gebc (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_post_letters_user_id ON public.post_letters (user_id);
CREATE INDEX IF NOT EXISTS idx_post_letters_disc_category ON public.post_letters (disc_category);
CREATE INDEX IF NOT EXISTS idx_post_letters_status_created ON public.post_letters (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_item_user_id ON public.item (user_id);
CREATE INDEX IF NOT EXISTS idx_item_item_category ON public.item (item_category);
CREATE INDEX IF NOT EXISTS idx_item_status_created ON public.item (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sports_user_id ON public.sports (user_id);
CREATE INDEX IF NOT EXISTS idx_sports_category_id ON public.sports (category_id);
CREATE INDEX IF NOT EXISTS idx_sports_status_created ON public.sports (status, created_at DESC);

-- 4. Secondary Content Tables
CREATE INDEX IF NOT EXISTS idx_cinematics_videos_user_id ON public.cinematics_videos (user_id);
CREATE INDEX IF NOT EXISTS idx_cinematics_videos_category_id ON public.cinematics_videos (category_id);
CREATE INDEX IF NOT EXISTS idx_cinematics_videos_status_created ON public.cinematics_videos (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fan_star_videos_user_id ON public.fan_star_videos (user_id);
CREATE INDEX IF NOT EXISTS idx_fan_star_videos_category_id ON public.fan_star_videos (category_id);
CREATE INDEX IF NOT EXISTS idx_fan_star_videos_status_created ON public.fan_star_videos (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tv_progmax_videos_user_id ON public.tv_progmax_videos (user_id);
CREATE INDEX IF NOT EXISTS idx_tv_progmax_videos_category_id ON public.tv_progmax_videos (category_id);
CREATE INDEX IF NOT EXISTS idx_tv_progmax_videos_status_created ON public.tv_progmax_videos (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_kid_vids_videos_user_id ON public.kid_vids_videos (user_id);
CREATE INDEX IF NOT EXISTS idx_kid_vids_videos_category_id ON public.kid_vids_videos (category_id);
CREATE INDEX IF NOT EXISTS idx_kid_vids_videos_status_created ON public.kid_vids_videos (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_hobbies_videos_user_id ON public.learning_hobbies_videos (user_id);
CREATE INDEX IF NOT EXISTS idx_learning_hobbies_videos_category_id ON public.learning_hobbies_videos (category_id);
CREATE INDEX IF NOT EXISTS idx_learning_hobbies_videos_status_created ON public.learning_hobbies_videos (status, created_at DESC);

-- 5. Like / Interaction Tables
CREATE INDEX IF NOT EXISTS idx_like_video_video_user ON public.like_video (video_id, user_id);
CREATE INDEX IF NOT EXISTS idx_like_pic_pic_user ON public.like_pic (pic_tours_id, user_id);
CREATE INDEX IF NOT EXISTS idx_like_news_news_user ON public.like_news (news_id, user_id);
CREATE INDEX IF NOT EXISTS idx_like_qafi_qafi_user ON public.like_qafi (qafi_id, user_id);
CREATE INDEX IF NOT EXISTS idx_like_gebc_gebc_user ON public.like_gebc (gebc_id, user_id);
CREATE INDEX IF NOT EXISTS idx_sport_like_sport_user ON public.sport_like (sport_id, user_id);

-- 6. Auxiliary & Related Entity Tables
CREATE INDEX IF NOT EXISTS idx_banner_user_id ON public.banner (user_id);
CREATE INDEX IF NOT EXISTS idx_banner_category_lookup ON public.banner (category_table, category_id, status);
CREATE INDEX IF NOT EXISTS idx_item_report_reported_user ON public.item_report (reported_user_id);
CREATE INDEX IF NOT EXISTS idx_item_report_reporter_user ON public.item_report (reporter_user_id);
CREATE INDEX IF NOT EXISTS idx_reported_user_reported_user ON public.reported_user (reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reported_user_reporter ON public.reported_user (reporter_id);
CREATE INDEX IF NOT EXISTS idx_signature_user_id ON public.signature (user_id);
CREATE INDEX IF NOT EXISTS idx_item_images_item_id ON public.item_images (item_id);
CREATE INDEX IF NOT EXISTS idx_post_letters_images_letter_id ON public.post_letters_images (letter_id);
CREATE INDEX IF NOT EXISTS idx_send_offer_item_id ON public.send_offer (item_id);
CREATE INDEX IF NOT EXISTS idx_send_offer_sender_id ON public.send_offer (sender_id);
CREATE INDEX IF NOT EXISTS idx_letter_reciever_info_letter ON public.letter_reciever_info (letter_id);
CREATE INDEX IF NOT EXISTS idx_letter_reciever_info_reciever ON public.letter_reciever_info (reciever_id);
CREATE INDEX IF NOT EXISTS idx_like_post_letter_letter_user ON public.like_post_letter (letter_id, user_id);
CREATE INDEX IF NOT EXISTS idx_comment_post_letter_letter_user ON public.comment_post_letter (letter_id, user_id);
CREATE INDEX IF NOT EXISTS idx_report_post_letter_letter_user ON public.report_post_letter (letter_id, user_id);

