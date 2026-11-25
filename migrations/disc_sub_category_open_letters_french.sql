-- Open Letters (disc_sub_category): French display names for standard receiver / tab subcategories.
-- Run against your Postgres DB (e.g. psql $DATABASE_URL -f migrations/disc_sub_category_open_letters_french.sql).

UPDATE public.disc_sub_category
SET french_name = 'Public',
    updated_at = NOW()
WHERE TRIM(name) = 'Public';

UPDATE public.disc_sub_category
SET french_name = 'Autorités',
    updated_at = NOW()
WHERE TRIM(name) = 'Authorities';

UPDATE public.disc_sub_category
SET french_name = 'Leaders',
    updated_at = NOW()
WHERE TRIM(name) IN ('Leaders', 'Leader');

UPDATE public.disc_sub_category
SET french_name = 'Célébrités',
    updated_at = NOW()
WHERE TRIM(name) = 'Celebrities';
