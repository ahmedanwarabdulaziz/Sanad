-- ============================================================
-- Migration 007: Typical unit area per stage
-- Run in: Supabase Dashboard → SQL Editor
--
-- The assumed/typical unit size (e.g. 130 sqm) used as the default when
-- creating a new investor contract in this stage, before real units exist.
-- ============================================================

ALTER TABLE public.sz_stages
  ADD COLUMN IF NOT EXISTS typical_unit_area NUMERIC(14,4) NOT NULL DEFAULT 0;
