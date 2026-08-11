import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Sanad owns half of the 4771.5 sqm plot; the other half belongs to Empire and is out of scope.
// This is informational only (e.g. for a land-ownership reference figure) — it is NOT a ceiling
// on target_sellable_area. Once a stage sells apartment/unit meters instead of land meters, the
// real sellable area is a multiple of the land footprint (basement + repeated floors stacked on
// the same land), so it can legitimately exceed this number many times over.
export const PROJECT_SELLABLE_AREA_CAP = 4771.5 / 2;

function validateStage(body: Record<string, unknown>) {
  const errors: Record<string, string> = {};

  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    errors.name = "اسم المرحلة مطلوب";
  }

  if (body.unit_type && !["LAND_METER", "APARTMENT_METER"].includes(body.unit_type as string)) {
    errors.unit_type = "نوع الوحدة غير صالح";
  }

  if (body.status && !["PLANNING", "OPEN", "CLOSED"].includes(body.status as string)) {
    errors.status = "حالة المرحلة غير صالحة";
  }

  if (body.pricing_status && !["ESTIMATED", "LICENSED"].includes(body.pricing_status as string)) {
    errors.pricing_status = "حالة التسعير غير صالحة";
  }

  if (body.target_sellable_area !== undefined && Number(body.target_sellable_area) < 0) {
    errors.target_sellable_area = "المساحة القابلة للبيع غير صالحة";
  }

  if (body.base_unit_price !== undefined && Number(body.base_unit_price) < 0) {
    errors.base_unit_price = "سعر المتر غير صالح";
  }

  return errors;
}

// ── GET /api/sanad-zayed/stages ───────────────────────────────────────
export async function GET() {
  const auth = await requireAuth("viewer");
  if ("error" in auth) return auth.error;

  try {
    const { data: stages, error } = await supabase
      .from("sz_stages")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) throw error;

    // Sold area so far per stage, used by the UI to show remaining capacity against target_sellable_area.
    const { data: contracts } = await supabase
      .from("sz_investor_contracts")
      .select("stage_id, unit_quantity")
      .eq("status", "ACTIVE");

    const soldByStage = new Map<string, number>();
    for (const c of contracts ?? []) {
      soldByStage.set(c.stage_id, (soldByStage.get(c.stage_id) ?? 0) + Number(c.unit_quantity));
    }

    const stagesWithSold = (stages ?? []).map((s) => ({
      ...s,
      sold_area: soldByStage.get(s.id) ?? 0,
    }));

    const totalTargetArea = (stages ?? []).reduce((sum, s) => sum + Number(s.target_sellable_area), 0);

    return NextResponse.json({
      stages: stagesWithSold,
      project_sellable_area_cap: PROJECT_SELLABLE_AREA_CAP,
      total_target_area: totalTargetArea,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}

// ── POST /api/sanad-zayed/stages ──────────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();

    const errors = validateStage(body);
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 422 });
    }

    const { data, error } = await supabase
      .from("sz_stages")
      .insert({
        name: (body.name as string).trim(),
        description: (body.description as string)?.trim() ?? "",
        unit_type: body.unit_type ?? "LAND_METER",
        base_unit_price: Number(body.base_unit_price) || 0,
        management_fee_pct: Number(body.management_fee_pct) || 0,
        status: body.status ?? "PLANNING",
        pricing_status: body.pricing_status ?? "ESTIMATED",
        target_sellable_area: Number(body.target_sellable_area) || 0,
        typical_unit_area: Number(body.typical_unit_area) || 0,
        sort_order: Number(body.sort_order) || 0,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ stage: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}
