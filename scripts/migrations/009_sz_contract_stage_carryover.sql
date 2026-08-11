-- ============================================================
-- Migration 009: Carry-over pricing across stages
-- Run in: Supabase Dashboard → SQL Editor
--
-- A unit's total price can be built up across stages (e.g. Stage 1 =
-- land/foundation, Stage 2 = construction on the same unit). When an
-- existing investor continues into a later stage, their new contract can
-- link back to the earlier one to carry over its locked price instead of
-- re-typing it. A brand-new investor joining at a later stage has no prior
-- contract to link, so the carried-over price is entered manually instead.
-- ============================================================

ALTER TABLE public.sz_investor_contracts
  ADD COLUMN IF NOT EXISTS linked_contract_id UUID REFERENCES public.sz_investor_contracts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS prior_stage_price NUMERIC(14,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_sz_contracts_linked ON public.sz_investor_contracts(linked_contract_id);
