-- ============================================================
-- Migration 012: Contract issuance
-- Run in: Supabase Dashboard → SQL Editor
--
-- A contract is "issued" when its document is finalised from the contract
-- page: the paid amount and installment schedule are frozen into
-- document_vars, the pending amount is written to sz_contract_installments,
-- and the contract's paid share is locked in the investor's wallet (refunds
-- can only draw on what is left after issued contracts).
-- ============================================================

ALTER TABLE public.sz_investor_contracts
  ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ;
