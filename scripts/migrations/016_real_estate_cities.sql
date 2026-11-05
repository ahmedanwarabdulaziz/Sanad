-- ============================================================
-- Migration 016: New cities the real-estate request form accepts
-- Run in: Supabase Dashboard → SQL Editor
-- Run this BEFORE deploying the code that reads it: until the table exists, the
-- public form offers no cities and rejects every submission.
--
-- Managed from /admin/real-estate-requests. The public form offers, and its API
-- accepts, only rows with is_eligible = true.
-- real_estate_submissions.city keeps its own copy of the name on purpose, so saved
-- requests are not affected when a city here is renamed or deleted.
-- sort_order keeps the listed order below; a city added later goes to the end.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.real_estate_cities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  is_eligible BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  SERIAL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The list the form offered until now, minus its free-text "مدينة أخرى" option.
INSERT INTO public.real_estate_cities (name) VALUES
  ('القاهرة الجديدة'),
  ('العاصمة الإدارية الجديدة'),
  ('الشيخ زايد'),
  ('السادس من أكتوبر'),
  ('حدائق أكتوبر'),
  ('الشروق'),
  ('بدر'),
  ('العبور الجديدة'),
  ('العاشر من رمضان'),
  ('برج العرب الجديدة'),
  ('المنصورة الجديدة'),
  ('دمياط الجديدة'),
  ('بني سويف الجديدة'),
  ('المنيا الجديدة'),
  ('أسيوط الجديدة'),
  ('سوهاج الجديدة')
ON CONFLICT (name) DO NOTHING;

-- No policies on purpose: only server routes using the service role may read this.
ALTER TABLE public.real_estate_cities ENABLE ROW LEVEL SECURITY;
