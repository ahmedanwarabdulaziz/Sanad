import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── PATCH /api/sanad-zayed/expenses/[id]/payments/[paymentId] ──────────
// Corrects which treasury account an already-recorded payment tranche was
// paid from. The balance trigger (005_treasury_trigger.sql) only fires on
// INSERT, so an UPDATE to from_account_id alone would relabel the record
// without moving any real money — the wrong account would stay short and
// the right one would never see the deduction. Instead we insert a real
// TRANSFER between the two accounts (reversing the old deduction, applying
// the new one), then relabel the original transaction + payment row so the
// history reads consistently going forward.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  try {
    const { id, paymentId } = await params;
    const body = await request.json();
    const newAccountId = body.financial_account_id;

    if (!newAccountId) {
      return NextResponse.json({ error: "يجب اختيار الخزينة/الحساب الجديد" }, { status: 422 });
    }

    const { data: payment, error: payError } = await supabase
      .from("sz_expense_payments")
      .select("id, expense_id, amount, financial_account_id, treasury_transaction_id")
      .eq("id", paymentId)
      .eq("expense_id", id)
      .single();

    if (payError || !payment) {
      return NextResponse.json({ error: "الدفعة غير موجودة" }, { status: 404 });
    }

    if (payment.financial_account_id === newAccountId) {
      return NextResponse.json({ error: "الدفعة مسجلة بالفعل على هذه الخزينة" }, { status: 422 });
    }

    const { data: newAccount } = await supabase
      .from("sz_financial_accounts")
      .select("id")
      .eq("id", newAccountId)
      .single();

    if (!newAccount) {
      return NextResponse.json({ error: "الخزينة/الحساب المحدد غير موجود" }, { status: 422 });
    }

    const oldAccountId = payment.financial_account_id;

    const { data: expense } = await supabase
      .from("sz_expenses")
      .select("description")
      .eq("id", id)
      .single();

    // Move the money for real: pull it out of the new (correct) account and
    // put it back into the old (wrong) one — a single TRANSFER nets both
    // balances correctly via the existing insert trigger.
    const { error: txError } = await supabase.from("sz_treasury_transactions").insert({
      transaction_type: "TRANSFER",
      from_account_id: newAccountId,
      to_account_id: oldAccountId,
      amount: payment.amount,
      description: `تصحيح خزينة دفعة على مصروف: ${expense?.description ?? ""}`,
      expense_id: id,
      transaction_date: new Date().toISOString().split("T")[0],
    });

    if (txError) throw txError;

    // Relabel the original transaction to match — the balance move already
    // happened above, so this UPDATE is purely cosmetic (the trigger doesn't
    // fire on UPDATE) and won't double-adjust anything.
    if (payment.treasury_transaction_id) {
      const { error: relabelError } = await supabase
        .from("sz_treasury_transactions")
        .update({ from_account_id: newAccountId })
        .eq("id", payment.treasury_transaction_id);
      if (relabelError) throw relabelError;
    }

    const { data: updatedPayment, error: updateError } = await supabase
      .from("sz_expense_payments")
      .update({ financial_account_id: newAccountId })
      .eq("id", paymentId)
      .select("*, financial_account:financial_account_id(account_name)")
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ payment: updatedPayment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}
