-- ============================================================
-- Migration 005: Treasury Balance Trigger
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION public.sz_update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- If there's a from_account (money leaving), deduct the amount
  IF NEW.from_account_id IS NOT NULL THEN
    UPDATE public.sz_financial_accounts
    SET current_balance = current_balance - NEW.amount,
        updated_at = now()
    WHERE id = NEW.from_account_id;
  END IF;

  -- If there's a to_account (money entering), add the amount
  IF NEW.to_account_id IS NOT NULL THEN
    UPDATE public.sz_financial_accounts
    SET current_balance = current_balance + NEW.amount,
        updated_at = now()
    WHERE id = NEW.to_account_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sz_update_balance ON public.sz_treasury_transactions;
CREATE TRIGGER trg_sz_update_balance
AFTER INSERT ON public.sz_treasury_transactions
FOR EACH ROW
EXECUTE FUNCTION public.sz_update_account_balance();
