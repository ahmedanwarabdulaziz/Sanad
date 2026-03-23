import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Helper: compute account balance
async function getAccountBalance(accountId: string, projectId: string): Promise<number> {
  // Deposits into this account
  const { data: deposits } = await supabase
    .from("investor_deposits")
    .select("amount")
    .eq("financial_account_id", accountId)
    .eq("project_id", projectId);
  const totalDeposits = (deposits || []).reduce((s, d) => s + Number(d.amount), 0);

  // Transfers out
  const { data: txOut } = await supabase
    .from("treasury_transactions")
    .select("amount")
    .eq("from_account_id", accountId)
    .eq("project_id", projectId);
  const totalOut = (txOut || []).reduce((s, t) => s + Number(t.amount), 0);

  // Transfers in
  const { data: txIn } = await supabase
    .from("treasury_transactions")
    .select("amount")
    .eq("to_account_id", accountId)
    .eq("project_id", projectId)
    .eq("transaction_type", "TRANSFER");
  const totalIn = (txIn || []).reduce((s, t) => s + Number(t.amount), 0);

  return totalDeposits + totalIn - totalOut;
}

// PATCH — update expense
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const { id, expenseId } = await params;
    const body = await request.json();

    const updates: Record<string, unknown> = {};
    if (body.expense_name !== undefined) updates.expense_name = body.expense_name;
    if (body.stage_id !== undefined) updates.stage_id = body.stage_id;
    if (body.pricing_type !== undefined) updates.pricing_type = body.pricing_type;
    
    // We need company_amount and status for validation, so extract them from DB if not in body
    let companyAmt = body.company_amount !== undefined ? Number(body.company_amount) : undefined;
    if (companyAmt !== undefined) updates.company_amount = companyAmt;
    
    if (body.investor_amount !== undefined) updates.investor_amount = Number(body.investor_amount);
    if (body.payment_status !== undefined) updates.payment_status = body.payment_status;
    
    if (body.expense_date !== undefined) updates.expense_date = body.expense_date;
    if (body.due_date !== undefined) updates.due_date = body.due_date || null;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.attachments !== undefined) updates.attachments = body.attachments;
    if (body.show_to_investors !== undefined) updates.show_to_investors = body.show_to_investors;
    if (body.investor_display_name !== undefined) updates.investor_display_name = body.investor_display_name || null;

    // Handle payments
    let paymentsUpdated = false;
    let payments = body.payments || [];
    if (body.payments !== undefined) {
      paymentsUpdated = true;
      updates.payments = payments;
      updates.financial_account_id = payments.length > 0 ? payments[0].account_id : null;
      
      const totalPaid = payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
      updates.paid_amount = body.payment_status === "FUTURE" ? 0 : totalPaid;
      
      // Need expense details from DB if we didn't receive company_amount or payment_status
      if (companyAmt === undefined || body.payment_status === undefined) {
        const { data: currentExpense } = await supabase.from("project_expenses").select("company_amount, payment_status").eq("id", expenseId).single();
        if (companyAmt === undefined) companyAmt = currentExpense?.company_amount || 0;
        if (body.payment_status === undefined) body.payment_status = currentExpense?.payment_status || "PAID";
      }

      const finalCompanyAmt = companyAmt ?? 0;

      // Check PAID validation
      if (body.payment_status === "PAID" && totalPaid !== finalCompanyAmt) {
        return NextResponse.json({
          error: `حالة "مدفوع بالكامل" تتطلب أن يكون المبلغ المدفوع (${totalPaid.toLocaleString("en-US")}) يساوي مبلغ الشركة (${finalCompanyAmt.toLocaleString("en-US")})`
        }, { status: 400 });
      }

      // Fetch old payments from DB to check for balance correctly
      const { data: oldExpense } = await supabase.from("project_expenses").select("payments").eq("id", expenseId).single();
      const oldPayments = oldExpense?.payments || [];

      // Validate each payment against account balance
      for (const p of payments) {
        if (p.amount <= 0) continue;
        
        // When checking balance for an edit, we must add back the old amount we already paid from this account
        const oldPayment = oldPayments.find((op: any) => op.account_id === p.account_id);
        const oldAmount = oldPayment ? Number(oldPayment.amount) : 0;
        
        const currentBalance = await getAccountBalance(p.account_id, id);
        // Effective balance is current + what we are returning from the old transaction
        const effectiveBalance = currentBalance + oldAmount;
        
        if (p.amount > effectiveBalance) {
          const { data: acc } = await supabase.from("financial_accounts").select("account_name").eq("id", p.account_id).single();
          const name = acc?.account_name || "الحساب";
          return NextResponse.json({
            error: `رصيد ${name} غير كافٍ. المتاح (بعد الإرجاع): ${effectiveBalance.toLocaleString("en-US")} ج.م — المطلوب: ${p.amount.toLocaleString("en-US")} ج.م`
          }, { status: 400 });
        }
      }
    }
    
    if (body.scheduled_payments !== undefined) {
      updates.scheduled_payments = body.scheduled_payments;
    }

    const { data: expenseData, error: updateError } = await supabase
      .from("project_expenses")
      .update(updates)
      .eq("id", expenseId)
      .select("*, stage:project_stages(stage_name), account:financial_accounts(account_name, account_type)")
      .single();

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    
    // Recreate treasury transactions if payments were updated
    if (paymentsUpdated) {
      // 1. Delete old transactions
      await supabase
        .from("treasury_transactions")
        .delete()
        .eq("reference_type", "expense")
        .eq("reference_id", expenseId);
        
      // 2. Insert new ones
      for (const p of payments) {
        if (p.amount <= 0) continue;
        await supabase.from("treasury_transactions").insert({
          project_id: id,
          transaction_type: "EXPENSE",
          from_account_id: p.account_id,
          to_account_id: null,
          amount: p.amount,
          description: `مصروف: ${updates.expense_name || expenseData?.expense_name || ''}`,
          reference_type: "expense",
          reference_id: expenseId,
          transaction_date: updates.expense_date || expenseData?.expense_date || new Date().toISOString().split("T")[0],
        });
      }
    }

    return NextResponse.json({ expense: expenseData });
  } catch (err: any) {
    return NextResponse.json({ error: "خطأ في الخادم: " + err.message }, { status: 500 });
  }
}

// DELETE — remove expense and its treasury transactions
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const { expenseId } = await params;

    // Delete associated treasury transactions first
    await supabase
      .from("treasury_transactions")
      .delete()
      .eq("reference_type", "expense")
      .eq("reference_id", expenseId);

    const { error } = await supabase
      .from("project_expenses")
      .delete()
      .eq("id", expenseId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: "تم حذف المصروف" });
  } catch {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
