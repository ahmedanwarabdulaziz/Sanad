import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── PATCH /api/sanad-zayed/units/[id]/allocations/[allocationId] ─────────
// Edits the sqm allocated to a contract on this unit (e.g. correcting a 30/70
// split to 35/65).
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; allocationId: string }> }
) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  try {
    const { id, allocationId } = await params;
    const body = await request.json();
    const { allocated_sqm } = body;

    if (!allocated_sqm || Number(allocated_sqm) <= 0) {
      return NextResponse.json({ error: "المساحة المخصصة غير صحيحة" }, { status: 422 });
    }

    const { data, error } = await supabase
      .from("sz_unit_allocations")
      .update({ allocated_sqm: Number(allocated_sqm) })
      .eq("id", allocationId)
      .eq("unit_id", id)
      .select("*, contract:contract_id(investor_id, investor:investor_id(name))")
      .single();

    if (error) throw error;

    return NextResponse.json({ allocation: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}

// ── DELETE /api/sanad-zayed/units/[id]/allocations/[allocationId] ────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; allocationId: string }> }
) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  try {
    const { id, allocationId } = await params;

    const { error } = await supabase
      .from("sz_unit_allocations")
      .delete()
      .eq("id", allocationId)
      .eq("unit_id", id);

    if (error) throw error;

    return NextResponse.json({ message: "تم إلغاء التخصيص" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}
