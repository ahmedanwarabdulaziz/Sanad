-- ============================================================
-- Migration 004: Add investor_id to treasury_transactions
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE public.sz_treasury_transactions
  ADD COLUMN IF NOT EXISTS investor_id UUID REFERENCES public.sz_investors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sz_treasury_investor ON public.sz_treasury_transactions(investor_id);
