-- ============================================================
-- Migration 006: Multi-Stage Investment Engine
-- Run in: Supabase Dashboard → SQL Editor (safe to re-run)
--
-- Adds: stage pricing-basis status + sellable area cap, expense
-- stage-split allocations, expense payment tranches, budget
-- items, physical units + unit allocations, area reconciliation,
-- installment templates + per-contract installments, and the
-- investor-facing override / reason_type columns needed for the
-- investor ledger and PDF statement.
-- ============================================================

-- ============================================================
-- 1. sz_stages — pricing-basis status + sellable area cap
-- ============================================================
ALTER TABLE public.sz_stages
  ADD COLUMN IF NOT EXISTS pricing_status TEXT NOT NULL DEFAULT 'ESTIMATED'
    CHECK (pricing_status IN ('ESTIMATED', 'LICENSED'));

ALTER TABLE public.sz_stages
  ADD COLUMN IF NOT EXISTS target_sellable_area NUMERIC(14,4) NOT NULL DEFAULT 0;

-- ============================================================
-- 2. sz_expenses — investor-facing override + hide flag
-- ============================================================
ALTER TABLE public.sz_expenses
  ADD COLUMN IF NOT EXISTS investor_override_description TEXT;

ALTER TABLE public.sz_expenses
  ADD COLUMN IF NOT EXISTS investor_override_amount NUMERIC(14,2);

ALTER TABLE public.sz_expenses
  ADD COLUMN IF NOT EXISTS hide_from_investor BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- 3. sz_treasury_transactions — investor reason + reconciliation link
-- ============================================================
ALTER TABLE public.sz_treasury_transactions
  ADD COLUMN IF NOT EXISTS reason_type TEXT
    CHECK (reason_type IN ('CONTRACT_PAYMENT', 'PERSONAL_SERVICE_DEDUCTION', 'CREDIT_REFUND'));

-- ============================================================
-- 4. sz_stage_budget_items (المصاريف المتوقعة)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sz_stage_budget_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id          UUID NOT NULL REFERENCES public.sz_stages(id) ON DELETE CASCADE,
  description       TEXT NOT NULL,
  category          TEXT NOT NULL DEFAULT '',
  amount            NUMERIC(14,2) NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'PENDING'
                      CHECK (status IN ('PENDING', 'CONVERTED')),
  linked_expense_id UUID REFERENCES public.sz_expenses(id) ON DELETE SET NULL,
  notes             TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sz_budget_items_stage ON public.sz_stage_budget_items(stage_id);

ALTER TABLE public.sz_stage_budget_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sr_sz_budget_items"        ON public.sz_stage_budget_items;
DROP POLICY IF EXISTS "auth_read_sz_budget_items" ON public.sz_stage_budget_items;
CREATE POLICY "sr_sz_budget_items"        ON public.sz_stage_budget_items FOR ALL    TO service_role  USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_sz_budget_items" ON public.sz_stage_budget_items FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 5. sz_expense_allocations — how one expense splits across stages
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sz_expense_allocations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id   UUID NOT NULL REFERENCES public.sz_expenses(id) ON DELETE CASCADE,
  stage_id     UUID NOT NULL REFERENCES public.sz_stages(id)   ON DELETE RESTRICT,
  percentage   NUMERIC(5,2) NOT NULL DEFAULT 100,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sz_expense_alloc_expense ON public.sz_expense_allocations(expense_id);
CREATE INDEX IF NOT EXISTS idx_sz_expense_alloc_stage   ON public.sz_expense_allocations(stage_id);

