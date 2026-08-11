import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── GET /api/sanad-zayed/expenses/[id]/allocations ────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth("viewer");
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from("sz_expense_allocations")
      .select("*, stage:stage_id(name)")
      .eq("expense_id", id);

    if (error) throw error;
    return NextResponse.json({ allocations: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}

// ── PUT /api/sanad-zayed/expenses/[id]/allocations ─────────────────────
// Replaces the full stage split for this expense. Body: { allocations: [{ stage_id, percentage }] }
// Percentages must sum to 100, or pass an empty array to cancel the stage
// assignment entirely (the expense goes back to "unassigned").
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const allocations: { stage_id: string; percentage: number }[] = body.allocations ?? [];

    if (allocations.length > 0) {
      const totalPct = allocations.reduce((sum, a) => sum + Number(a.percentage), 0);
      if (Math.abs(totalPct - 100) > 0.01) {
        return NextResponse.json({ error: `مجموع النسب يجب أن يكون 100% (الحالي: ${totalPct}%)` }, { status: 422 });
      }

      const { data: expense } = await supabase
        .from("sz_expenses")
        .select("recoverable_investor_id")
        .eq("id", id)
        .single();

      if (expense?.recoverable_investor_id) {
        return NextResponse.json(
          { error: "لا يمكن التوزيع على مراحل — المصروف مرتبط باسترداد من مستثمر. ألغِ الربط أولاً" },
          { status: 422 }
        );
      }
    }

    const { error: deleteError } = await supabase.from("sz_expense_allocations").delete().eq("expense_id", id);
    if (deleteError) throw deleteError;

    if (allocations.length === 0) {
      return NextResponse.json({ allocations: [] });
    }

    const { data, error: insertError } = await supabase
      .from("sz_expense_allocations")
      .insert(allocations.map(a => ({ expense_id: id, stage_id: a.stage_id, percentage: Number(a.percentage) })))
      .select("*, stage:stage_id(name)");

    if (insertError) throw insertError;

    return NextResponse.json({ allocations: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}
