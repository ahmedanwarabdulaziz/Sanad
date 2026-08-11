import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── GET /api/sanad-zayed/investors/[id]/ledger ──────────────────────────
// balance = deposits − withdrawals − active contract dues − reconciliation deltas
// (settlement of a reconciliation itself creates a deposit/withdrawal, so once
// settled the two entries cancel out and the balance returns to the correct figure).
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth("viewer");
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;

    const { data: contracts, error: cErr } = await supabase
      .from("sz_investor_contracts")
      .select("id, stage_id, unit_quantity, unit_price_at_contract, total_contract_value, contract_date, status, stage:stage_id(name)")
      .eq("investor_id", id);
    if (cErr) throw cErr;

    const contractIds = (contracts ?? []).map(c => c.id);

    const { data: transactions, error: tErr } = await supabase
      .from("sz_treasury_transactions")
      .select(`
        *,
        from_account:from_account_id(account_name),
        to_account:to_account_id(account_name),
        contract:contract_id(id, stage:stage_id(name)),
        expense:expense_id(id, description)
      `)
      .eq("investor_id", id)
      .order("transaction_date", { ascending: true });
    if (tErr) throw tErr;

    let reconciliations: any[] = [];
    if (contractIds.length > 0) {
      const { data, error: rErr } = await supabase
        .from("sz_area_reconciliations")
        .select("*, contract:contract_id(stage_id, stage:stage_id(name))")
        .in("contract_id", contractIds);
      if (rErr) throw rErr;
      reconciliations = data ?? [];
    }

    const totalDeposits = (transactions ?? []).filter(t => t.transaction_type === "DEPOSIT").reduce((sum, t) => sum + Number(t.amount), 0);
    const totalWithdrawals = (transactions ?? []).filter(t => t.transaction_type === "WITHDRAWAL").reduce((sum, t) => sum + Number(t.amount), 0);
    const totalContractDues = (contracts ?? []).filter(c => c.status === "ACTIVE").reduce((sum, c) => sum + Number(c.total_contract_value), 0);
    const totalReconciliationDelta = reconciliations.reduce((sum, r) => sum + Number(r.delta_amount), 0);

    const balance = totalDeposits - totalWithdrawals - totalContractDues - totalReconciliationDelta;

    return NextResponse.json({
      balance,
      total_deposits: totalDeposits,
      total_withdrawals: totalWithdrawals,
      total_contract_dues: totalContractDues,
      total_reconciliation_delta: totalReconciliationDelta,
      contracts,
      transactions,
      reconciliations,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}
