import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── GET /api/sanad-zayed/stage-budget-items?stage_id=... ───────────────
export async function GET(request: NextRequest) {
  const auth = await requireAuth("viewer");
  if ("error" in auth) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const stageId = searchParams.get("stage_id");

    let query = supabase
      .from("sz_stage_budget_items")
      .select("*, linked_expense:linked_expense_id(id, description, actual_paid_amount)")
      .order("created_at", { ascending: false });

    if (stageId) query = query.eq("stage_id", stageId);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ budget_items: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}

// ── POST /api/sanad-zayed/stage-budget-items ────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const { stage_id, description, category, amount, notes } = body;

    if (!stage_id) return NextResponse.json({ error: "المرحلة مطلوبة" }, { status: 422 });
    if (!description || !description.trim()) return NextResponse.json({ error: "وصف البند مطلوب" }, { status: 422 });
    if (!amount || Number(amount) <= 0) return NextResponse.json({ error: "المبلغ المتوقع غير صحيح" }, { status: 422 });

    const { data, error } = await supabase
      .from("sz_stage_budget_items")
      .insert({
        stage_id,
        description: description.trim(),
        category: category?.trim() || "",
        amount: Number(amount),
        notes: notes?.trim() || "",
        status: "PENDING",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ budget_item: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}
