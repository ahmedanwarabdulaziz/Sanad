import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── GET /api/sanad-zayed/units?stage_id=... ─────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await requireAuth("viewer");
  if ("error" in auth) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const stageId = searchParams.get("stage_id");

    let query = supabase
      .from("sz_units")
      .select("*, stage:stage_id(name), allocations:sz_unit_allocations(id, contract_id, allocated_sqm, contract:contract_id(investor_id, investor:investor_id(name)))")
      .order("sort_order", { ascending: true })
      .order("building_code", { ascending: true });

    if (stageId) query = query.eq("stage_id", stageId);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ units: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}

// ── POST /api/sanad-zayed/units ──────────────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const { stage_id, building_code, floor, unit_code, licensed_area, notes } = body;

    if (!stage_id) return NextResponse.json({ error: "المرحلة مطلوبة" }, { status: 422 });
    if (!unit_code || !unit_code.trim()) return NextResponse.json({ error: "كود الوحدة مطلوب" }, { status: 422 });
    if (!licensed_area || Number(licensed_area) <= 0) return NextResponse.json({ error: "مساحة الوحدة غير صحيحة" }, { status: 422 });

    const { data: last } = await supabase
      .from("sz_units")
      .select("sort_order")
      .eq("stage_id", stage_id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextSortOrder = (last?.sort_order ?? -1) + 1;

    const { data, error } = await supabase
      .from("sz_units")
      .insert({
        stage_id,
        building_code: building_code?.trim() || "",
        floor: floor?.trim() || "",
        unit_code: unit_code.trim(),
        licensed_area: Number(licensed_area),
        notes: notes?.trim() || "",
        sort_order: nextSortOrder,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ unit: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}
