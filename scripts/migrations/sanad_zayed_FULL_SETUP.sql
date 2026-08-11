-- ============================================================
-- Sanad Zayed — FULL SETUP SCRIPT (run this once in Supabase)
-- Combines 002 + 003. Safe to re-run (IF NOT EXISTS everywhere).
-- Supabase Dashboard → SQL Editor → New query → paste → Run
-- ============================================================

-- ============================================================
-- 1. Investors (المستثمرون)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sz_investors (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL,
  phone                   TEXT NOT NULL DEFAULT '',
  phone_2                 TEXT NOT NULL DEFAULT '',
  email                   TEXT NOT NULL DEFAULT '',
  national_id             TEXT NOT NULL DEFAULT '',
  job_in_national_id      TEXT NOT NULL DEFAULT '',
  address_in_national_id  TEXT NOT NULL DEFAULT '',
  notes                   TEXT NOT NULL DEFAULT '',
  is_active               BOOLEAN NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add columns in case table was created from old schema (safe if already exist)
ALTER TABLE public.sz_investors ADD COLUMN IF NOT EXISTS phone_2                TEXT NOT NULL DEFAULT '';
ALTER TABLE public.sz_investors ADD COLUMN IF NOT EXISTS job_in_national_id     TEXT NOT NULL DEFAULT '';
ALTER TABLE public.sz_investors ADD COLUMN IF NOT EXISTS address_in_national_id TEXT NOT NULL DEFAULT '';

ALTER TABLE public.sz_investors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sr_sz_investors"        ON public.sz_investors;
DROP POLICY IF EXISTS "auth_read_sz_investors" ON public.sz_investors;
CREATE POLICY "sr_sz_investors"        ON public.sz_investors FOR ALL    TO service_role  USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_sz_investors" ON public.sz_investors FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 2. Project Stages (مراحل المشروع)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sz_stages (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  description          TEXT NOT NULL DEFAULT '',
  unit_type            TEXT NOT NULL DEFAULT 'LAND_METER'
                         CHECK (unit_type IN ('LAND_METER', 'APARTMENT_METER')),
  base_unit_price      NUMERIC(14,2) NOT NULL DEFAULT 0,
  management_fee_pct   NUMERIC(5,2)  NOT NULL DEFAULT 0,
  status               TEXT NOT NULL DEFAULT 'PLANNING'
                         CHECK (status IN ('PLANNING', 'OPEN', 'CLOSED')),
  sort_order           INT  NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sz_stages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sr_sz_stages"        ON public.sz_stages;
DROP POLICY IF EXISTS "auth_read_sz_stages" ON public.sz_stages;
CREATE POLICY "sr_sz_stages"        ON public.sz_stages FOR ALL    TO service_role  USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_sz_stages" ON public.sz_stages FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 3. Investor Contracts (عقود المستثمرين)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sz_investor_contracts (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id              UUID NOT NULL REFERENCES public.sz_investors(id) ON DELETE RESTRICT,
  stage_id                 UUID NOT NULL REFERENCES public.sz_stages(id)    ON DELETE RESTRICT,
  unit_quantity            NUMERIC(14,4) NOT NULL DEFAULT 0,
  unit_price_at_contract   NUMERIC(14,2) NOT NULL DEFAULT 0,
  management_fee_pct       NUMERIC(5,2)  NOT NULL DEFAULT 0,
  total_contract_value     NUMERIC(14,2) NOT NULL DEFAULT 0,
  contract_date            DATE          NOT NULL DEFAULT CURRENT_DATE,
  notes                    TEXT          NOT NULL DEFAULT '',
  status                   TEXT          NOT NULL DEFAULT 'ACTIVE'
                             CHECK (status IN ('ACTIVE', 'SETTLED', 'CANCELLED')),
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sz_contracts_investor ON public.sz_investor_contracts(investor_id);
CREATE INDEX IF NOT EXISTS idx_sz_contracts_stage    ON public.sz_investor_contracts(stage_id);

ALTER TABLE public.sz_investor_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sr_sz_contracts"        ON public.sz_investor_contracts;
DROP POLICY IF EXISTS "auth_read_sz_contracts" ON public.sz_investor_contracts;
CREATE POLICY "sr_sz_contracts"        ON public.sz_investor_contracts FOR ALL    TO service_role  USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_sz_contracts" ON public.sz_investor_contracts FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 4. Financial Accounts / Treasury (الخزينة)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sz_financial_accounts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name     TEXT NOT NULL,
  account_type     TEXT NOT NULL DEFAULT 'SAFE_CASH'
                     CHECK (account_type IN ('BANK', 'SAFE_CASH', 'PETTY_CASH')),
  custodian_name   TEXT NOT NULL DEFAULT '',
  current_balance  NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sz_financial_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sr_sz_accounts"        ON public.sz_financial_accounts;
DROP POLICY IF EXISTS "auth_read_sz_accounts" ON public.sz_financial_accounts;
CREATE POLICY "sr_sz_accounts"        ON public.sz_financial_accounts FOR ALL    TO service_role  USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_sz_accounts" ON public.sz_financial_accounts FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 5. Expenses (المصروفات)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sz_expenses (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id               UUID REFERENCES public.sz_stages(id)              ON DELETE SET NULL,
  financial_account_id   UUID REFERENCES public.sz_financial_accounts(id)  ON DELETE SET NULL,
  description            TEXT          NOT NULL,
  category               TEXT          NOT NULL DEFAULT '',
  allocated_cost         NUMERIC(14,2) NOT NULL DEFAULT 0,
  actual_paid_amount     NUMERIC(14,2) NOT NULL DEFAULT 0,
  expense_date           DATE          NOT NULL DEFAULT CURRENT_DATE,
  status                 TEXT          NOT NULL DEFAULT 'PENDING_REVIEW'
                           CHECK (status IN ('PENDING_REVIEW', 'APPROVED')),
  attachment_url         TEXT,
  notes                  TEXT          NOT NULL DEFAULT '',
  created_by             UUID REFERENCES public.erp_users(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sz_expenses_stage   ON public.sz_expenses(stage_id);
CREATE INDEX IF NOT EXISTS idx_sz_expenses_account ON public.sz_expenses(financial_account_id);

ALTER TABLE public.sz_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sr_sz_expenses"        ON public.sz_expenses;
DROP POLICY IF EXISTS "auth_read_sz_expenses" ON public.sz_expenses;
CREATE POLICY "sr_sz_expenses"        ON public.sz_expenses FOR ALL    TO service_role  USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_sz_expenses" ON public.sz_expenses FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 6. Treasury Transactions Ledger (سجل المعاملات)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sz_treasury_transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type  TEXT NOT NULL
                      CHECK (transaction_type IN ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'EXPENSE')),
  from_account_id   UUID REFERENCES public.sz_financial_accounts(id) ON DELETE SET NULL,
  to_account_id     UUID REFERENCES public.sz_financial_accounts(id) ON DELETE SET NULL,
  amount            NUMERIC(14,2) NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  transaction_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  contract_id       UUID REFERENCES public.sz_investor_contracts(id) ON DELETE SET NULL,
  expense_id        UUID REFERENCES public.sz_expenses(id) ON DELETE SET NULL,
  investor_id       UUID REFERENCES public.sz_investors(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sz_treasury_from ON public.sz_treasury_transactions(from_account_id);
CREATE INDEX IF NOT EXISTS idx_sz_treasury_to   ON public.sz_treasury_transactions(to_account_id);

ALTER TABLE public.sz_treasury_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sr_sz_treasury"        ON public.sz_treasury_transactions;
DROP POLICY IF EXISTS "auth_read_sz_treasury" ON public.sz_treasury_transactions;
CREATE POLICY "sr_sz_treasury"        ON public.sz_treasury_transactions FOR ALL    TO service_role  USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_sz_treasury" ON public.sz_treasury_transactions FOR SELECT TO authenticated USING (true);

-- ============================================================
-- Done ✓
-- ============================================================
SELECT 'Sanad Zayed schema created successfully ✓' AS result;

-- ============================================================
-- 7. Treasury Balance Trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.sz_update_account_balance()
RETURNS TRIGGER AS $body
BEGIN
  IF NEW.from_account_id IS NOT NULL THEN
    UPDATE public.sz_financial_accounts
    SET current_balance = current_balance - NEW.amount,
        updated_at = now()
    WHERE id = NEW.from_account_id;
  END IF;

  IF NEW.to_account_id IS NOT NULL THEN
    UPDATE public.sz_financial_accounts
    SET current_balance = current_balance + NEW.amount,
        updated_at = now()
    WHERE id = NEW.to_account_id;
  END IF;

  RETURN NEW;
END;
$body LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sz_update_balance ON public.sz_treasury_transactions;
CREATE TRIGGER trg_sz_update_balance
AFTER INSERT ON public.sz_treasury_transactions
FOR EACH ROW
EXECUTE FUNCTION public.sz_update_account_balance();

