import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── POST /api/sanad-zayed/stage-budget-items/[id]/convert ───────────────
// Turns a budgeted/expected line item into a real sz_expenses row once the
// money actually goes out. The admin can edit the amount to match what was
// really paid (may differ from the original estimate). Once converted, the
// budget item drops out of the stage's "expected cost" total.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const { actual_amount, financial_account_id, paid_date, notes } = body;

    const { data: budgetItem, error: bErr } = await supabase
      .from("sz_stage_budget_items")
      .select("*")
      .eq("id", id)
      .single();

    if (bErr || !budgetItem) {
      return NextResponse.json({ error: "البند غير موجود" }, { status: 404 });
    }
    if (budgetItem.status === "CONVERTED") {
      return NextResponse.json({ error: "تم تحويل هذا البند بالفعل" }, { status: 409 });
    }

    const finalAmount = actual_amount !== undefined && actual_amount !== "" ? Number(actual_amount) : Number(budgetItem.amount);
    if (!finalAmount || finalAmount <= 0) {
      return NextResponse.json({ error: "المبلغ الفعلي غير صحيح" }, { status: 422 });
    }
    if (finalAmount > 0 && !financial_account_id) {
      return NextResponse.json({ error: "يجب اختيار الخزينة/الحساب لدفع المبلغ" }, { status: 422 });
    }

    // 1. Create the real expense (allocated_cost = the full obligation now that it's real)
    const { data: expense, error: expError } = await supabase
      .from("sz_expenses")
      .insert({
        description: budgetItem.description,
        category: budgetItem.category,
        allocated_cost: finalAmount,
        expense_date: paid_date || new Date().toISOString().split("T")[0],
        stage_id: budgetItem.stage_id,
        financial_account_id: financial_account_id || null,
        notes: notes?.trim() || `محوّل من بند متوقع: ${budgetItem.description}`,
        status: "APPROVED",
      })
      .select()
      .single();

    if (expError) throw expError;

    // 2. Default stage allocation: 100% to the budget item's origin stage
    const { error: allocError } = await supabase
      .from("sz_expense_allocations")
      .insert({ expense_id: expense.id, stage_id: budgetItem.stage_id, percentage: 100 });

    if (allocError) {
      await supabase.from("sz_expenses").delete().eq("id", expense.id);
      throw new Error("فشل في حفظ توزيع المرحلة: " + allocError.message);
    }

    // 3. First payment tranche = the full converted amount, paid now
    if (financial_account_id) {
      const { data: tx, error: txError } = await supabase
        .from("sz_treasury_transactions")
        .insert({
          transaction_type: "EXPENSE",
          from_account_id: financial_account_id,
          amount: finalAmount,
          description: `مصروف (محوّل من متوقع): ${expense.description}`,
          expense_id: expense.id,
          transaction_date: expense.expense_date,
        })
        .select()
        .single();

      if (txError) {
        await supabase.from("sz_expenses").delete().eq("id", expense.id);
        throw new Error("فشل في تسجيل المعاملة في الخزينة: " + txError.message);
      }

      const { error: payError } = await supabase.from("sz_expense_payments").insert({
        expense_id: expense.id,
        amount: finalAmount,
        paid_date: expense.expense_date,
        financial_account_id,
        treasury_transaction_id: tx.id,
      });

      if (payError) throw new Error("فشل في تسجيل الدفعة: " + payError.message);
    }

    // 4. Mark the budget item converted and linked
    const { data: updatedBudgetItem, error: updateError } = await supabase
      .from("sz_stage_budget_items")
      .update({ status: "CONVERTED", linked_expense_id: expense.id, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ budget_item: updatedBudgetItem, expense });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}
