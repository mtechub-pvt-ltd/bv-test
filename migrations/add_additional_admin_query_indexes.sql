-- Additional Admin Queries Index Optimization Migration
-- Ensures 100% index coverage for all Admin Portal list, search, and report queries

-- 1. Blogs table indexes
CREATE INDEX IF NOT EXISTS idx_blogs_created_at ON blogs (created_at DESC);

-- 2. Banner table indexes
CREATE INDEX IF NOT EXISTS idx_banner_status ON banner (status);
CREATE INDEX IF NOT EXISTS idx_banner_created_at ON banner (created_at DESC);

-- 3. Item Report & Reported Users indexes
CREATE INDEX IF NOT EXISTS idx_item_report_status ON item_report (status);
CREATE INDEX IF NOT EXISTS idx_item_report_created_at ON item_report (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reported_user_status ON reported_user (status);
CREATE INDEX IF NOT EXISTS idx_reported_user_created_at ON reported_user (created_at DESC);

-- 4. Compound User Filter Index (for paginated user lists + block/role filter)
CREATE INDEX IF NOT EXISTS idx_users_role_deleted_created ON users (role, is_deleted, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_block_deleted ON users (block, is_deleted);
