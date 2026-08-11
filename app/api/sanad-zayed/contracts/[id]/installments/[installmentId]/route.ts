import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── PATCH /api/sanad-zayed/contracts/[id]/installments/[installmentId] ────
// Edits due_date/amount/label, or marks the installment PAID by creating the
// underlying treasury deposit (financial_account_id required when marking paid).
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; installmentId: string }> }
) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  try {
    const { id, installmentId } = await params;
    const body = await request.json();

    const { data: installment, error: iErr } = await supabase
      .from("sz_contract_installments")
      .select("*, contract:contract_id(investor_id)")
      .eq("id", installmentId)
      .eq("contract_id", id)
      .single();

    if (iErr || !installment) return NextResponse.json({ error: "الدفعة غير موجودة" }, { status: 404 });

    if (body.mark_paid) {
      if (installment.status === "PAID") return NextResponse.json({ error: "هذه الدفعة مسددة بالفعل" }, { status: 409 });
      if (!body.financial_account_id) return NextResponse.json({ error: "يجب اختيار الخزينة/الحساب" }, { status: 422 });

      const { data: tx, error: txError } = await supabase
        .from("sz_treasury_transactions")
        .insert({
          transaction_type: "DEPOSIT",
          to_account_id: body.financial_account_id,
          amount: installment.amount,
          description: `دفعة: ${installment.label}`,
          investor_id: (installment as any).contract?.investor_id,
          contract_id: id,
          reason_type: "CONTRACT_PAYMENT",
          transaction_date: body.paid_date || new Date().toISOString().split("T")[0],
        })
        .select()
        .single();

      if (txError) throw txError;

      const { data, error } = await supabase
        .from("sz_contract_installments")
        .update({ status: "PAID", paid_treasury_transaction_id: tx.id })
        .eq("id", installmentId)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ installment: data });
    }

    const update: Record<string, unknown> = {};
    if (body.label !== undefined) update.label = (body.label as string).trim();
    if (body.due_date !== undefined) update.due_date = body.due_date;
    if (body.amount !== undefined) update.amount = Number(body.amount);

    const { data, error } = await supabase
      .from("sz_contract_installments")
      .update(update)
      .eq("id", installmentId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ installment: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}
