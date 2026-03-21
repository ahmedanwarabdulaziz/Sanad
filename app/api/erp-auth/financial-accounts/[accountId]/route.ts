import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// PATCH — toggle active / update account
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;
    const body = await request.json();
    const projectId = body.project_id;

    // If deactivating, check zero deposits
    if (body.is_active === false && projectId) {
      const { data: deposits } = await supabase
        .from("investor_deposits")
        .select("amount")
        .eq("financial_account_id", accountId)
        .eq("project_id", projectId);
      const total = (deposits || []).reduce((s: number, d: { amount: number }) => s + Number(d.amount), 0);
      if (total > 0) {
        return NextResponse.json(
          { error: `لا يمكن إغلاق الحساب — يوجد إيداعات بقيمة ${total} ج.م` },
          { status: 400 }
        );
      }
    }

    const updates: Record<string, unknown> = {};
    if (body.account_name !== undefined) updates.account_name = body.account_name;
    if (body.account_type !== undefined) updates.account_type = body.account_type;
    if (body.is_active !== undefined) updates.is_active = body.is_active;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("financial_accounts")
      .update(updates)
      .eq("id", accountId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ account: data });
  } catch {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

// DELETE — only if zero balance and no linked records
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;

    // Check for any deposits
    const { data: deposits } = await supabase
      .from("investor_deposits")
      .select("amount")
      .eq("financial_account_id", accountId);
    const totalDeposits = (deposits || []).reduce((s: number, d: { amount: number }) => s + Number(d.amount), 0);

    // Check for any transactions (transfers, expenses, etc.)
    const { count: txCount } = await supabase
      .from("treasury_transactions")
      .select("id", { count: "exact", head: true })
      .or(`from_account_id.eq.${accountId},to_account_id.eq.${accountId}`);

    // Check for any expenses linked to this account
    const { count: expCount } = await supabase
      .from("project_expenses")
      .select("id", { count: "exact", head: true })
      .eq("financial_account_id", accountId);

    const hasRecords = totalDeposits > 0 || (txCount && txCount > 0) || (expCount && expCount > 0);

    if (hasRecords) {
      // Compute net balance
      // Transfers out from this account
      const { data: txOut } = await supabase
        .from("treasury_transactions")
        .select("amount")
        .eq("from_account_id", accountId);
      const totalOut = (txOut || []).reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0);

      // Transfers in to this account
      const { data: txIn } = await supabase
        .from("treasury_transactions")
        .select("amount")
        .eq("to_account_id", accountId)
        .eq("transaction_type", "TRANSFER");
      const totalIn = (txIn || []).reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0);

      const netBalance = totalDeposits + totalIn - totalOut;

      if (netBalance !== 0) {
        return NextResponse.json(
          { error: `لا يمكن حذف الحساب — الرصيد الحالي ${netBalance.toLocaleString("en-US")} ج.م يجب أن يكون صفر` },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "لا يمكن حذف الحساب — يوجد إيداعات أو حركات مرتبطة" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("financial_accounts")
      .delete()
      .eq("id", accountId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: "تم حذف الحساب" });
  } catch {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
