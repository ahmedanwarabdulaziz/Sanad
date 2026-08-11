import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── GET /api/sanad-zayed/expenses ─────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await requireAuth("viewer");
  if ("error" in auth) return auth.error;

  try {
    const { data: expenses, error } = await supabase
      .from("sz_expenses")
      .select(`
        *,
        financial_account:financial_account_id(account_name),
        allocations:sz_expense_allocations(id, stage_id, percentage, stage:stage_id(name)),
        payments:sz_expense_payments(id, amount, paid_date),
        recoverable_investor:recoverable_investor_id(id, name)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ expenses });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}

// ── POST /api/sanad-zayed/expenses ────────────────────────────────────
// stage_allocations: [{ stage_id, percentage }] — how this expense's cost splits across stages.
// Falls back to a single 100% allocation on `stage_id` if stage_allocations isn't provided.
// The first payment tranche (if any) is recorded via sz_expense_payments so
// sz_expenses.actual_paid_amount stays a trigger-maintained rollup, not a value set here.
export async function POST(request: NextRequest) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const {
      description,
      category,
      allocated_cost,
      actual_paid_amount,
      expense_date,
      stage_id,
      stage_allocations,
      financial_account_id,
      notes,
      investor_override_description,
      investor_override_amount,
      hide_from_investor,
      recoverable_investor_id,
    } = body;

    if (!description || !description.trim()) {
      return NextResponse.json({ error: "وصف المصروف مطلوب" }, { status: 422 });
    }

    if (actual_paid_amount > 0 && !financial_account_id) {
      return NextResponse.json({ error: "يجب اختيار الخزينة/الحساب للمبلغ المدفوع" }, { status: 422 });
    }

    const allocations: { stage_id: string; percentage: number }[] =
      stage_allocations && stage_allocations.length > 0
        ? stage_allocations
        : stage_id
          ? [{ stage_id, percentage: 100 }]
          : [];

    if (allocations.length > 0) {
      const totalPct = allocations.reduce((sum, a) => sum + Number(a.percentage), 0);
      if (Math.abs(totalPct - 100) > 0.01) {
        return NextResponse.json({ error: `مجموع نسب توزيع المراحل يجب أن يكون 100% (الحالي: ${totalPct}%)` }, { status: 422 });
      }
    }

    // A cost is either a general project/stage cost, or a personal charge fully
    // recovered from one investor — never both, or it would be double-counted
    // (once against the stage's P&L, once against the investor's balance).
    if (allocations.length > 0 && recoverable_investor_id) {
      return NextResponse.json(
        { error: "لا يمكن توزيع المصروف على مرحلة وربطه باسترداد من مستثمر في نفس الوقت" },
        { status: 422 }
      );
    }

    // 1. Insert the Expense (allocated_cost is the full obligation; actual_paid_amount
    //    is left at its default and maintained by the sz_expense_payments rollup trigger).
    const { data: expense, error: expError } = await supabase
      .from("sz_expenses")
      .insert({
        description: description.trim(),
        category: category?.trim() || "",
        allocated_cost: Number(allocated_cost) || 0,
        expense_date: expense_date || new Date().toISOString().split("T")[0],
        stage_id: stage_id || null,
        financial_account_id: financial_account_id || null,
        notes: notes?.trim() || "",
        status: "APPROVED", // auto approve for now to deduct money
        investor_override_description: investor_override_description?.trim() || null,
        investor_override_amount: investor_override_amount !== undefined && investor_override_amount !== "" ? Number(investor_override_amount) : null,
        hide_from_investor: Boolean(hide_from_investor),
        recoverable_investor_id: recoverable_investor_id || null,
      })
      .select()
      .single();

    if (expError) throw expError;

    // 2. Stage split
    if (allocations.length > 0) {
      const { error: allocError } = await supabase
        .from("sz_expense_allocations")
        .insert(allocations.map(a => ({ expense_id: expense.id, stage_id: a.stage_id, percentage: Number(a.percentage) })));

      if (allocError) {
        await supabase.from("sz_expenses").delete().eq("id", expense.id);
        throw new Error("فشل في حفظ توزيع المراحل: " + allocError.message);
      }
    }

    // 3. First payment tranche (if any actual cash paid at creation time).
    //    If this expense is recoverable from an investor, the payment is a
    //    personal deduction against their ledger balance, not a project cost.
    if (Number(actual_paid_amount) > 0 && financial_account_id) {
      const { data: tx, error: txError } = await supabase
        .from("sz_treasury_transactions")
        .insert(
          recoverable_investor_id
            ? {
                transaction_type: "WITHDRAWAL",
                from_account_id: financial_account_id,
                amount: Number(actual_paid_amount),
                description: `مصروف مسترد من المستثمر: ${expense.description}`,
                expense_id: expense.id,
                investor_id: recoverable_investor_id,
                reason_type: "PERSONAL_SERVICE_DEDUCTION",
                transaction_date: expense.expense_date,
              }
            : {
                transaction_type: "EXPENSE",
                from_account_id: financial_account_id,
                amount: Number(actual_paid_amount),
                description: `مصروف: ${expense.description}`,
                expense_id: expense.id,
                transaction_date: expense.expense_date,
              }
        )
        .select()
        .single();

      if (txError) {
        await supabase.from("sz_expenses").delete().eq("id", expense.id);
        throw new Error("فشل في تسجيل المعاملة في الخزينة: " + txError.message);
      }

      const { error: payError } = await supabase.from("sz_expense_payments").insert({
        expense_id: expense.id,
        amount: Number(actual_paid_amount),
        paid_date: expense.expense_date,
        financial_account_id,
        treasury_transaction_id: tx.id,
      });

      if (payError) throw new Error("فشل في تسجيل الدفعة: " + payError.message);
    }

    const { data: fullExpense } = await supabase
      .from("sz_expenses")
      .select(`*, financial_account:financial_account_id(account_name), allocations:sz_expense_allocations(id, stage_id, percentage, stage:stage_id(name)), payments:sz_expense_payments(id, amount, paid_date), recoverable_investor:recoverable_investor_id(id, name)`)
      .eq("id", expense.id)
      .single();

    return NextResponse.json({ expense: fullExpense ?? expense }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}
