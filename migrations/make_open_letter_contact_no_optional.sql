-- Migration: Make contact_no optional in post_letters
ALTER TABLE post_letters ALTER COLUMN contact_no DROP NOT NULL;
ALTER TABLE post_letters ALTER COLUMN contact_no SET DEFAULT '';
