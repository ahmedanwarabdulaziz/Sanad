import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── PATCH /api/sanad-zayed/stage-budget-items/[id] ──────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();

    const { data: existing } = await supabase.from("sz_stage_budget_items").select("status").eq("id", id).single();
    if (existing?.status === "CONVERTED") {
      return NextResponse.json({ error: "لا يمكن تعديل بند تم تحويله إلى مصروف فعلي" }, { status: 409 });
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.description !== undefined) update.description = (body.description as string).trim();
    if (body.category !== undefined) update.category = (body.category as string)?.trim() || "";
    if (body.amount !== undefined) update.amount = Number(body.amount);
    if (body.notes !== undefined) update.notes = (body.notes as string)?.trim() || "";

    const { data, error } = await supabase
      .from("sz_stage_budget_items")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ budget_item: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}

// ── DELETE /api/sanad-zayed/stage-budget-items/[id] ──────────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;

    const { data: existing } = await supabase.from("sz_stage_budget_items").select("status").eq("id", id).single();
    if (existing?.status === "CONVERTED") {
      return NextResponse.json({ error: "لا يمكن حذف بند تم تحويله إلى مصروف فعلي" }, { status: 409 });
    }

    const { error } = await supabase.from("sz_stage_budget_items").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ message: "تم حذف البند" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}
