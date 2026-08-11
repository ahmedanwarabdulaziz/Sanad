-- ============================================================
-- Migration 008: Investor-recoverable expenses
-- Run in: Supabase Dashboard → SQL Editor
--
-- Lets an expense be linked to a specific investor so that when it's paid,
-- the payment is deducted from that investor's ledger balance (same
-- mechanism as a personal-service deduction) instead of counting as a
-- general project/stage cost.
-- ============================================================

ALTER TABLE public.sz_expenses
  ADD COLUMN IF NOT EXISTS recoverable_investor_id UUID REFERENCES public.sz_investors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sz_expenses_recoverable_investor ON public.sz_expenses(recoverable_investor_id);
