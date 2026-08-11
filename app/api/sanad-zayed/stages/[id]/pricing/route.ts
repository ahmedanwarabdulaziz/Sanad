import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── GET /api/sanad-zayed/stages/[id]/pricing ────────────────────────────
// Returns the 3 price/meter benchmarks for a stage:
//  - price_actual: cost/meter from actually-paid expenses allocated to this stage
//  - price_actual_plus_expected: the above + pending (unconverted) budget items
//  - investor_price: the manually-set selling price (stage.base_unit_price)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth("viewer");
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;

    const { data: stage, error: stageError } = await supabase
      .from("sz_stages")
      .select("id, name, base_unit_price, target_sellable_area")
      .eq("id", id)
      .single();

    if (stageError || !stage) {
      return NextResponse.json({ error: "المرحلة غير موجودة" }, { status: 404 });
    }

    const { data: allocations, error: allocError } = await supabase
      .from("sz_expense_allocations")
      .select("percentage, expense:expense_id(actual_paid_amount)")
      .eq("stage_id", id);

    if (allocError) throw allocError;

    const actualCost = (allocations ?? []).reduce((sum, a: any) => {
      const paid = Number(a.expense?.actual_paid_amount) || 0;
      return sum + paid * (Number(a.percentage) / 100);
    }, 0);

    const { data: budgetItems, error: budgetError } = await supabase
      .from("sz_stage_budget_items")
      .select("amount")
      .eq("stage_id", id)
      .eq("status", "PENDING");

    if (budgetError) throw budgetError;

    const pendingBudgetTotal = (budgetItems ?? []).reduce((sum, b) => sum + Number(b.amount), 0);
    const expectedCost = actualCost + pendingBudgetTotal;

    const area = Number(stage.target_sellable_area);
    const priceActual = area > 0 ? actualCost / area : 0;
    const priceActualPlusExpected = area > 0 ? expectedCost / area : 0;
    const investorPrice = Number(stage.base_unit_price);

    return NextResponse.json({
      stage_id: stage.id,
      stage_name: stage.name,
      target_sellable_area: area,
      actual_cost: actualCost,
      expected_cost: expectedCost,
      price_actual: priceActual,
      price_actual_plus_expected: priceActualPlusExpected,
      investor_price: investorPrice,
      below_cost_warning: investorPrice < priceActualPlusExpected,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}
