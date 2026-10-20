-- ============================================================
-- Migration 011: Printable contract templates per stage
-- Run in: Supabase Dashboard → SQL Editor
--
-- Each stage has one contract template: a body written in a light markup
-- with {{variable}} placeholders, plus stage-level default values for those
-- variables. Each investor contract can override any variable before the
-- document is reviewed and printed (document_vars).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sz_contract_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id    UUID NOT NULL UNIQUE REFERENCES public.sz_stages(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT '',
  subtitle    TEXT NOT NULL DEFAULT '',
  body        TEXT NOT NULL DEFAULT '',
  defaults    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sz_contract_templates ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sz_investor_contracts
  ADD COLUMN IF NOT EXISTS document_vars JSONB NOT NULL DEFAULT '{}'::jsonb;
