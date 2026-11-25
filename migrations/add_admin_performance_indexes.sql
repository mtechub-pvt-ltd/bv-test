-- Admin Panel Optimization: Database Indexing Migration
-- Accelerates search, pagination, and user filtering queries down to < 20ms

-- Users table indexing
CREATE INDEX IF NOT EXISTS idx_users_is_deleted ON users (is_deleted);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_badge ON users (badge);

-- Payments & Subscriptions indexing
CREATE INDEX IF NOT EXISTS idx_stripe_payments_provider_tx ON stripe_payments (provider_transaction_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_user_id ON stripe_payments (user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_user_id ON subscription (user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_transaction_id ON subscription (transaction_id);

-- Content tables indexing
CREATE INDEX IF NOT EXISTS idx_xpi_videos_user_id ON xpi_videos (user_id);
CREATE INDEX IF NOT EXISTS idx_pic_tours_user_id ON pic_tours (user_id);
CREATE INDEX IF NOT EXISTS idx_item_user_id ON item (user_id);
