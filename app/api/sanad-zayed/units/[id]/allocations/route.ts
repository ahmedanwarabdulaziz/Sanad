import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── GET /api/sanad-zayed/units/[id]/allocations ─────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth("viewer");
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from("sz_unit_allocations")
      .select("*, contract:contract_id(investor_id, unit_quantity, investor:investor_id(name))")
      .eq("unit_id", id);

    if (error) throw error;
    return NextResponse.json({ allocations: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}

// ── POST /api/sanad-zayed/units/[id]/allocations ─────────────────────────
// Assigns (part of) a contract's purchased sqm to this specific physical unit.
// A unit can be shared by multiple contracts; one contract can span multiple units.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const { contract_id, allocated_sqm } = body;

    if (!contract_id) return NextResponse.json({ error: "العقد مطلوب" }, { status: 422 });
    if (!allocated_sqm || Number(allocated_sqm) <= 0) return NextResponse.json({ error: "المساحة المخصصة غير صحيحة" }, { status: 422 });

    const { data, error } = await supabase
      .from("sz_unit_allocations")
      .insert({ unit_id: id, contract_id, allocated_sqm: Number(allocated_sqm) })
      .select("*, contract:contract_id(investor_id, investor:investor_id(name))")
      .single();

    if (error) throw error;

    return NextResponse.json({ allocation: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}
