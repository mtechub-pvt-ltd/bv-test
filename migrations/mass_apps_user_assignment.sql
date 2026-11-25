-- =============================================================================
-- Mass Apps + Subcategory refactor
-- =============================================================================
-- 1. Wipe orphaned rows from app_sub_category (category_ids that don't exist)
-- 2. Revert app_sub_category back to subcategory-definition-only role
-- 3. Seed 4 standard subcategories per active main category
-- 4. Create new per-user assignment table: user_mass_app_assignment
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Delete orphaned rows from app_sub_category
-- -----------------------------------------------------------------------------
DELETE FROM public.app_sub_category
WHERE category_id IS NOT NULL
  AND category_id NOT IN (SELECT id FROM public.app_category);

-- -----------------------------------------------------------------------------
-- 2. Revert app_sub_category to definition-only role
--    Drop all the mass-app-specific columns and constraints added previously
-- -----------------------------------------------------------------------------
DROP INDEX IF EXISTS public.uq_app_sub_category_user_package;
DROP INDEX IF EXISTS public.idx_app_sub_category_user_massapp;
ALTER TABLE public.app_sub_category DROP CONSTRAINT IF EXISTS check_subcategory_id;

ALTER TABLE public.app_sub_category
  DROP COLUMN IF EXISTS user_id,
  DROP COLUMN IF EXISTS package_name,
  DROP COLUMN IF EXISTS label,
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS subcategory_id,
  DROP COLUMN IF EXISTS position,
  DROP COLUMN IF EXISTS is_mass_app;

-- Restore NOT NULL on `name` (it was relaxed for mass-app rows; legacy definition rows need it)
ALTER TABLE public.app_sub_category ALTER COLUMN name SET NOT NULL;

-- Add `enabled` and `slug` flags
ALTER TABLE public.app_sub_category
  ADD COLUMN IF NOT EXISTS slug VARCHAR(100),
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- Rename any App Storage / Storage to App Stash
UPDATE public.app_sub_category
SET name = 'App Stash', french_name = 'Réserve d''applications', slug = 'app_stash', "index" = 4, updated_at = NOW()
WHERE name ILIKE '%app storage%' OR name ILIKE '%storage%' OR slug ILIKE '%storage%' OR name ILIKE '%uncategorized%';

-- Backfill slugs
UPDATE public.app_sub_category
SET slug = CASE
  WHEN name ILIKE '%local%' THEN 'top_apps'
  WHEN name ILIKE '%recent%' THEN 'recent'
  WHEN name ILIKE '%favor%' THEN 'favourite'
  WHEN name ILIKE '%popular%' THEN 'popular'
  WHEN name ILIKE '%stash%' OR name ILIKE '%storage%' THEN 'app_stash'
  ELSE LOWER(REPLACE(TRIM(name), ' ', '_'))
END
WHERE slug IS NULL;

-- -----------------------------------------------------------------------------
-- 3. Seed 5 standard subcategories per active main category
--    Each main category gets: top_apps (Local Apps), recent, favourite, popular, app_stash (App Stash)
-- -----------------------------------------------------------------------------
INSERT INTO public.app_sub_category (category_id, name, french_name, slug, "index", enabled)
SELECT
  ac.id,
  s.name,
  s.french_name,
  s.slug,
  s.idx,
  TRUE
FROM public.app_category ac
CROSS JOIN (VALUES
  ('recent',    'Recent Apps',  'Applis Récentes',         0),
  ('favourite', 'Favorite',     'Favoris',                 1),
  ('popular',   'Popular',      'Populaires',              2),
  ('top_apps',  'Local',        'Locales',                 3),
  ('app_stash', 'App Stash',    'Réserve d''applications', 4)
) AS s(slug, name, french_name, idx)
WHERE NOT EXISTS (
  SELECT 1 FROM public.app_sub_category x
  WHERE x.category_id = ac.id AND (x.name = s.name OR x.slug = s.slug OR x.index = s.idx)
);

-- -----------------------------------------------------------------------------
-- 4. New per-user mass app assignment table
--    subcategory_id is an integer FK to app_sub_category.id
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_mass_app_assignment (
  id              SERIAL PRIMARY KEY,
  user_id         INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  package_name    VARCHAR(255) NOT NULL,
  label           VARCHAR(255),
  name            VARCHAR(255),
  main_category_id    INT NOT NULL REFERENCES public.app_category(id) ON DELETE CASCADE,
  subcategory_id      INT NOT NULL REFERENCES public.app_sub_category(id) ON DELETE RESTRICT,
  position        INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- App lives in one place only
  CONSTRAINT uq_user_mass_app_user_package UNIQUE (user_id, package_name)
);

CREATE INDEX IF NOT EXISTS idx_user_mass_app_user
  ON public.user_mass_app_assignment (user_id);

CREATE INDEX IF NOT EXISTS idx_user_mass_app_lookup
  ON public.user_mass_app_assignment (user_id, main_category_id, subcategory_id, position);

-- -----------------------------------------------------------------------------
-- 5. Hidden mass apps table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mass_app_hidden (
  id              SERIAL PRIMARY KEY,
  user_id         INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  package_name    VARCHAR(255) NOT NULL,
  label           VARCHAR(255),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_mass_app_hidden UNIQUE (user_id, package_name)
);

CREATE INDEX IF NOT EXISTS idx_mass_app_hidden_user
  ON public.mass_app_hidden (user_id);

-- -----------------------------------------------------------------------------
-- 6. Recent mass apps table (max 4 per user)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mass_app_recent (
  id              SERIAL PRIMARY KEY,
  user_id         INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  package_name    VARCHAR(255) NOT NULL,
  label           VARCHAR(255),
  name            VARCHAR(255),
  position        INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mass_app_recent_user
  ON public.mass_app_recent (user_id);

CREATE INDEX IF NOT EXISTS idx_mass_app_recent_lookup
  ON public.mass_app_recent (user_id, position, created_at DESC);

-- -----------------------------------------------------------------------------
-- 7. Triggers to keep updated_at fresh
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_mass_app_assignment_updated_at ON public.user_mass_app_assignment;
CREATE TRIGGER trg_user_mass_app_assignment_updated_at
  BEFORE UPDATE ON public.user_mass_app_assignment
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_mass_app_recent_updated_at ON public.mass_app_recent;
CREATE TRIGGER trg_mass_app_recent_updated_at
  BEFORE UPDATE ON public.mass_app_recent
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();