-- ============================================================
-- Migration 014: Saved website form submissions
-- Run in: Supabase Dashboard → SQL Editor
--
-- project_submissions = the /submit-project page.
-- contact_submissions = the contact and teaser forms.
-- files holds [{ name, key, size }] pointing at private R2 objects.
-- email_log holds [{ type, subject, body, sent_at, sent_by }].
-- next_action_due_at = when the applicant was promised the next email.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.project_submissions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference           TEXT NOT NULL UNIQUE,
  status              TEXT NOT NULL DEFAULT 'NEW'
                      CHECK (status IN ('NEW', 'ACCEPTED', 'CALL_INVITED', 'DECLINED')),
  next_action_due_at  TIMESTAMPTZ,
  request_type        TEXT NOT NULL,
  project_name        TEXT NOT NULL,
  sector              TEXT NOT NULL,
  location            TEXT NOT NULL,
  description         TEXT NOT NULL,
  advantage           TEXT NOT NULL,
  idea_stage          TEXT NOT NULL DEFAULT '',
  founded_year        TEXT NOT NULL DEFAULT '',
  annual_revenue      TEXT NOT NULL DEFAULT '',
  team_size           TEXT NOT NULL DEFAULT '',
  funding_range       TEXT NOT NULL,
  use_of_funds        TEXT NOT NULL,
  support_types       TEXT[] NOT NULL DEFAULT '{}',
  available_documents TEXT[] NOT NULL DEFAULT '{}',
  documents_link      TEXT NOT NULL DEFAULT '',
  full_name           TEXT NOT NULL,
  phone               TEXT NOT NULL,
  email               TEXT NOT NULL,
  company             TEXT NOT NULL DEFAULT '',
  job_title           TEXT NOT NULL DEFAULT '',
  files               JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes               TEXT NOT NULL DEFAULT '',
  email_log           JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference         TEXT NOT NULL UNIQUE,
  status            TEXT NOT NULL DEFAULT 'NEW'
                    CHECK (status IN ('NEW', 'IN_PROGRESS', 'CLOSED')),
  request_type      TEXT NOT NULL DEFAULT '',
  name              TEXT NOT NULL,
  email             TEXT NOT NULL,
  phone             TEXT NOT NULL,
  company           TEXT NOT NULL DEFAULT '',
  job_title         TEXT NOT NULL DEFAULT '',
  city              TEXT NOT NULL DEFAULT '',
  message           TEXT NOT NULL,
  newsletter_agreed BOOLEAN NOT NULL DEFAULT false,
  files             JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes             TEXT NOT NULL DEFAULT '',
  email_log         JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_submissions_created_at_idx
  ON public.project_submissions (created_at DESC);
CREATE INDEX IF NOT EXISTS contact_submissions_created_at_idx
  ON public.contact_submissions (created_at DESC);

-- No policies on purpose: only server routes using the service role may read these.
ALTER TABLE public.project_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
