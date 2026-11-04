-- ============================================================
-- Migration 015: Saved real-estate partnership requests
-- Run in: Supabase Dashboard → SQL Editor
--
-- real_estate_submissions = the /real-estate-partnership page.
-- request_type 'land_owner' = owns land in a new urban community and needs a
-- building partner; 'unit_buyer' = wants a unit through an owners' association.
-- Only the columns for the chosen request_type are filled.
-- files, email_log and next_action_due_at work as in project_submissions.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.real_estate_submissions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference           TEXT NOT NULL UNIQUE,
  status              TEXT NOT NULL DEFAULT 'NEW'
                      CHECK (status IN ('NEW', 'ACCEPTED', 'CALL_INVITED', 'DECLINED')),
  next_action_due_at  TIMESTAMPTZ,
  request_type        TEXT NOT NULL CHECK (request_type IN ('land_owner', 'unit_buyer')),
  city                TEXT NOT NULL,
  district            TEXT NOT NULL,
  land_area           NUMERIC(14, 2),
  price_per_meter     NUMERIC(14, 2),
  estimated_total     NUMERIC(18, 2),
  building_ratio      NUMERIC(5, 2),
  floors              INTEGER,
  ownership_status    TEXT NOT NULL DEFAULT '',
  land_use            TEXT NOT NULL DEFAULT '',
  license_status      TEXT NOT NULL DEFAULT '',
  payment_status      TEXT NOT NULL DEFAULT '',
  partnership_models  TEXT[] NOT NULL DEFAULT '{}',
  documents_link      TEXT NOT NULL DEFAULT '',
  unit_type           TEXT NOT NULL DEFAULT '',
  unit_area           TEXT NOT NULL DEFAULT '',
  budget_range        TEXT NOT NULL DEFAULT '',
  purchase_timeline   TEXT NOT NULL DEFAULT '',
  purpose             TEXT NOT NULL DEFAULT '',
  message             TEXT NOT NULL DEFAULT '',
  full_name           TEXT NOT NULL,
  phone               TEXT NOT NULL,
  email               TEXT NOT NULL,
  files               JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes               TEXT NOT NULL DEFAULT '',
  email_log           JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS real_estate_submissions_created_at_idx
  ON public.real_estate_submissions (created_at DESC);

-- No policies on purpose: only server routes using the service role may read this.
ALTER TABLE public.real_estate_submissions ENABLE ROW LEVEL SECURITY;
