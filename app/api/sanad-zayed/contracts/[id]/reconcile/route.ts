import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── GET /api/sanad-zayed/contracts/[id]/reconcile ────────────────────────
// Preview: what the reconciliation delta would be right now, based on the
// unit allocations recorded so far, plus any reconciliation already created.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth("viewer");
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;

    const { data: contract, error: cErr } = await supabase
      .from("sz_investor_contracts")
      .select("id, unit_quantity, unit_price_at_contract")
      .eq("id", id)
      .single();

    if (cErr || !contract) return NextResponse.json({ error: "العقد غير موجود" }, { status: 404 });

    const { data: allocations } = await supabase
      .from("sz_unit_allocations")
      .select("allocated_sqm, unit:unit_id(id, unit_code, building_code)")
      .eq("contract_id", id);

    const actualArea = (allocations ?? []).reduce((sum, a) => sum + Number(a.allocated_sqm), 0);
    const assumedArea = Number(contract.unit_quantity);
    const deltaAmount = (actualArea - assumedArea) * Number(contract.unit_price_at_contract);

    const { data: existingReconciliation } = await supabase
      .from("sz_area_reconciliations")
      .select("*")
      .eq("contract_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      assumed_area: assumedArea,
      actual_area: actualArea,
      price_used: Number(contract.unit_price_at_contract),
      delta_amount: deltaAmount,
      units: allocations,
      existing_reconciliation: existingReconciliation ?? null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}

// ── POST /api/sanad-zayed/contracts/[id]/reconcile ───────────────────────
// Finalizes the area reconciliation for a contract based on its unit
// allocations so far. Positive delta = investor owes more; negative = credit.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;

    const { data: contract, error: cErr } = await supabase
      .from("sz_investor_contracts")
      .select("id, unit_quantity, unit_price_at_contract")
      .eq("id", id)
      .single();

    if (cErr || !contract) return NextResponse.json({ error: "العقد غير موجود" }, { status: 404 });

    const { data: allocations, error: allocErr } = await supabase
      .from("sz_unit_allocations")
      .select("allocated_sqm, unit_id")
      .eq("contract_id", id);

    if (allocErr) throw allocErr;
    if (!allocations || allocations.length === 0) {
      return NextResponse.json({ error: "لا توجد وحدات مخصصة لهذا العقد بعد" }, { status: 422 });
    }

    const actualArea = allocations.reduce((sum, a) => sum + Number(a.allocated_sqm), 0);
    const assumedArea = Number(contract.unit_quantity);
    const priceUsed = Number(contract.unit_price_at_contract);
    const deltaAmount = (actualArea - assumedArea) * priceUsed;

    // No difference means nothing to collect or refund — record it as already
    // settled so it never shows up as a pending action on the investor page.
    const noDifference = Math.abs(deltaAmount) < 0.01;

    const { data, error } = await supabase
      .from("sz_area_reconciliations")
      .insert({
        contract_id: id,
        unit_id: allocations[0].unit_id,
        assumed_area: assumedArea,
        actual_area: actualArea,
        price_used: priceUsed,
        delta_amount: deltaAmount,
        status: noDifference ? "SETTLED" : "PENDING",
        settled_at: noDifference ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ reconciliation: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}