ALTER TABLE public.sz_expense_allocations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sr_sz_expense_alloc"        ON public.sz_expense_allocations;
DROP POLICY IF EXISTS "auth_read_sz_expense_alloc" ON public.sz_expense_allocations;
CREATE POLICY "sr_sz_expense_alloc"        ON public.sz_expense_allocations FOR ALL    TO service_role  USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_sz_expense_alloc" ON public.sz_expense_allocations FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 6. sz_expense_payments — tranches paid over time toward one expense
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sz_expense_payments (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id             UUID NOT NULL REFERENCES public.sz_expenses(id) ON DELETE CASCADE,
  amount                 NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_date              DATE NOT NULL DEFAULT CURRENT_DATE,
  financial_account_id   UUID REFERENCES public.sz_financial_accounts(id)  ON DELETE SET NULL,
  treasury_transaction_id UUID REFERENCES public.sz_treasury_transactions(id) ON DELETE SET NULL,
  notes                  TEXT NOT NULL DEFAULT '',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sz_expense_pay_expense ON public.sz_expense_payments(expense_id);

ALTER TABLE public.sz_expense_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sr_sz_expense_pay"        ON public.sz_expense_payments;
DROP POLICY IF EXISTS "auth_read_sz_expense_pay" ON public.sz_expense_payments;
CREATE POLICY "sr_sz_expense_pay"        ON public.sz_expense_payments FOR ALL    TO service_role  USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_sz_expense_pay" ON public.sz_expense_payments FOR SELECT TO authenticated USING (true);

-- Keep sz_expenses.actual_paid_amount as a rollup of its payments (same pattern as
-- the account-balance trigger in 005_treasury_trigger.sql).
CREATE OR REPLACE FUNCTION public.sz_update_expense_paid_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.sz_expenses
  SET actual_paid_amount = (
        SELECT COALESCE(SUM(amount), 0)
        FROM public.sz_expense_payments
        WHERE expense_id = COALESCE(NEW.expense_id, OLD.expense_id)
      ),
      updated_at = now()
  WHERE id = COALESCE(NEW.expense_id, OLD.expense_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sz_expense_paid_total ON public.sz_expense_payments;
CREATE TRIGGER trg_sz_expense_paid_total
AFTER INSERT OR UPDATE OR DELETE ON public.sz_expense_payments
FOR EACH ROW
EXECUTE FUNCTION public.sz_update_expense_paid_total();

-- ============================================================
-- 7. sz_units — physical units (populated once a stage is licensed)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sz_units (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id       UUID NOT NULL REFERENCES public.sz_stages(id) ON DELETE RESTRICT,
  building_code  TEXT NOT NULL DEFAULT '',
  floor          TEXT NOT NULL DEFAULT '',
  unit_code      TEXT NOT NULL,
  licensed_area  NUMERIC(14,4) NOT NULL DEFAULT 0,
  notes          TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sz_units_stage ON public.sz_units(stage_id);

ALTER TABLE public.sz_units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sr_sz_units"        ON public.sz_units;
DROP POLICY IF EXISTS "auth_read_sz_units" ON public.sz_units;
CREATE POLICY "sr_sz_units"        ON public.sz_units FOR ALL    TO service_role  USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_sz_units" ON public.sz_units FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 8. sz_unit_allocations — many-to-many: contracts <-> units
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sz_unit_allocations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id        UUID NOT NULL REFERENCES public.sz_units(id) ON DELETE CASCADE,
  contract_id    UUID NOT NULL REFERENCES public.sz_investor_contracts(id) ON DELETE CASCADE,
  allocated_sqm  NUMERIC(14,4) NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sz_unit_alloc_unit     ON public.sz_unit_allocations(unit_id);
CREATE INDEX IF NOT EXISTS idx_sz_unit_alloc_contract ON public.sz_unit_allocations(contract_id);

ALTER TABLE public.sz_unit_allocations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sr_sz_unit_alloc"        ON public.sz_unit_allocations;
DROP POLICY IF EXISTS "auth_read_sz_unit_alloc" ON public.sz_unit_allocations;
CREATE POLICY "sr_sz_unit_alloc"        ON public.sz_unit_allocations FOR ALL    TO service_role  USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_sz_unit_alloc" ON public.sz_unit_allocations FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 9. sz_area_reconciliations — settlement when assumed sqm != real unit sqm
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sz_area_reconciliations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id   UUID NOT NULL REFERENCES public.sz_investor_contracts(id) ON DELETE CASCADE,
  unit_id       UUID REFERENCES public.sz_units(id) ON DELETE SET NULL,
  assumed_area  NUMERIC(14,4) NOT NULL DEFAULT 0,
  actual_area   NUMERIC(14,4) NOT NULL DEFAULT 0,
  price_used    NUMERIC(14,2) NOT NULL DEFAULT 0,
  -- positive = investor owes more, negative = credit owed to investor
  delta_amount  NUMERIC(14,2) NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'PENDING'
                  CHECK (status IN ('PENDING', 'SETTLED')),
  notes         TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sz_reconciliation_contract ON public.sz_area_reconciliations(contract_id);

ALTER TABLE public.sz_area_reconciliations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sr_sz_reconciliation"        ON public.sz_area_reconciliations;
DROP POLICY IF EXISTS "auth_read_sz_reconciliation" ON public.sz_area_reconciliations;
CREATE POLICY "sr_sz_reconciliation"        ON public.sz_area_reconciliations FOR ALL    TO service_role  USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_sz_reconciliation" ON public.sz_area_reconciliations FOR SELECT TO authenticated USING (true);

-- Now that sz_area_reconciliations exists, link treasury settlements back to it.
ALTER TABLE public.sz_treasury_transactions
  ADD COLUMN IF NOT EXISTS reconciliation_id UUID REFERENCES public.sz_area_reconciliations(id) ON DELETE SET NULL;

-- ============================================================
-- 10. sz_stage_installment_templates — default payment schedule per stage
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sz_stage_installment_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id     UUID NOT NULL REFERENCES public.sz_stages(id) ON DELETE CASCADE,
  seq          INT NOT NULL DEFAULT 1,
  label        TEXT NOT NULL DEFAULT '',
  percentage   NUMERIC(5,2) NOT NULL DEFAULT 0,
  offset_days  INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sz_installment_tmpl_stage ON public.sz_stage_installment_templates(stage_id);

ALTER TABLE public.sz_stage_installment_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sr_sz_installment_tmpl"        ON public.sz_stage_installment_templates;
DROP POLICY IF EXISTS "auth_read_sz_installment_tmpl" ON public.sz_stage_installment_templates;
CREATE POLICY "sr_sz_installment_tmpl"        ON public.sz_stage_installment_templates FOR ALL    TO service_role  USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_sz_installment_tmpl" ON public.sz_stage_installment_templates FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 11. sz_contract_installments — actual schedule per contract
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sz_contract_installments (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id               UUID NOT NULL REFERENCES public.sz_investor_contracts(id) ON DELETE CASCADE,
  seq                       INT NOT NULL DEFAULT 1,
  label                     TEXT NOT NULL DEFAULT '',
  due_date                  DATE NOT NULL DEFAULT CURRENT_DATE,
  amount                    NUMERIC(14,2) NOT NULL DEFAULT 0,
  status                    TEXT NOT NULL DEFAULT 'PENDING'
                              CHECK (status IN ('PENDING', 'PAID')),
  paid_treasury_transaction_id UUID REFERENCES public.sz_treasury_transactions(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sz_contract_installments_contract ON public.sz_contract_installments(contract_id);

ALTER TABLE public.sz_contract_installments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sr_sz_contract_installments"        ON public.sz_contract_installments;
DROP POLICY IF EXISTS "auth_read_sz_contract_installments" ON public.sz_contract_installments;
CREATE POLICY "sr_sz_contract_installments"        ON public.sz_contract_installments FOR ALL    TO service_role  USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_sz_contract_installments" ON public.sz_contract_installments FOR SELECT TO authenticated USING (true);

-- ============================================================
-- Done ✓
-- ============================================================
SELECT 'Migration 006 (multi-stage engine) applied successfully ✓' AS result;
