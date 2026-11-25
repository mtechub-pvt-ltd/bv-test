CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    code VARCHAR(255),
    image VARCHAR(255),
    verified BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_date TIMESTAMPTZ,
    is_subscribed BOOLEAN DEFAULT FALSE,
    badge VARCHAR(255),
    subscription_amount BIGINT,
    block BOOLEAN DEFAULT FALSE,
    device_id TEXT,
    customer_id VARCHAR(255),
    fcm_token TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Ensure existing installations have nullable device_id and fcm_token
ALTER TABLE IF EXISTS public.users ALTER COLUMN device_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS fcm_token TEXT;
-- Badge 2FA & login alerts
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS two_fa_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS login_alerts_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS two_fa_code VARCHAR(10);
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS two_fa_code_expires_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS public.app_category (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    french_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.app_sub_category (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES app_category(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    french_name VARCHAR(255),
    "index" INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.item_category (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    french_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.item_sub_category (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES item_category(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    french_name VARCHAR(255),
    "index" INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.disc_category (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    french_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.disc_sub_category (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    french_name VARCHAR(255),
    category_id INT REFERENCES disc_category(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.blogs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    image VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.video_category (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    french_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.video_sub_category (
  id SERIAL PRIMARY KEY,
  category_id INT REFERENCES video_category(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
    french_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.xpi_videos (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    video_category INT REFERENCES video_category(id) ON DELETE CASCADE NOT NULL,
    sub_category INT REFERENCES video_sub_category(id) ON DELETE CASCADE NOT NULL,
    video TEXT NOT NULL,
    thumbnail TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    shared_post_id INT REFERENCES xpi_videos(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.video_comment (
    id SERIAL PRIMARY KEY,
    video_id INT REFERENCES xpi_videos(id) ON DELETE CASCADE,
    parent_comment_id INT REFERENCES public.video_comment(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_comment_parent_comment_id
    ON public.video_comment (parent_comment_id);


CREATE INDEX IF NOT EXISTS idx_video_comment_video_parent
    ON public.video_comment (video_id, parent_comment_id);
CREATE TABLE IF NOT EXISTS public.like_video (
    id SERIAL PRIMARY KEY,
    video_id INT REFERENCES xpi_videos(id) ON DELETE CASCADE NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.viewed_video (
    id SERIAL PRIMARY KEY,
    video_id INT REFERENCES xpi_videos(id) ON DELETE CASCADE NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.pic_category (
id SERIAL PRIMARY KEY,
name VARCHAR(255) NOT NULL,
french_name VARCHAR(255),
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.pic_sub_category (
id SERIAL PRIMARY KEY,
category_id INT REFERENCES pic_category(id) ON DELETE CASCADE NOT NULL,
name VARCHAR(255) NOT NULL,
french_name VARCHAR(255),
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.pic_tours (
id SERIAL PRIMARY KEY,
user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
name VARCHAR(255) NOT NULL,
description TEXT NOT NULL,
pic_category INT REFERENCES pic_category(id) ON DELETE CASCADE NOT NULL,
sub_category INT REFERENCES pic_sub_category(id) ON DELETE CASCADE NOT NULL,
    image VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    shared_post_id INT REFERENCES pic_tours(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.pic_comment (
id SERIAL PRIMARY KEY,
pic_tours_id INT REFERENCES pic_tours(id) ON DELETE CASCADE NOT NULL,
user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
parent_comment_id INT REFERENCES public.pic_comment(id) ON DELETE CASCADE,
comment TEXT NOT NULL,
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.like_pic (
id SERIAL PRIMARY KEY,
pic_tours_id INT REFERENCES pic_tours(id) ON DELETE CASCADE NOT NULL,
user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.viewed_pic (
id SERIAL PRIMARY KEY,
pic_tours_id INT REFERENCES pic_tours(id) ON DELETE CASCADE NOT NULL,
user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.QAFI_category (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    french_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.QAFI_sub_category (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES QAFI_category(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    french_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.QAFI (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    -- name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category INT REFERENCES QAFI_category(id) ON DELETE CASCADE NOT NULL,
    sub_category INT REFERENCES QAFI_sub_category(id) ON DELETE CASCADE NOT NULL,
    image VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    shared_post_id INT REFERENCES QAFI(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.qafi_comment (
    id SERIAL PRIMARY KEY,
    QAFI_id INT REFERENCES QAFI(id) ON DELETE CASCADE NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    parent_comment_id INT REFERENCES public.qafi_comment(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.like_qafi (
    id SERIAL PRIMARY KEY,
    QAFI_id INT REFERENCES QAFI(id) ON DELETE CASCADE NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- GEBC tables.......................................................
-- GEBC tables.......................................................
CREATE TABLE IF NOT EXISTS public.GEBC_category (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    french_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.GEBC_sub_category (
id SERIAL PRIMARY KEY,
category_id INT REFERENCES GEBC_category(id) ON DELETE CASCADE NOT NULL,
name VARCHAR(255) NOT NULL,
french_name VARCHAR(255),
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.GEBC (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    -- name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category INT REFERENCES GEBC_category(id) ON DELETE CASCADE NOT NULL,
    sub_category INT REFERENCES GEBC_sub_category(id) ON DELETE CASCADE NOT NULL,
    image VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    shared_post_id INT REFERENCES GEBC(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.GEBC_comment (
    id SERIAL PRIMARY KEY,
    GEBC_id INT REFERENCES GEBC(id) ON DELETE CASCADE NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    parent_comment_id INT REFERENCES public.GEBC_comment(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.like_GEBC (
    id SERIAL PRIMARY KEY,
    GEBC_id INT REFERENCES GEBC(id) ON DELETE CASCADE NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- News tables.......................................................
-- News tables.......................................................
CREATE TABLE IF NOT EXISTS public.NEWS_category (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    french_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.NEWS_sub_category (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES NEWS_category(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    french_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.NEWS (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    -- name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category INT REFERENCES NEWS_category(id) ON DELETE CASCADE NOT NULL,
    sub_category INT REFERENCES NEWS_sub_category(id) ON DELETE CASCADE NOT NULL,
    image VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    shared_post_id INT REFERENCES NEWS(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.NEWS_comment (
    id SERIAL PRIMARY KEY,
    NEWS_id INT REFERENCES NEWS(id) ON DELETE CASCADE NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    parent_comment_id INT REFERENCES public.NEWS_comment(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.like_NEWS (
    id SERIAL PRIMARY KEY,
    NEWS_id INT REFERENCES NEWS(id) ON DELETE CASCADE NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.signature (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    image VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.post_letters (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    post_type VARCHAR(10) NOT NULL CHECK (post_type IN ('public', 'private')),
    receiver_type VARCHAR(20) NOT NULL,
    disc_category INT REFERENCES disc_category(id) ON DELETE CASCADE NOT NULL,
    disc_sub_category INT REFERENCES disc_sub_category(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL NOT NULL,
    email VARCHAR(100) NOT NULL,
    contact_no VARCHAR(20) NOT NULL,
    subject_place VARCHAR(100) NOT NULL,
    post_date DATE NOT NULL,
    greetings TEXT NOT NULL,
    introduction TEXT NOT NULL,
    body TEXT NOT NULL,
    -- description TEXT NOT NULL,
    form_of_appeal TEXT NOT NULL,
    video VARCHAR(255),
    signature_id INT REFERENCES signature(id) ON DELETE CASCADE NOT NULL,
    paid_status BOOLEAN NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() CONSTRAINT check_paid_status CHECK (paid_status = (post_type = 'private')),
    CONSTRAINT check_receiver_type CHECK (
        (
            post_type = 'public'
            AND receiver_type IN (
                'general',
                'celebrities',
                'authorities',
                'leader'
            )
        )
        OR (
            post_type = 'private'
            AND receiver_type IN (
                'peers',
                'friends',
                'followers',
                'celebrities',
                'authorities',
                'leader'
            )
        )
    )
);
CREATE TABLE IF NOT EXISTS public.post_letters_images (
    id SERIAL PRIMARY KEY,
    letter_id INT REFERENCES post_letters(id) ON DELETE CASCADE NOT NULL,
    image VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.letter_reciever_info (
    id SERIAL PRIMARY KEY,
    letter_id INT REFERENCES post_letters(id) ON DELETE CASCADE NOT NULL,
    reciever_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    address TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.item (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    item_category INT REFERENCES item_category(id) ON DELETE CASCADE NOT NULL,
    sub_category INT REFERENCES item_sub_category(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    price BIGINT NOT NULL,
    condition VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    city VARCHAR(255),
    state VARCHAR(255),
    region VARCHAR(255),
    country_code VARCHAR(2),
    country VARCHAR(255),
    paid_status BOOLEAN NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    shared_post_id INT REFERENCES item(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_condition_type CHECK (
        condition IN ('new', 'used_Like_new', 'used_Good', 'used_Fair')
    )
);
CREATE TABLE IF NOT EXISTS public.item_images (
    id SERIAL PRIMARY KEY,
    item_id INT REFERENCES item(id) ON DELETE CASCADE NOT NULL,
    image VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.send_offer (
    id SERIAL PRIMARY KEY,
    item_id INT REFERENCES item(id) ON DELETE CASCADE NOT NULL,
    sender_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    price BIGINT NOT NULL,
    status VARCHAR(255) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.save_item (
    id SERIAL PRIMARY KEY,
    item_id INT REFERENCES item(id) ON DELETE CASCADE NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Generalized saved items table to support multiple modules (video, item, etc.)
CREATE TABLE IF NOT EXISTS public.save_item_general (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    module VARCHAR(128) NOT NULL,
    module_item_id VARCHAR(255) NOT NULL,
    main_category_id INT,
    sub_category_id INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uniq_saved_module_item UNIQUE(user_id, module, module_item_id)
);
CREATE TABLE IF NOT EXISTS public.banner_configuration (
    id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    length BIGINT NOT NULL,
    width BIGINT NOT NULL,
    cost BIGINT NOT NULL,
    top_banner_cost BIGINT NOT NULL DEFAULT 0,
    top_tier_daily_rate NUMERIC(10, 2) DEFAULT 5.00,
    middle_tier_daily_rate NUMERIC(10, 2) DEFAULT 2.50,
    lower_tier_daily_rate NUMERIC(10, 2) DEFAULT 1.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.banner (
    id SERIAL PRIMARY KEY,
    image VARCHAR(255) NOT NULL,
    french_image VARCHAR(1000),
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    banner_link TEXT,
    category_table VARCHAR(100) NOT NULL,
    category_id INT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    startDate Date NOT NULL,
    endDate Date NOT NULL,
    status VARCHAR(255) DEFAULT 'inactive' NOT NULL,
    top_banner BOOLEAN NOT NULL DEFAULT FALSE,
    paid_status BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_status_type CHECK (status IN ('active', 'inactive')),
    --  CONSTRAINT check_valid_banner_link CHECK (banner_link ~* '^www.[a-zA-Z0-9.-]+.[a-zA-Z]{2,4}.*$'),
    CONSTRAINT check_valid_banner_link CHECK (
        banner_link IS NULL OR banner_link::text ~* 'https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,255}\.[a-z]{2,9}\y([-a-zA-Z0-9@:%_\+.~#?&//=]*)$'::text
    ),
    CONSTRAINT check_valid_paid_status CHECK (paid_status IN (true, false))
);
CREATE TABLE IF NOT EXISTS public.rate_app (
    id SERIAL PRIMARY KEY,
    link TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_valid_link CHECK (
        link ~* 'https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,255}\.[a-z]{2,9}\y([-a-zA-Z0-9@:%_\+.~#?&//=]*)$'
    )
);
CREATE TABLE IF NOT EXISTS public.share_app (
    id SERIAL PRIMARY KEY,
    link TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_valid_link_updated CHECK (
        link ~* 'https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,255}\.[a-z]{2,9}\y([-a-zA-Z0-9@:%_\+.~#?&//=]*)$'
    )
);
CREATE TABLE IF NOT EXISTS public.contact_us (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email_address VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(255) DEFAULT 'unread' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_valid_status CHECK (status IN ('read', 'unread')) --    CONSTRAINT check_valid_email_format CHECK (email_address ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$')
);
CREATE TABLE IF NOT EXISTS public.mass_app (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    app_category_id INT REFERENCES app_category(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(255) NOT NULL,
    type VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_valid_status CHECK (
        type IN (
            'favourites',
            'new_added',
            'phone_based',
            'unused_app',
            'top'
        )
    )
);
CREATE TABLE IF NOT EXISTS public.payment (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    payment_detail jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW() 
);

-- Stripe payments audit table used by paymentsController
CREATE TABLE IF NOT EXISTS public.stripe_payments (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    banner_id INT REFERENCES banner(id) ON DELETE SET NULL,
    stripe_session_id TEXT,
    provider_transaction_id TEXT UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    amount_cents BIGINT,
    amount_decimal DECIMAL(12, 2),
    currency VARCHAR(10),
    price_id TEXT,
    product_id TEXT,
    payment_method TEXT,
    customer_id TEXT,
    receipt_url TEXT,
    raw_response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription records linked to stripe_payments
CREATE TABLE IF NOT EXISTS public.subscription (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    plan_id VARCHAR(255),
    price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    transaction_id INT REFERENCES stripe_payments(id) ON DELETE SET NULL,
    expired_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.notification_type (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.notification (
    id SERIAL PRIMARY KEY,
    sender_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    receiver_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    type INT REFERENCES notification_type(id) ON DELETE CASCADE NOT NULL,
    moduletype VARCHAR(255),
    item_id INT,
    is_all_user BOOLEAN DEFAULT FALSE,
    action VARCHAR(50),
    reference_table VARCHAR(255),
    reference_id INT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- **************** cinematics *******************
CREATE TABLE IF NOT EXISTS public.cinematics_category (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    french_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.cinematics_sub_category (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES cinematics_category(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    french_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.cinematics_videos (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category_id INT REFERENCES cinematics_category(id) ON DELETE CASCADE NOT NULL,
    sub_category_id INT REFERENCES cinematics_sub_category(id) ON DELETE CASCADE NOT NULL,
    video TEXT NOT NULL,
    thumbnail TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    shared_post_id INT REFERENCES cinematics_videos(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.cinematics_video_comment (
    id SERIAL PRIMARY KEY,
    video_id INT REFERENCES cinematics_videos(id) ON DELETE CASCADE NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    parent_comment_id INT REFERENCES public.cinematics_video_comment(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.cinematics_video_like (
    id SERIAL PRIMARY KEY,
    video_id INT REFERENCES cinematics_videos(id) ON DELETE CASCADE NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.cinematics_video_viewed (
    id SERIAL PRIMARY KEY,
    video_id INT REFERENCES cinematics_videos(id) ON DELETE CASCADE NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- **************** cinematics *******************
-- **************** fan star *******************
CREATE TABLE IF NOT EXISTS public.fan_star_category (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    french_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.fan_star_sub_category (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES fan_star_category(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    french_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.fan_star_videos (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category_id INT REFERENCES fan_star_category(id) ON DELETE CASCADE NOT NULL,
    sub_category_id INT REFERENCES fan_star_sub_category(id) ON DELETE CASCADE NOT NULL,
    image TEXT DEFAULT '',
    type VARCHAR(20) DEFAULT 'video',
    thumbnail TEXT,
    status VARCHAR(50) DEFAULT 'active',
    shared_post_id INT REFERENCES fan_star_videos(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.fan_star_video_comment (
    id SERIAL PRIMARY KEY,
    video_id INT REFERENCES fan_star_videos(id) ON DELETE CASCADE NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    parent_comment_id INT REFERENCES public.fan_star_video_comment(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.fan_star_video_like (
    id SERIAL PRIMARY KEY,
    video_id INT REFERENCES fan_star_videos(id) ON DELETE CASCADE NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.fan_star_video_viewed (
    id SERIAL PRIMARY KEY,
    video_id INT REFERENCES fan_star_videos(id) ON DELETE CASCADE NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- **************** fan star *******************
-- **************** tv progmax *******************
CREATE TABLE IF NOT EXISTS public.tv_progmax_category (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    french_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.tv_progmax_sub_category (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES tv_progmax_category(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    french_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.tv_progmax_videos (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category_id INT REFERENCES tv_progmax_category(id) ON DELETE CASCADE NOT NULL,
    sub_category_id INT REFERENCES tv_progmax_sub_category(id) ON DELETE CASCADE NOT NULL,
    video TEXT NOT NULL,
    thumbnail TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    shared_post_id INT REFERENCES tv_progmax_videos(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.tv_progmax_video_comment (
    id SERIAL PRIMARY KEY,
    video_id INT REFERENCES tv_progmax_videos(id) ON DELETE CASCADE NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    parent_comment_id INT REFERENCES public.tv_progmax_video_comment(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.tv_progmax_video_like (
    id SERIAL PRIMARY KEY,
    video_id INT REFERENCES tv_progmax_videos(id) ON DELETE CASCADE NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.tv_progmax_video_viewed (
    id SERIAL PRIMARY KEY,
    video_id INT REFERENCES tv_progmax_videos(id) ON DELETE CASCADE NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- **************** tv progmax *******************
-- **************** kid vids *******************
CREATE TABLE IF NOT EXISTS public.kid_vids_category (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    french_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.kid_vids_sub_category (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES kid_vids_category(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    french_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.kid_vids_videos (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category_id INT REFERENCES kid_vids_category(id) ON DELETE CASCADE NOT NULL,
    sub_category_id INT REFERENCES kid_vids_sub_category(id) ON DELETE CASCADE NOT NULL,
    video TEXT NOT NULL,
    thumbnail TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    shared_post_id INT REFERENCES kid_vids_videos(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.kid_vids_video_comment (
    id SERIAL PRIMARY KEY,
    video_id INT REFERENCES kid_vids_videos(id) ON DELETE CASCADE NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    parent_comment_id INT REFERENCES public.kid_vids_video_comment(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.kid_vids_video_like (
    id SERIAL PRIMARY KEY,
    video_id INT REFERENCES kid_vids_videos(id) ON DELETE CASCADE NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.kid_vids_video_viewed (
    id SERIAL PRIMARY KEY,
    video_id INT REFERENCES kid_vids_videos(id) ON DELETE CASCADE NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- **************** kid vids *******************
-- **************** learning and hobbies *******************
CREATE TABLE IF NOT EXISTS public.learning_hobbies_category (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    french_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.learning_hobbies_sub_category (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES learning_hobbies_category(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    french_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.learning_hobbies_videos (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category_id INT REFERENCES learning_hobbies_category(id) ON DELETE CASCADE NOT NULL,
    sub_category_id INT REFERENCES learning_hobbies_sub_category(id) ON DELETE CASCADE NOT NULL,
    video TEXT NOT NULL,
    thumbnail TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    shared_post_id INT REFERENCES learning_hobbies_videos(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.learning_hobbies_video_comment (
    id SERIAL PRIMARY KEY,
    video_id INT REFERENCES learning_hobbies_videos(id) ON DELETE CASCADE NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    parent_comment_id INT REFERENCES public.learning_hobbies_video_comment(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.learning_hobbies_video_like (
    id SERIAL PRIMARY KEY,
    video_id INT REFERENCES learning_hobbies_videos(id) ON DELETE CASCADE NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.learning_hobbies_video_viewed (
    id SERIAL PRIMARY KEY,
    video_id INT REFERENCES learning_hobbies_videos(id) ON DELETE CASCADE NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- **************** kid vids *******************
-- ********** saving cards | transactions ************
CREATE TABLE IF NOT EXISTS cards(
    id SERIAL PRIMARY KEY,
    customer_id TEXT,
    card_id TEXT,
    exp_month TEXT,
    exp_year TEXT,
    last_digit TEXT,
    finger_print TEXT,
    brand_name TEXT,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS transactions(
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    banner_id INT REFERENCES banner(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    credit BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
-- **************** sports *******************
CREATE TABLE IF NOT EXISTS public.sports_category (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    french_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.sport_sub_category (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES sports_category(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    french_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.sports (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category_id INT REFERENCES sports_category(id) ON DELETE CASCADE NOT NULL,
    sub_category_id INT REFERENCES sport_sub_category(id) ON DELETE CASCADE NOT NULL,
    image TEXT NOT NULL,
    video TEXT DEFAULT '',
    type VARCHAR(20) DEFAULT 'image',
    status VARCHAR(50) DEFAULT 'active',
    shared_post_id INT REFERENCES sports(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.sport_comment (
    id SERIAL PRIMARY KEY,
    sport_id INT REFERENCES sports(id) ON DELETE CASCADE NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    parent_comment_id INT REFERENCES public.sport_comment(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Note: comments for marketplace items are stored in `mondon_market_comment`.
-- Link comments to the existing `item` table (item.id) to reuse items.
CREATE TABLE IF NOT EXISTS public.mondon_market_comment (
    id SERIAL PRIMARY KEY,
    item_id INT REFERENCES item(id) ON DELETE CASCADE NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    parent_comment_id INT REFERENCES public.mondon_market_comment(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.mondon_market_like (
    id SERIAL PRIMARY KEY,
    item_id INT REFERENCES item(id) ON DELETE CASCADE NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT mondon_market_like_item_user_unique UNIQUE (item_id, user_id)
);
CREATE TABLE IF NOT EXISTS public.sport_like (
    id SERIAL PRIMARY KEY,
    sport_id INT REFERENCES sports(id) ON DELETE CASCADE NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
); 

CREATE TABLE IF NOT EXISTS public.alerts(
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    category_id INT REFERENCES item_category(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table to store site pages like Terms & Conditions and Privacy Policy
CREATE TABLE IF NOT EXISTS public.app_pages (
    id SERIAL PRIMARY KEY,
    page_key VARCHAR(100) UNIQUE NOT NULL, -- use values like 'terms' or 'policy'
    content TEXT NOT NULL, -- HTML/text content
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dedicated table for Terms & Conditions
CREATE TABLE IF NOT EXISTS public.terms_conditions (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dedicated table for Privacy Policy
CREATE TABLE IF NOT EXISTS public.privacy_policy (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Item Report (user reports content/items to admin) ─────────────────────
CREATE TABLE IF NOT EXISTS public.item_report (
    id                 SERIAL PRIMARY KEY,
    module_type        VARCHAR(100) NOT NULL,
    item_id            INT NOT NULL,
    status             VARCHAR(50) NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'blocked', 'rejected')),
    reason             TEXT NOT NULL,
    reporter_user_id   INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    reported_user_id   INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Reported User (user reports another user to admin) ───────────────────
CREATE TABLE IF NOT EXISTS public.reported_user (
    id                 SERIAL PRIMARY KEY,
    reporter_id        INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    reported_user_id   INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    reason             TEXT NOT NULL,
    status             VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ─── General Report (polymorphic reports: comment, story, etc.) ──────────────
CREATE TABLE IF NOT EXISTS public.general_report (
    id                 SERIAL PRIMARY KEY,
    type               VARCHAR(50) NOT NULL DEFAULT 'comment',
    module_type        VARCHAR(100) NOT NULL,
    target_id          INT NOT NULL,
    reporter_user_id   INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    reported_user_id   INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    reason             TEXT NOT NULL,
    details            TEXT,
    status             VARCHAR(50) NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW()
);


-- Follow table to track user follows
CREATE TABLE IF NOT EXISTS public.follow (
    id SERIAL PRIMARY KEY,
    follower_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    following_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_follow UNIQUE (follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS public.user_profile_likes (
    id SERIAL PRIMARY KEY,
    liked_user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    liked_by_user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_profile_like UNIQUE (liked_user_id, liked_by_user_id)
);

-- ─── Migration: Add shared_post_id to existing tables ─────────────────────
DO $$
BEGIN
    -- xpi_videos
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='xpi_videos' AND column_name='shared_post_id') THEN
        ALTER TABLE public.xpi_videos ADD COLUMN shared_post_id INT REFERENCES public.xpi_videos(id) ON DELETE SET NULL;
    END IF;

    -- NEWS
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='news' AND column_name='shared_post_id') THEN
        ALTER TABLE public.NEWS ADD COLUMN shared_post_id INT REFERENCES public.NEWS(id) ON DELETE SET NULL;
    END IF;

    -- QAFI
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='qafi' AND column_name='shared_post_id') THEN
        ALTER TABLE public.QAFI ADD COLUMN shared_post_id INT REFERENCES public.QAFI(id) ON DELETE SET NULL;
    END IF;

    -- GEBC
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gebc' AND column_name='shared_post_id') THEN
        ALTER TABLE public.GEBC ADD COLUMN shared_post_id INT REFERENCES public.GEBC(id) ON DELETE SET NULL;
    END IF;

    -- pic_tours
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pic_tours' AND column_name='shared_post_id') THEN
        ALTER TABLE public.pic_tours ADD COLUMN shared_post_id INT REFERENCES public.pic_tours(id) ON DELETE SET NULL;
    END IF;

    -- cinematics_videos
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cinematics_videos' AND column_name='shared_post_id') THEN
        ALTER TABLE public.cinematics_videos ADD COLUMN shared_post_id INT REFERENCES public.cinematics_videos(id) ON DELETE SET NULL;
    END IF;

    -- fan_star_videos
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fan_star_videos' AND column_name='shared_post_id') THEN
        ALTER TABLE public.fan_star_videos ADD COLUMN shared_post_id INT REFERENCES public.fan_star_videos(id) ON DELETE SET NULL;
    END IF;

    -- tv_progmax_videos
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tv_progmax_videos' AND column_name='shared_post_id') THEN
        ALTER TABLE public.tv_progmax_videos ADD COLUMN shared_post_id INT REFERENCES public.tv_progmax_videos(id) ON DELETE SET NULL;
    END IF;

    -- kid_vids_videos
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kid_vids_videos' AND column_name='shared_post_id') THEN
        ALTER TABLE public.kid_vids_videos ADD COLUMN shared_post_id INT REFERENCES public.kid_vids_videos(id) ON DELETE SET NULL;
    END IF;

    -- learning_hobbies_videos
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='learning_hobbies_videos' AND column_name='shared_post_id') THEN
        ALTER TABLE public.learning_hobbies_videos ADD COLUMN shared_post_id INT REFERENCES public.learning_hobbies_videos(id) ON DELETE SET NULL;
    END IF;

    -- sports
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sports' AND column_name='shared_post_id') THEN
        ALTER TABLE public.sports ADD COLUMN shared_post_id INT REFERENCES public.sports(id) ON DELETE SET NULL;
    END IF;

    -- media: URL in image, discriminated by type (image | video)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='news' AND column_name='type') THEN
        ALTER TABLE public.news ADD COLUMN type VARCHAR(20) DEFAULT 'image';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sports' AND column_name='type') THEN
        ALTER TABLE public.sports ADD COLUMN type VARCHAR(20) DEFAULT 'image';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sports' AND column_name='video') THEN
        ALTER TABLE public.sports ADD COLUMN video TEXT DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='qafi' AND column_name='type') THEN
        ALTER TABLE public.qafi ADD COLUMN type VARCHAR(20) DEFAULT 'image';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fan_star_videos' AND column_name='image') THEN
        ALTER TABLE public.fan_star_videos ADD COLUMN image TEXT DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fan_star_videos' AND column_name='type') THEN
        ALTER TABLE public.fan_star_videos ADD COLUMN type VARCHAR(20) DEFAULT 'video';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fan_star_videos' AND column_name='video') THEN
        ALTER TABLE public.fan_star_videos ADD COLUMN video TEXT DEFAULT '';
    END IF;

    -- on-news / qafi / sports: video thumbnail poster
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='news' AND column_name='video') THEN
        ALTER TABLE public.news ADD COLUMN video TEXT DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='news' AND column_name='thumbnail') THEN
        ALTER TABLE public.news ADD COLUMN thumbnail TEXT DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='qafi' AND column_name='video') THEN
        ALTER TABLE public.qafi ADD COLUMN video TEXT DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='qafi' AND column_name='thumbnail') THEN
        ALTER TABLE public.qafi ADD COLUMN thumbnail TEXT DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sports' AND column_name='thumbnail') THEN
        ALTER TABLE public.sports ADD COLUMN thumbnail TEXT DEFAULT '';
    END IF;

    -- item
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='item' AND column_name='shared_post_id') THEN
        ALTER TABLE public.item ADD COLUMN shared_post_id INT REFERENCES public.item(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='item' AND column_name='city') THEN
        ALTER TABLE public.item ADD COLUMN city VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='item' AND column_name='state') THEN
        ALTER TABLE public.item ADD COLUMN state VARCHAR(255);
    END IF;
    ALTER TABLE public.item ALTER COLUMN location DROP NOT NULL;
    ALTER TABLE public.item ALTER COLUMN region DROP NOT NULL;

    -- QAFI
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='qafi' AND column_name='name') THEN
        ALTER TABLE public.QAFI ADD COLUMN name VARCHAR(255);
    END IF;

    -- GEBC
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gebc' AND column_name='name') THEN
        ALTER TABLE public.GEBC ADD COLUMN name VARCHAR(255);
    END IF;

    -- NEWS
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='news' AND column_name='name') THEN
        ALTER TABLE public.NEWS ADD COLUMN name VARCHAR(255);
    END IF;

    -- post_letters shared_post_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='post_letters' AND column_name='shared_post_id') THEN
        ALTER TABLE public.post_letters ADD COLUMN shared_post_id INT REFERENCES public.post_letters(id) ON DELETE SET NULL;
    END IF;

    -- users profile/location visibility fields used by APIs
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='city') THEN
        ALTER TABLE public.users ADD COLUMN city VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='country') THEN
        ALTER TABLE public.users ADD COLUMN country VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='province') THEN
        ALTER TABLE public.users ADD COLUMN province VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='profession') THEN
        ALTER TABLE public.users ADD COLUMN profession VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='state') THEN
        ALTER TABLE public.users ADD COLUMN state VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='region') THEN
        ALTER TABLE public.users ADD COLUMN region VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='hide_email') THEN
        ALTER TABLE public.users ADD COLUMN hide_email BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='hide_location') THEN
        ALTER TABLE public.users ADD COLUMN hide_location BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='hide_profession') THEN
        ALTER TABLE public.users ADD COLUMN hide_profession BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bio') THEN
        ALTER TABLE public.users ADD COLUMN bio TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_premium') THEN
        ALTER TABLE public.users ADD COLUMN is_premium BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='banner_subscript_key') THEN
        ALTER TABLE public.users ADD COLUMN banner_subscript_key VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='premium_subscription_key') THEN
        ALTER TABLE public.users ADD COLUMN premium_subscription_key VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='badge_subscription_key') THEN
        ALTER TABLE public.users ADD COLUMN badge_subscription_key VARCHAR(255);
    END IF;
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name='banner' AND column_name='transaction_id'
    ) THEN
        ALTER TABLE public.banner ADD COLUMN transaction_id VARCHAR(255);
    END IF;
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name='banner' AND column_name='french_image'
    ) THEN
        ALTER TABLE public.banner ADD COLUMN french_image VARCHAR(1000);
    END IF;

END $$;

-- Open Letter social tables
CREATE TABLE IF NOT EXISTS public.like_post_letter (
    id SERIAL PRIMARY KEY,
    letter_id INT REFERENCES post_letters(id) ON DELETE CASCADE NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.comment_post_letter (
    id SERIAL PRIMARY KEY,
    letter_id INT REFERENCES post_letters(id) ON DELETE CASCADE NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    parent_comment_id INT REFERENCES public.comment_post_letter(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.report_post_letter (
    id SERIAL PRIMARY KEY,
    letter_id INT REFERENCES post_letters(id) ON DELETE CASCADE NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Section A: Performance Indexes ──────────────────────────────────────────
-- Follow & User Profile Likes
CREATE INDEX IF NOT EXISTS idx_follow_follower_id ON public.follow (follower_id);
CREATE INDEX IF NOT EXISTS idx_follow_following_id ON public.follow (following_id);
CREATE INDEX IF NOT EXISTS idx_user_profile_likes_liked_user ON public.user_profile_likes (liked_user_id);
CREATE INDEX IF NOT EXISTS idx_user_profile_likes_liked_by ON public.user_profile_likes (liked_by_user_id);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notification_receiver_is_read ON public.notification (receiver_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notification_sender_id ON public.notification (sender_id);

-- Core Content Tables (user_id, category, status & created_at)
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

-- Secondary Content Tables
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

-- Like / Interaction Tables
CREATE INDEX IF NOT EXISTS idx_like_video_video_user ON public.like_video (video_id, user_id);
CREATE INDEX IF NOT EXISTS idx_like_pic_pic_user ON public.like_pic (pic_tours_id, user_id);
CREATE INDEX IF NOT EXISTS idx_like_news_news_user ON public.like_news (news_id, user_id);
CREATE INDEX IF NOT EXISTS idx_like_qafi_qafi_user ON public.like_qafi (qafi_id, user_id);
CREATE INDEX IF NOT EXISTS idx_like_gebc_gebc_user ON public.like_gebc (gebc_id, user_id);
CREATE INDEX IF NOT EXISTS idx_sport_like_sport_user ON public.sport_like (sport_id, user_id);

-- Auxiliary & Related Entity Tables
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

-- ─── Section B: Leaderboard Materialized View ───────────────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_creator_engagement AS
WITH module_scores AS (
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

  UNION ALL
  SELECT c.user_id, COUNT(l.id)::bigint AS likes, 0::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM qafi c LEFT JOIN like_qafi l ON l.qafi_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT c.user_id, 0::bigint AS likes, COUNT(cm.id)::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM qafi c LEFT JOIN qafi_comment cm ON cm.qafi_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT orig.user_id, 0::bigint AS likes, 0::bigint AS comments, COUNT(share.id)::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM qafi share INNER JOIN qafi orig ON share.shared_post_id = orig.id WHERE orig.user_id IS NOT NULL AND share.shared_post_id IS NOT NULL GROUP BY orig.user_id

  UNION ALL
  SELECT c.user_id, COUNT(l.id)::bigint AS likes, 0::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM gebc c LEFT JOIN like_gebc l ON l.gebc_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT c.user_id, 0::bigint AS likes, COUNT(cm.id)::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM gebc c LEFT JOIN gebc_comment cm ON cm.gebc_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT orig.user_id, 0::bigint AS likes, 0::bigint AS comments, COUNT(share.id)::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM gebc share INNER JOIN gebc orig ON share.shared_post_id = orig.id WHERE orig.user_id IS NOT NULL AND share.shared_post_id IS NOT NULL GROUP BY orig.user_id

  UNION ALL
  SELECT c.user_id, COUNT(l.id)::bigint AS likes, 0::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM news c LEFT JOIN like_news l ON l.news_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT c.user_id, 0::bigint AS likes, COUNT(cm.id)::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM news c LEFT JOIN news_comment cm ON cm.news_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT orig.user_id, 0::bigint AS likes, 0::bigint AS comments, COUNT(share.id)::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM news share INNER JOIN news orig ON share.shared_post_id = orig.id WHERE orig.user_id IS NOT NULL AND share.shared_post_id IS NOT NULL GROUP BY orig.user_id

  UNION ALL
  SELECT c.user_id, COUNT(l.id)::bigint AS likes, 0::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM post_letters c LEFT JOIN like_post_letter l ON l.letter_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT c.user_id, 0::bigint AS likes, COUNT(cm.id)::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM post_letters c LEFT JOIN comment_post_letter cm ON cm.letter_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT orig.user_id, 0::bigint AS likes, 0::bigint AS comments, COUNT(share.id)::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM post_letters share INNER JOIN post_letters orig ON share.shared_post_id = orig.id WHERE orig.user_id IS NOT NULL AND share.shared_post_id IS NOT NULL GROUP BY orig.user_id

  UNION ALL
  SELECT c.user_id, COUNT(l.id)::bigint AS likes, 0::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM item c LEFT JOIN mondon_market_like l ON l.item_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT c.user_id, 0::bigint AS likes, COUNT(cm.id)::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM item c LEFT JOIN mondon_market_comment cm ON cm.item_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT orig.user_id, 0::bigint AS likes, 0::bigint AS comments, COUNT(share.id)::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM item share INNER JOIN item orig ON share.shared_post_id = orig.id WHERE orig.user_id IS NOT NULL AND share.shared_post_id IS NOT NULL GROUP BY orig.user_id

  UNION ALL
  SELECT c.user_id, COUNT(l.id)::bigint AS likes, 0::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM sports c LEFT JOIN sport_like l ON l.sport_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT c.user_id, 0::bigint AS likes, COUNT(cm.id)::bigint AS comments, 0::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM sports c LEFT JOIN sport_comment cm ON cm.sport_id = c.id WHERE c.user_id IS NOT NULL GROUP BY c.user_id
  UNION ALL
  SELECT orig.user_id, 0::bigint AS likes, 0::bigint AS comments, COUNT(share.id)::bigint AS shares, 0::bigint AS views, 0::bigint AS followers
  FROM sports share INNER JOIN sports orig ON share.shared_post_id = orig.id WHERE orig.user_id IS NOT NULL AND share.shared_post_id IS NOT NULL GROUP BY orig.user_id

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

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_creator_engagement_user_id ON public.mv_creator_engagement (user_id);

-- Ensure parent_comment_id exists on all comment tables
ALTER TABLE IF EXISTS public.video_comment ADD COLUMN IF NOT EXISTS parent_comment_id INT REFERENCES public.video_comment(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.pic_comment ADD COLUMN IF NOT EXISTS parent_comment_id INT REFERENCES public.pic_comment(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.qafi_comment ADD COLUMN IF NOT EXISTS parent_comment_id INT REFERENCES public.qafi_comment(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.gebc_comment ADD COLUMN IF NOT EXISTS parent_comment_id INT REFERENCES public.gebc_comment(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.news_comment ADD COLUMN IF NOT EXISTS parent_comment_id INT REFERENCES public.news_comment(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.cinematics_video_comment ADD COLUMN IF NOT EXISTS parent_comment_id INT REFERENCES public.cinematics_video_comment(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.fan_star_video_comment ADD COLUMN IF NOT EXISTS parent_comment_id INT REFERENCES public.fan_star_video_comment(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.tv_progmax_video_comment ADD COLUMN IF NOT EXISTS parent_comment_id INT REFERENCES public.tv_progmax_video_comment(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.kid_vids_video_comment ADD COLUMN IF NOT EXISTS parent_comment_id INT REFERENCES public.kid_vids_video_comment(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.learning_hobbies_video_comment ADD COLUMN IF NOT EXISTS parent_comment_id INT REFERENCES public.learning_hobbies_video_comment(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.sport_comment ADD COLUMN IF NOT EXISTS parent_comment_id INT REFERENCES public.sport_comment(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.mondon_market_comment ADD COLUMN IF NOT EXISTS parent_comment_id INT REFERENCES public.mondon_market_comment(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.comment_post_letter ADD COLUMN IF NOT EXISTS parent_comment_id INT REFERENCES public.comment_post_letter(id) ON DELETE CASCADE;

-- Default seed for Privacy Policy & Terms and Conditions if empty
INSERT INTO public.privacy_policy (content, created_at, updated_at)
SELECT '<h2><strong>WotchaGotcha Privacy Policy</strong></h2><p>Welcome to WotchaGotcha. We respect your privacy and are committed to protecting the personal data you share with us across all 13 interactive modules.</p><h3><strong>1. Information We Collect</strong></h3><p>We collect account profile information, user generated multimedia posts, usage analytics, and device notification identifiers.</p><h3><strong>2. Data Security</strong></h3><p>We apply robust end-to-end transport layer security (TLS/HTTPS) and industry-standard encryption for all personal and financial data.</p><h3><strong>3. Contact</strong></h3><p>For privacy inquiries, contact privacy@wotcha-gotcha.com.</p>', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.privacy_policy);

INSERT INTO public.terms_conditions (content, created_at, updated_at)
SELECT '<h2><strong>WotchaGotcha Terms & Conditions</strong></h2><p>By accessing or using the WotchaGotcha platform and mobile applications, you agree to these Terms and Conditions.</p><h3><strong>1. Acceptable Use</strong></h3><p>Users must comply with community guidelines and avoid posting harmful, infringing, or unauthorized commercial content.</p><h3><strong>2. Content Ownership</strong></h3><p>Users retain ownership of their content while granting WotchaGotcha a license to display and distribute it across the platform services.</p><h3><strong>3. Contact</strong></h3><p>For legal inquiries, contact legal@wotcha-gotcha.com.</p>', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.terms_conditions);


-- =============================================================================
-- Comprehensive Schema Additions & Modern Migration Consolidations
-- =============================================================================

-- 1. Chat Messages Table
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

-- 2. Gold Badge Applications Table
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

-- 3. User Profile Likes Table
CREATE TABLE IF NOT EXISTS public.user_profile_likes (
    id SERIAL PRIMARY KEY,
    liked_user_id INT REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    liked_by_user_id INT REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_profile_like UNIQUE (liked_user_id, liked_by_user_id)
);
CREATE INDEX IF NOT EXISTS idx_user_profile_likes_liked_user ON public.user_profile_likes (liked_user_id);
CREATE INDEX IF NOT EXISTS idx_user_profile_likes_liked_by ON public.user_profile_likes (liked_by_user_id);

-- 4. General Save Item Table
CREATE TABLE IF NOT EXISTS public.general_save_item (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    item_id INT NOT NULL,
    module_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_general_save UNIQUE (user_id, item_id, module_name)
);

-- 5. Add "index" column to all 28 Category and Subcategory Tables
ALTER TABLE IF EXISTS public.app_category ADD COLUMN IF NOT EXISTS "index" INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE IF EXISTS public.app_sub_category ADD COLUMN IF NOT EXISTS "index" INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE IF EXISTS public.item_category ADD COLUMN IF NOT EXISTS "index" INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE IF EXISTS public.item_sub_category ADD COLUMN IF NOT EXISTS "index" INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE IF EXISTS public.disc_category ADD COLUMN IF NOT EXISTS "index" INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE IF EXISTS public.disc_sub_category ADD COLUMN IF NOT EXISTS "index" INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE IF EXISTS public.video_category ADD COLUMN IF NOT EXISTS "index" INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE IF EXISTS public.video_sub_category ADD COLUMN IF NOT EXISTS "index" INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE IF EXISTS public.pic_category ADD COLUMN IF NOT EXISTS "index" INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE IF EXISTS public.pic_sub_category ADD COLUMN IF NOT EXISTS "index" INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE IF EXISTS public.QAFI_category ADD COLUMN IF NOT EXISTS "index" INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE IF EXISTS public.QAFI_sub_category ADD COLUMN IF NOT EXISTS "index" INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE IF EXISTS public.GEBC_category ADD COLUMN IF NOT EXISTS "index" INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE IF EXISTS public.GEBC_sub_category ADD COLUMN IF NOT EXISTS "index" INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE IF EXISTS public.NEWS_category ADD COLUMN IF NOT EXISTS "index" INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE IF EXISTS public.NEWS_sub_category ADD COLUMN IF NOT EXISTS "index" INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE IF EXISTS public.cinematics_category ADD COLUMN IF NOT EXISTS "index" INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE IF EXISTS public.cinematics_sub_category ADD COLUMN IF NOT EXISTS "index" INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE IF EXISTS public.fan_star_category ADD COLUMN IF NOT EXISTS "index" INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE IF EXISTS public.fan_star_sub_category ADD COLUMN IF NOT EXISTS "index" INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE IF EXISTS public.tv_progmax_category ADD COLUMN IF NOT EXISTS "index" INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE IF EXISTS public.tv_progmax_sub_category ADD COLUMN IF NOT EXISTS "index" INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE IF EXISTS public.kid_vids_category ADD COLUMN IF NOT EXISTS "index" INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE IF EXISTS public.kid_vids_sub_category ADD COLUMN IF NOT EXISTS "index" INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE IF EXISTS public.learning_hobbies_category ADD COLUMN IF NOT EXISTS "index" INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE IF EXISTS public.learning_hobbies_sub_category ADD COLUMN IF NOT EXISTS "index" INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE IF EXISTS public.sports_category ADD COLUMN IF NOT EXISTS "index" INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE IF EXISTS public.sport_sub_category ADD COLUMN IF NOT EXISTS "index" INTEGER DEFAULT 0 NOT NULL;

-- 6. Add caption_url to video tables
ALTER TABLE IF EXISTS public.xpi_videos ADD COLUMN IF NOT EXISTS caption_url TEXT;

-- 7. Add Edit / Soft Delete / Hidden columns to all 13 Comment tables
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'cinematics_video_comment', 'comment_post_letter', 'fan_star_video_comment',
    'gebc_comment', 'kid_vids_video_comment', 'learning_hobbies_video_comment',
    'mondon_market_comment', 'news_comment', 'pic_comment', 'qafi_comment',
    'sport_comment', 'tv_progmax_video_comment', 'video_comment'
  ] LOOP
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE NOT NULL;', tbl);
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;', tbl);
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE NOT NULL;', tbl);
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;', tbl);
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE NOT NULL;', tbl);
  END LOOP;
END $$;

-- 8. Add all User columns
ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS badge_subscription_key VARCHAR(255),
  ADD COLUMN IF NOT EXISTS banner_subscript_key VARCHAR(255),
  ADD COLUMN IF NOT EXISTS premium_subscription_key VARCHAR(255),
  ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS city VARCHAR(255),
  ADD COLUMN IF NOT EXISTS country VARCHAR(255),
  ADD COLUMN IF NOT EXISTS province VARCHAR(255),
  ADD COLUMN IF NOT EXISTS profession VARCHAR(255),
  ADD COLUMN IF NOT EXISTS state VARCHAR(255),
  ADD COLUMN IF NOT EXISTS region VARCHAR(255),
  ADD COLUMN IF NOT EXISTS hide_email BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS hide_location BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS hide_profession BOOLEAN DEFAULT FALSE;

-- 10. Drop self-referential shared_post_id FK constraints across all modules
ALTER TABLE IF EXISTS public.news DROP CONSTRAINT IF EXISTS news_shared_post_id_fkey;
ALTER TABLE IF EXISTS public.qafi DROP CONSTRAINT IF EXISTS qafi_shared_post_id_fkey;
ALTER TABLE IF EXISTS public.gebc DROP CONSTRAINT IF EXISTS gebc_shared_post_id_fkey;
ALTER TABLE IF EXISTS public.pic_tours DROP CONSTRAINT IF EXISTS pic_tours_shared_post_id_fkey;
ALTER TABLE IF EXISTS public.xpi_videos DROP CONSTRAINT IF EXISTS xpi_videos_shared_post_id_fkey;

-- 11. Uppercase compatibility views for NEWS, QAFI, GEBC
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

-- ─── Comment moderation / likes / report review metadata (see migrations/comment_moderation_and_likes.sql) ───
ALTER TABLE IF EXISTS public.general_report ADD COLUMN IF NOT EXISTS reviewed_by INT REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS public.general_report ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS public.general_report ADD COLUMN IF NOT EXISTS admin_note TEXT;
CREATE INDEX IF NOT EXISTS idx_general_report_lookup ON public.general_report (type, module_type, target_id);
CREATE INDEX IF NOT EXISTS idx_general_report_status_created ON public.general_report (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.comment_likes (
    id             SERIAL PRIMARY KEY,
    comment_table  VARCHAR(100) NOT NULL,
    comment_id     INT NOT NULL,
    user_id        INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_comment_like UNIQUE (comment_table, comment_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON public.comment_likes (comment_table, comment_id);

-- The *_id post columns of the comment tables are nullable (kept as is for existing databases).
-- Each statement is guarded and idempotent.
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


-- ============================================================================
-- Generic Top List: at most 3 top posts per MODULE (not per category).
-- One row points at a real post (item_id) of the module named in `module`
-- (keys live in utils/topModules.js). Nothing is copied, so edits to the post
-- show up automatically. The limit is enforced by the database as well as the API:
--   UNIQUE (module, position) + CHECK (position 1..3)  => never more than 3 rows
--   UNIQUE (module, item_id)                           => a post can't be top twice
-- item_id has no foreign key because it points at a different table per module;
-- dead rows are pruned by the API before every add, and ignored on read.
-- If TOP_LIMIT in utils/topModules.js is ever changed, change the CHECK below too.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.top_entries (
    id SERIAL PRIMARY KEY,
    module VARCHAR(50) NOT NULL,
    item_id INT NOT NULL,
    position SMALLINT NOT NULL,
    created_by INT REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT top_entries_position_range CHECK (position BETWEEN 1 AND 3),
    CONSTRAINT top_entries_module_position_key UNIQUE (module, position),
    CONSTRAINT top_entries_module_item_key UNIQUE (module, item_id)
);
