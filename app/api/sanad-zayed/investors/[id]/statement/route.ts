import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── GET /api/sanad-zayed/investors/[id]/statement ──────────────────────────
// Assembles everything a PDF statement needs: investor info, contracts, full
// ledger history, and — per stage the investor has a contract in — the cost
// line items using the investor-facing override (description/amount) where
// set, and excluding anything flagged hide_from_investor.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth("viewer");
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;

    const { data: investor, error: invErr } = await supabase.from("sz_investors").select("*").eq("id", id).single();
    if (invErr || !investor) return NextResponse.json({ error: "المستثمر غير موجود" }, { status: 404 });

    const { data: contracts, error: cErr } = await supabase
      .from("sz_investor_contracts")
      .select("*, stage:stage_id(id, name, base_unit_price)")
      .eq("investor_id", id);
    if (cErr) throw cErr;

    const contractIds = (contracts ?? []).map(c => c.id);
    const stageIds = Array.from(new Set((contracts ?? []).map(c => c.stage_id)));

    const { data: transactions, error: tErr } = await supabase
      .from("sz_treasury_transactions")
      .select("*")
      .eq("investor_id", id)
      .order("transaction_date", { ascending: true });
    if (tErr) throw tErr;

    let reconciliations: any[] = [];
    if (contractIds.length > 0) {
      const { data } = await supabase.from("sz_area_reconciliations").select("*").in("contract_id", contractIds);
      reconciliations = data ?? [];
    }

    const stageCostBreakdown: Record<string, any[]> = {};
    if (stageIds.length > 0) {
      const { data: allocations } = await supabase
        .from("sz_expense_allocations")
        .select("stage_id, percentage, expense:expense_id(description, allocated_cost, hide_from_investor, investor_override_description, investor_override_amount)")
        .in("stage_id", stageIds);

      for (const stageId of stageIds) {
        stageCostBreakdown[stageId] = (allocations ?? [])
          .filter((a: any) => a.stage_id === stageId && !a.expense?.hide_from_investor)
          .map((a: any) => ({
            description: a.expense?.investor_override_description || a.expense?.description,
            amount: (a.expense?.investor_override_amount ?? a.expense?.allocated_cost ?? 0) * (Number(a.percentage) / 100),
          }));
      }
    }

    const totalDeposits = (transactions ?? []).filter(t => t.transaction_type === "DEPOSIT").reduce((sum, t) => sum + Number(t.amount), 0);
    const totalWithdrawals = (transactions ?? []).filter(t => t.transaction_type === "WITHDRAWAL").reduce((sum, t) => sum + Number(t.amount), 0);
    const totalContractDues = (contracts ?? []).filter(c => c.status === "ACTIVE").reduce((sum, c) => sum + Number(c.total_contract_value), 0);
    const totalReconciliationDelta = reconciliations.reduce((sum, r) => sum + Number(r.delta_amount), 0);
    const balance = totalDeposits - totalWithdrawals - totalContractDues - totalReconciliationDelta;

    return NextResponse.json({
      investor,
      contracts,
      transactions,
      reconciliations,
      stage_cost_breakdown: stageCostBreakdown,
      balance,
      total_deposits: totalDeposits,
      total_withdrawals: totalWithdrawals,
      total_contract_dues: totalContractDues,
      total_reconciliation_delta: totalReconciliationDelta,
      generated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}
