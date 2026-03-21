import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// PATCH — update contract
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contractId: string }> }
) {
  try {
    const { contractId } = await params;
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.unit_quantity !== undefined) updates.unit_quantity = Number(body.unit_quantity);
    if (body.unit_price_at_contract !== undefined) updates.unit_price_at_contract = Number(body.unit_price_at_contract);
    if (body.management_fee_pct !== undefined) updates.management_fee_pct = Number(body.management_fee_pct);
    if (body.status !== undefined) updates.status = body.status;
    if (body.notes !== undefined) updates.notes = body.notes;

    const { data, error } = await supabase
      .from("investor_contracts")
      .update(updates)
      .eq("id", contractId)
      .select("*, investor:investors(*), stage:project_stages(stage_name)")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ contract: data });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE — delete contract
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; contractId: string }> }
) {
  try {
    const { contractId } = await params;
    const { error } = await supabase
      .from("investor_contracts")
      .delete()
      .eq("id", contractId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
