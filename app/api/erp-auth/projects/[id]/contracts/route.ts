import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET — list contracts for a project (across all stages)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get stage IDs for this project, then get contracts
    const { data: stages } = await supabase
      .from("project_stages")
      .select("id")
      .eq("project_id", id);

    const stageIds = (stages || []).map((s) => s.id);
    if (stageIds.length === 0) {
      return NextResponse.json({ contracts: [] });
    }

    const { data, error } = await supabase
      .from("investor_contracts")
      .select("*, investor:investors(*), stage:project_stages(stage_name)")
      .in("stage_id", stageIds)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ contracts: data });
  } catch {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

// POST — create a contract
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { investor_id, stage_id, unit_quantity, unit_price_at_contract, management_fee_pct, contract_date, notes, price_snapshot } = body;

    if (!investor_id || !stage_id || !unit_quantity || !unit_price_at_contract) {
      return NextResponse.json({ error: "جميع الحقول المطلوبة يجب ملؤها" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("investor_contracts")
      .insert({
        investor_id,
        stage_id,
        unit_quantity,
        unit_price_at_contract,
        management_fee_pct: management_fee_pct || 0,
        contract_date: contract_date || new Date().toISOString().split("T")[0],
        notes: notes || "",
        price_snapshot: price_snapshot || null,
      })
      .select("*, investor:investors(*), stage:project_stages(stage_name)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ contract: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
