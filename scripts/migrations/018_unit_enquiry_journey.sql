-- ============================================================
-- Migration 018: visitor journey on Sanad Zayed unit enquiries
-- Run in: Supabase Dashboard → SQL Editor
--
-- journey = what the visitor did on the interactive plan before enquiring
-- (units opened and time spent on each, brochure, 3D tour, location movie,
-- WhatsApp/call taps, number of visits, and the ad/link that brought them).
-- Shown to the sales team on /admin/unit-enquiries. Until this runs, enquiries
-- still save, just without the journey.
-- ============================================================

ALTER TABLE public.unit_enquiries
  ADD COLUMN IF NOT EXISTS journey JSONB NOT NULL DEFAULT '{}'::jsonb;

NOTIFY pgrst, 'reload schema';
