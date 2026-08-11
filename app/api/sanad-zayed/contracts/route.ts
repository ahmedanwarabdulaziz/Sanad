import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function validateContract(body: Record<string, unknown>) {
  const errors: Record<string, string> = {};

  if (!body.investor_id || typeof body.investor_id !== "string") {
    errors.investor_id = "المستثمر مطلوب";
  }
  if (!body.stage_id || typeof body.stage_id !== "string") {
    errors.stage_id = "المرحلة مطلوبة";
  }
  if (!body.unit_quantity || Number(body.unit_quantity) <= 0) {
    errors.unit_quantity = "المساحة يجب أن تكون أكبر من صفر";
  }
  if (body.unit_price_at_contract === undefined || Number(body.unit_price_at_contract) <= 0) {
    errors.unit_price_at_contract = "سعر المتر يجب أن يكون أكبر من صفر";
  }

  return errors;
}

// ── GET /api/sanad-zayed/contracts ────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await requireAuth("viewer");
  if ("error" in auth) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const investorId = searchParams.get("investor_id");
    const stageId = searchParams.get("stage_id");

    let query = supabase
      .from("sz_investor_contracts")
      .select(`*, investor:investor_id(name), stage:stage_id(name, base_unit_price, pricing_status), linked_contract:linked_contract_id(id, unit_price_at_contract, stage:stage_id(name))`)
      .order("contract_date", { ascending: false });

    if (investorId) query = query.eq("investor_id", investorId);
    if (stageId) query = query.eq("stage_id", stageId);

    const { data: contracts, error } = await query;
    if (error) throw error;

    return NextResponse.json({ contracts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}

// ── POST /api/sanad-zayed/contracts ───────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();

    const errors = validateContract(body);
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 422 });
    }

    const { data: stage, error: stageError } = await supabase
      .from("sz_stages")
      .select("id, status, target_sellable_area")
      .eq("id", body.stage_id)
      .single();

    if (stageError || !stage) {
      return NextResponse.json({ error: "المرحلة غير موجودة" }, { status: 404 });
    }
    if (stage.status === "CLOSED") {
      return NextResponse.json({ error: "لا يمكن إضافة مستثمرين — المرحلة مغلقة" }, { status: 422 });
    }

    // Sold-area cap: can't sell past this stage's target_sellable_area.
    const { data: existingContracts } = await supabase
      .from("sz_investor_contracts")
      .select("unit_quantity")
      .eq("stage_id", body.stage_id)
      .eq("status", "ACTIVE");

    const soldSoFar = (existingContracts ?? []).reduce((sum, c) => sum + Number(c.unit_quantity), 0);
    const requestedArea = Number(body.unit_quantity);

    if (soldSoFar + requestedArea > Number(stage.target_sellable_area)) {
      return NextResponse.json(
        {
          error: `المساحة المطلوبة تتجاوز المساحة القابلة للبيع في هذه المرحلة. المتاح حالياً: ${(
            Number(stage.target_sellable_area) - soldSoFar
          ).toFixed(2)} م²`,
        },
        { status: 422 }
      );
    }

    const managementFeePct = Number(body.management_fee_pct) || 0;
    const unitPrice = Number(body.unit_price_at_contract);
    const totalContractValue = requestedArea * unitPrice * (1 + managementFeePct / 100);

    // Carry-over pricing: a later-stage contract can link back to an earlier-stage
    // contract for the same investor/unit (their locked price carries over), or
    // record a manually-entered prior-stage price for a brand-new investor. Purely
    // for traceability/display — total_contract_value is still driven by
    // unit_price_at_contract above, which the UI pre-fills as the suggested sum.
    let linkedContractId: string | null = null;
    if (body.linked_contract_id) {
      const { data: linked, error: linkedError } = await supabase
        .from("sz_investor_contracts")
        .select("id")
        .eq("id", body.linked_contract_id)
        .eq("investor_id", body.investor_id)
        .single();
      if (linkedError || !linked) {
        return NextResponse.json({ error: "العقد المرتبط غير صالح" }, { status: 422 });
      }
      linkedContractId = linked.id;
    }
    const priorStagePrice = Number(body.prior_stage_price) || 0;

    const { data, error } = await supabase
      .from("sz_investor_contracts")
      .insert({
        investor_id: body.investor_id,
        stage_id: body.stage_id,
        unit_quantity: requestedArea,
        unit_price_at_contract: unitPrice,
        management_fee_pct: managementFeePct,
        total_contract_value: totalContractValue,
        contract_date: body.contract_date || new Date().toISOString().split("T")[0],
        notes: (body.notes as string)?.trim() ?? "",
        status: "ACTIVE",
        linked_contract_id: linkedContractId,
        prior_stage_price: priorStagePrice,
      })
      .select(`*, investor:investor_id(name), stage:stage_id(name)`)
      .single();

    if (error) throw error;

    return NextResponse.json({ contract: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}
