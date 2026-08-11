-- ============================================================
-- Migration 010: Manual ordering for units
-- Run in: Supabase Dashboard → SQL Editor
--
-- Lets units be reordered by drag-and-drop on the Units page instead of
-- always sorting alphabetically by building/unit code.
-- ============================================================

ALTER TABLE public.sz_units
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_sz_units_sort_order ON public.sz_units(stage_id, sort_order);
