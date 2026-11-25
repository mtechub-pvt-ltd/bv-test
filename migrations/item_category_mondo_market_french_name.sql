-- Mondo Market main categories live in `public.item_category` (`name`, `french_name`).
-- With Français selected, the web app shows `french_name` when it is non-empty; otherwise `name`.
--
-- 1) See what you have in the database:
--    SELECT id, name, french_name FROM public.item_category ORDER BY "index", id;
--
-- 2) Extend the VALUES list below: one row per English `name` (matched case-insensitively).
--    Then run this script against your DB (psql, admin, CI migration, etc.).

UPDATE public.item_category AS ic
SET
  french_name = v.fr,
  updated_at = NOW()
FROM (
  VALUES
    ('Mondo Market', 'Marché Mondo')
    -- , ('Another English Name', 'Libellé français')
) AS v(en, fr)
WHERE TRIM(ic.name) ILIKE TRIM(v.en);
