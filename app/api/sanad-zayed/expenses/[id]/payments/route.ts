import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── GET /api/sanad-zayed/expenses/[id]/payments ────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth("viewer");
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from("sz_expense_payments")
      .select("*, financial_account:financial_account_id(account_name)")
      .eq("expense_id", id)
      .order("paid_date", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ payments: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}

// ── POST /api/sanad-zayed/expenses/[id]/payments ────────────────────────
// Adds one payment tranche toward an expense's allocated_cost. Creates the
// underlying treasury withdrawal too (same account-deduction trigger the
// rest of the app relies on), then the sz_expense_payments rollup trigger
// updates sz_expenses.actual_paid_amount automatically.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const { amount, paid_date, financial_account_id, notes } = body;

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "المبلغ غير صالح" }, { status: 422 });
    }
    if (!financial_account_id) {
      return NextResponse.json({ error: "يجب اختيار الخزينة/الحساب" }, { status: 422 });
    }

    const { data: expense, error: expError } = await supabase
      .from("sz_expenses")
      .select("id, description, allocated_cost, actual_paid_amount, recoverable_investor_id")
      .eq("id", id)
      .single();

    if (expError || !expense) {
      return NextResponse.json({ error: "المصروف غير موجود" }, { status: 404 });
    }

    // If this expense is recoverable from an investor, the payment is a
    // personal deduction against their ledger balance, not a project cost.
    const { data: tx, error: txError } = await supabase
      .from("sz_treasury_transactions")
      .insert(
        expense.recoverable_investor_id
          ? {
              transaction_type: "WITHDRAWAL",
              from_account_id: financial_account_id,
              amount: Number(amount),
              description: `دفعة على مصروف مسترد من المستثمر: ${expense.description}`,
              expense_id: id,
              investor_id: expense.recoverable_investor_id,
              reason_type: "PERSONAL_SERVICE_DEDUCTION",
              transaction_date: paid_date || new Date().toISOString().split("T")[0],
            }
          : {
              transaction_type: "EXPENSE",
              from_account_id: financial_account_id,
              amount: Number(amount),
              description: `دفعة على مصروف: ${expense.description}`,
              expense_id: id,
              transaction_date: paid_date || new Date().toISOString().split("T")[0],
            }
      )
      .select()
      .single();

    if (txError) throw txError;

    const { data: payment, error: payError } = await supabase
      .from("sz_expense_payments")
      .insert({
        expense_id: id,
        amount: Number(amount),
        paid_date: paid_date || new Date().toISOString().split("T")[0],
        financial_account_id,
        treasury_transaction_id: tx.id,
        notes: notes?.trim() || "",
      })
      .select("*, financial_account:financial_account_id(account_name)")
      .single();

    if (payError) throw payError;

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}
