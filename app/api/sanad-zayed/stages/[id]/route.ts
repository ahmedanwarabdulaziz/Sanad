import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

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

  return errors;
}

// ── PATCH /api/sanad-zayed/stages/[id] ────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();

    const errors = validateStage(body);
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 422 });
    }

    const { data, error } = await supabase
      .from("sz_stages")
      .update({
        name: (body.name as string).trim(),
        description: (body.description as string)?.trim() ?? "",
        unit_type: body.unit_type,
        base_unit_price: Number(body.base_unit_price) || 0,
        management_fee_pct: Number(body.management_fee_pct) || 0,
        status: body.status,
        pricing_status: body.pricing_status,
        target_sellable_area: Number(body.target_sellable_area) || 0,
        typical_unit_area: Number(body.typical_unit_area) || 0,
        sort_order: Number(body.sort_order) || 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ stage: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}

// ── DELETE /api/sanad-zayed/stages/[id] ───────────────────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth("admin");
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;

    const { error } = await supabase.from("sz_stages").delete().eq("id", id);

    if (error) {
      if (error.code === "23503") {
        return NextResponse.json(
          { error: "لا يمكن حذف مرحلة مرتبطة بعقود مستثمرين أو مصروفات" },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ message: "تم حذف المرحلة بنجاح" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}
