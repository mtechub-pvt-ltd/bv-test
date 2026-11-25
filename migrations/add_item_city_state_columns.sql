-- Migration: add city and state columns to item table (Mondo Market location)
ALTER TABLE public.item
  ADD COLUMN IF NOT EXISTS city VARCHAR(255),
  ADD COLUMN IF NOT EXISTS state VARCHAR(255);
