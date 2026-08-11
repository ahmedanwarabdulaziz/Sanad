import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── POST /api/sanad-zayed/area-reconciliations/[id]/settle ───────────────
// Collects the extra amount owed (positive delta) or refunds the credit
// (negative delta) via a real treasury transaction, then marks the
// reconciliation SETTLED.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const { financial_account_id } = body;

    const { data: reconciliation, error: rErr } = await supabase
      .from("sz_area_reconciliations")
      .select("*, contract:contract_id(investor_id)")
      .eq("id", id)
      .single();

    if (rErr || !reconciliation) return NextResponse.json({ error: "التسوية غير موجودة" }, { status: 404 });
    if (reconciliation.status === "SETTLED") return NextResponse.json({ error: "تمت تسوية هذا البند بالفعل" }, { status: 409 });

    const delta = Number(reconciliation.delta_amount);
    const investorId = (reconciliation as any).contract?.investor_id;

    if (delta !== 0 && !financial_account_id) {
      return NextResponse.json({ error: "يجب اختيار الخزينة/الحساب" }, { status: 422 });
    }

    if (delta > 0) {
      const { error: txError } = await supabase.from("sz_treasury_transactions").insert({
        transaction_type: "DEPOSIT",
        to_account_id: financial_account_id,
        amount: delta,
        description: "تسوية مساحة — دفعة فرق المساحة",
        investor_id: investorId,
        contract_id: reconciliation.contract_id,
        reason_type: "CONTRACT_PAYMENT",
        reconciliation_id: id,
      });
      if (txError) throw txError;
    } else if (delta < 0) {
      const { error: txError } = await supabase.from("sz_treasury_transactions").insert({
        transaction_type: "WITHDRAWAL",
        from_account_id: financial_account_id,
        amount: Math.abs(delta),
        description: "تسوية مساحة — استرداد فرق المساحة للمستثمر",
        investor_id: investorId,
        contract_id: reconciliation.contract_id,
        reason_type: "CREDIT_REFUND",
        reconciliation_id: id,
      });
      if (txError) throw txError;
    }

    const { data, error } = await supabase
      .from("sz_area_reconciliations")
      .update({ status: "SETTLED", settled_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ reconciliation: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}
