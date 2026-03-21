import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// PATCH — update expense
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const { expenseId } = await params;
    const body = await request.json();

    const updates: Record<string, unknown> = {};
    if (body.expense_name !== undefined) updates.expense_name = body.expense_name;
    if (body.stage_id !== undefined) updates.stage_id = body.stage_id;
    if (body.pricing_type !== undefined) updates.pricing_type = body.pricing_type;
    if (body.company_amount !== undefined) updates.company_amount = Number(body.company_amount);
    if (body.investor_amount !== undefined) updates.investor_amount = Number(body.investor_amount);
    if (body.payment_status !== undefined) updates.payment_status = body.payment_status;
    if (body.paid_amount !== undefined) updates.paid_amount = Number(body.paid_amount);
    if (body.financial_account_id !== undefined) updates.financial_account_id = body.financial_account_id || null;
    if (body.expense_date !== undefined) updates.expense_date = body.expense_date;
    if (body.due_date !== undefined) updates.due_date = body.due_date || null;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.attachments !== undefined) updates.attachments = body.attachments;
    if (body.show_to_investors !== undefined) updates.show_to_investors = body.show_to_investors;
    if (body.investor_display_name !== undefined) updates.investor_display_name = body.investor_display_name || null;

    const { data, error } = await supabase
      .from("project_expenses")
      .update(updates)
      .eq("id", expenseId)
      .select("*, stage:project_stages(stage_name), account:financial_accounts(account_name, account_type)")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ expense: data });
  } catch {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
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
