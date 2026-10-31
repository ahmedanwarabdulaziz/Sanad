-- ============================================================
-- Migration 013: Deferred-amounts account type
-- Run in: Supabase Dashboard → SQL Editor
--
-- DEFERRED = money held by a person on the company's behalf
-- (e.g. "مبالغ مؤجلة عند هشام"); the holder goes in custodian_name.
-- ============================================================

ALTER TABLE public.sz_financial_accounts
  DROP CONSTRAINT IF EXISTS sz_financial_accounts_account_type_check;

ALTER TABLE public.sz_financial_accounts
  ADD CONSTRAINT sz_financial_accounts_account_type_check
  CHECK (account_type IN ('BANK', 'SAFE_CASH', 'PETTY_CASH', 'DEFERRED'));
