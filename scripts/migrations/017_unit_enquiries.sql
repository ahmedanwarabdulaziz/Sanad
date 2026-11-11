-- ============================================================
-- Migration 017: Sanad Zayed unit enquiries + interactive plan analytics
-- Run in: Supabase Dashboard → SQL Editor
--
-- unit_enquiries = the enquiry form on /projects/sanad-zayed/masterplan(-2d).
-- Prices are not published: a visitor asks about one or more units and the sales
-- team calls them back. Managed from /admin/unit-enquiries.
--
-- unit_events = anonymous counters from the interactive plan (a unit's details
-- opened, its brochure downloaded, an enquiry sent) so the team can see which
-- units attract the most interest. No personal data is stored here.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.unit_enquiries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference         TEXT NOT NULL UNIQUE,
  status            TEXT NOT NULL DEFAULT 'NEW'
                    CHECK (status IN ('NEW', 'CONTACTED', 'INTERESTED', 'CLOSED')),
  project           TEXT NOT NULL DEFAULT 'sanad-zayed',
  units             TEXT[] NOT NULL DEFAULT '{}',
  full_name         TEXT NOT NULL,
  phone             TEXT NOT NULL,
  email             TEXT NOT NULL DEFAULT '',
  contact_method    TEXT NOT NULL DEFAULT '',
  best_time         TEXT NOT NULL DEFAULT '',
  purpose           TEXT NOT NULL DEFAULT '',
  message           TEXT NOT NULL DEFAULT '',
  source            TEXT NOT NULL DEFAULT '',
  notes             TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS unit_enquiries_created_at_idx ON public.unit_enquiries (created_at DESC);

CREATE TABLE IF NOT EXISTS public.unit_events (
  id          BIGSERIAL PRIMARY KEY,
  unit_id     TEXT NOT NULL,
  event       TEXT NOT NULL CHECK (event IN ('view', 'brochure', 'tour', 'enquiry')),
  source      TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS unit_events_unit_idx ON public.unit_events (unit_id, event);

-- No policies on purpose: only server routes using the service role may read or write.
ALTER TABLE public.unit_enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_events ENABLE ROW LEVEL SECURITY;
