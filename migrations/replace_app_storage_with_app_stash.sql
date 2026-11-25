-- =============================================================================
-- Migration: Replace 'App Storage' with 'App Stash' for Mass Apps
-- =============================================================================

-- 1. Rename any existing 'App Storage', 'Storage', or 'Uncategorized' subcategories to 'App Stash'
UPDATE public.app_sub_category
SET
  name = 'App Stash',
  french_name = 'Réserve d''applications',
  slug = 'app_stash',
  "index" = 4,
  updated_at = NOW()
WHERE name ILIKE '%app storage%' 
   OR name ILIKE '%storage%' 
   OR slug ILIKE '%storage%'
   OR name ILIKE '%uncategorized%';

-- 2. Ensure all 'App Stash' entries have slug = 'app_stash' and index = 4
UPDATE public.app_sub_category
SET
  slug = 'app_stash',
  french_name = COALESCE(french_name, 'Réserve d''applications'),
  "index" = 4,
  updated_at = NOW()
WHERE (name = 'App Stash' OR "index" = 4)
  AND (slug IS NULL OR slug != 'app_stash' OR name != 'App Stash');

-- 3. Ensure each main category in app_category has 'App Stash' (index 4, slug 'app_stash')
INSERT INTO public.app_sub_category (category_id, name, french_name, slug, "index", enabled, created_at, updated_at)
SELECT
  ac.id,
  'App Stash',
  'Réserve d''applications',
  'app_stash',
  4,
  TRUE,
  NOW(),
  NOW()
FROM public.app_category ac
WHERE NOT EXISTS (
  SELECT 1 FROM public.app_sub_category asc_t
  WHERE asc_t.category_id = ac.id
    AND (asc_t.name = 'App Stash' OR asc_t.slug = 'app_stash' OR asc_t.index = 4)
);
