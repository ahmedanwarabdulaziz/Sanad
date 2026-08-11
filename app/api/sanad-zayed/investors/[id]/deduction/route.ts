import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── POST /api/sanad-zayed/investors/[id]/deduction ────────────────────────
// Records a personal service charged to one investor specifically (e.g. paperwork
// done on their behalf) — real cash out of the treasury AND a reduction of that
// investor's balance, with a reason + date so it's traceable later.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const { amount, financial_account_id, description, deduction_date } = body;

    if (!amount || Number(amount) <= 0) return NextResponse.json({ error: "المبلغ غير صحيح" }, { status: 422 });
    if (!financial_account_id) return NextResponse.json({ error: "يجب اختيار الخزينة/الحساب" }, { status: 422 });
    if (!description || !description.trim()) return NextResponse.json({ error: "سبب الخصم مطلوب" }, { status: 422 });

    const { data: investor } = await supabase.from("sz_investors").select("id").eq("id", id).single();
    if (!investor) return NextResponse.json({ error: "المستثمر غير موجود" }, { status: 404 });

    const { data, error } = await supabase
      .from("sz_treasury_transactions")
      .insert({
        transaction_type: "WITHDRAWAL",
        from_account_id: financial_account_id,
        amount: Number(amount),
        description: description.trim(),
        investor_id: id,
        reason_type: "PERSONAL_SERVICE_DEDUCTION",
        transaction_date: deduction_date || new Date().toISOString().split("T")[0],
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ transaction: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}
