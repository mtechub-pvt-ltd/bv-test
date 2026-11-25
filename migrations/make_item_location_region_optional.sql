-- Migration: make location and region optional on item table
ALTER TABLE public.item
  ALTER COLUMN location DROP NOT NULL,
  ALTER COLUMN region DROP NOT NULL;
