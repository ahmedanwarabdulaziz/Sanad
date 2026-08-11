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
    const priceExpectedOnly = area > 0 ? pendingBudgetTotal / area : 0;
    const priceActualPlusExpected = area > 0 ? expectedCost / area : 0;
    const investorPrice = Number(stage.base_unit_price);
    const costDifferencePerMeter = investorPrice - priceActualPlusExpected;

    // Sold area + investor money (contract value, collected vs. not-yet-collected) for this stage.
    const { data: contracts, error: contractsError } = await supabase
      .from("sz_investor_contracts")
      .select("id, investor_id, unit_quantity, total_contract_value")
      .eq("stage_id", id)
      .eq("status", "ACTIVE");

    if (contractsError) throw contractsError;

    const soldArea = (contracts ?? []).reduce((sum, c) => sum + Number(c.unit_quantity), 0);
    const soldValueInvestor = (contracts ?? []).reduce((sum, c) => sum + Number(c.total_contract_value), 0);
    const remainingArea = area - soldArea;

    // Collected: deposits aren't always linked to a contract_id (e.g. a general
    // wallet deposit made via the Treasury page before/without picking a contract),
    // so we can't just filter treasury transactions by contract_id. Instead, for each
    // investor selling in this stage we take their net cash (DEPOSIT − WITHDRAWAL)
    // across ALL their transactions, cap it at what they actually owe in total (across
    // every stage they've contracted in), then attribute a share of that to this stage
    // proportional to this stage's portion of their total contract value.
    const investorIds = Array.from(new Set((contracts ?? []).map((c) => c.investor_id)));
    let collected = 0;
    if (investorIds.length > 0) {
      const { data: allContracts, error: allContractsError } = await supabase
        .from("sz_investor_contracts")
        .select("investor_id, stage_id, total_contract_value")
        .in("investor_id", investorIds)
        .eq("status", "ACTIVE");
      if (allContractsError) throw allContractsError;

      const totalDuesByInvestor = new Map<string, number>();
      const stageDuesByInvestor = new Map<string, number>();
      for (const c of allContracts ?? []) {
        totalDuesByInvestor.set(c.investor_id, (totalDuesByInvestor.get(c.investor_id) ?? 0) + Number(c.total_contract_value));
        if (c.stage_id === id) {
          stageDuesByInvestor.set(c.investor_id, (stageDuesByInvestor.get(c.investor_id) ?? 0) + Number(c.total_contract_value));
        }
      }

      const { data: transactions, error: txError } = await supabase
        .from("sz_treasury_transactions")
        .select("amount, transaction_type, investor_id")
        .in("investor_id", investorIds)
        .in("transaction_type", ["DEPOSIT", "WITHDRAWAL"]);
      if (txError) throw txError;

      const netByInvestor = new Map<string, number>();
      for (const t of transactions ?? []) {
        const amt = Number(t.amount) || 0;
        const delta = t.transaction_type === "DEPOSIT" ? amt : -amt;
        netByInvestor.set(t.investor_id, (netByInvestor.get(t.investor_id) ?? 0) + delta);
      }

      for (const invId of investorIds) {
        const totalDues = totalDuesByInvestor.get(invId) ?? 0;
        const thisStageDues = stageDuesByInvestor.get(invId) ?? 0;
        if (totalDues <= 0 || thisStageDues <= 0) continue;
        const net = Math.max(0, netByInvestor.get(invId) ?? 0);
        const investorCollected = Math.min(net, totalDues);
        collected += investorCollected * (thisStageDues / totalDues);
      }
    }
    const notCollected = soldValueInvestor - collected;

    // Company profit: realized (cash collected so far minus cash actually spent)
    // and predicted (full-stage revenue projection minus full-stage cost projection).
    const actualProfitSoFar = collected - actualCost;
    const totalRevenueProjection = soldValueInvestor + remainingArea * investorPrice;
    const predictedTotalProfit = totalRevenueProjection - expectedCost;

    // Discrete licensed units (sz_units) registered for this stage — separate from the
    // raw meter figures above. A unit only exists once real building/floor/unit codes
    // are known (typically after licensing); allocations link it to the contract(s)
    // that claim its area.
    const { data: units, error: unitsError } = await supabase
      .from("sz_units")
      .select("id, licensed_area, allocations:sz_unit_allocations(allocated_sqm)")
      .eq("stage_id", id);
    if (unitsError) throw unitsError;

    let fullyAllocatedCount = 0;
    let partiallyAllocatedCount = 0;
    let unallocatedCount = 0;
    let totalLicensedArea = 0;
    for (const u of units ?? []) {
      const licensed = Number(u.licensed_area) || 0;
      const allocated = (u.allocations ?? []).reduce((sum: number, a: any) => sum + (Number(a.allocated_sqm) || 0), 0);
      totalLicensedArea += licensed;
      if (allocated <= 0) unallocatedCount++;
      else if (allocated >= licensed - 0.01) fullyAllocatedCount++;
      else partiallyAllocatedCount++;
    }

    return NextResponse.json({
      stage_id: stage.id,
      stage_name: stage.name,
      target_sellable_area: area,
      sold_area: soldArea,
      remaining_area: remainingArea,
      actual_cost: actualCost,
      expected_cost: expectedCost,
      price_actual: priceActual,
      price_expected_only: priceExpectedOnly,
      price_actual_plus_expected: priceActualPlusExpected,
      investor_price: investorPrice,
      cost_difference_per_meter: costDifferencePerMeter,
      below_cost_warning: investorPrice < priceActualPlusExpected,

      // Money breakdown by area bucket, at both investor price and cost price.
      // total_area_value_investor is NOT area * investorPrice: each sold contract
      // locked its own per-meter price (varies investor to investor), so the total
      // must be the real sum of sold contract values plus the remaining (unsold)
      // area projected at today's price — matching sold + remaining exactly.
      total_area_value_investor: soldValueInvestor + remainingArea * investorPrice,
      total_area_value_cost: area * priceActualPlusExpected,
      sold_area_value_investor: soldValueInvestor,
      sold_area_value_cost: soldArea * priceActualPlusExpected,
      remaining_area_value_investor: remainingArea * investorPrice,
      remaining_area_value_cost: remainingArea * priceActualPlusExpected,
      collected,
      not_collected: notCollected,

      actual_profit_so_far: actualProfitSoFar,
      predicted_total_profit: predictedTotalProfit,

      unit_count: (units ?? []).length,
      units_fully_allocated: fullyAllocatedCount,
      units_partially_allocated: partiallyAllocatedCount,
      units_unallocated: unallocatedCount,
      units_total_licensed_area: totalLicensedArea,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}
