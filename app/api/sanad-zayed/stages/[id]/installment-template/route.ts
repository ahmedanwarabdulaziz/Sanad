import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── GET /api/sanad-zayed/stages/[id]/installment-template ────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth("viewer");
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from("sz_stage_installment_templates")
      .select("*")
      .eq("stage_id", id)
      .order("seq", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ template: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}

// ── PUT /api/sanad-zayed/stages/[id]/installment-template ────────────────
// Replaces the full default schedule. Body: { rows: [{ label, percentage, offset_days }] }
// Percentages must sum to 100.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const rows: { label: string; percentage: number; offset_days: number }[] = body.rows ?? [];

    if (rows.length > 0) {
      const total = rows.reduce((sum, r) => sum + Number(r.percentage), 0);
      if (Math.abs(total - 100) > 0.01) {
        return NextResponse.json({ error: `مجموع نسب الدفعات يجب أن يكون 100% (الحالي: ${total}%)` }, { status: 422 });
      }
    }

    const { error: deleteError } = await supabase.from("sz_stage_installment_templates").delete().eq("stage_id", id);
    if (deleteError) throw deleteError;

    if (rows.length === 0) return NextResponse.json({ template: [] });

    const { data, error } = await supabase
      .from("sz_stage_installment_templates")
      .insert(rows.map((r, i) => ({
        stage_id: id,
        seq: i + 1,
        label: r.label?.trim() || `دفعة ${i + 1}`,
        percentage: Number(r.percentage),
        offset_days: Number(r.offset_days) || 0,
      })))
      .select();

    if (error) throw error;

    return NextResponse.json({ template: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}
