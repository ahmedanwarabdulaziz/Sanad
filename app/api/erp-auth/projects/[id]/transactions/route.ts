import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET — list treasury transactions for a project
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from("treasury_transactions")
      .select("*, from_account:financial_accounts!treasury_transactions_from_account_id_fkey(account_name), to_account:financial_accounts!treasury_transactions_to_account_id_fkey(account_name)")
      .eq("project_id", id)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ transactions: data });
  } catch {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

// POST — create a transfer between accounts
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { from_account_id, to_account_id, amount, description, transaction_date } = await request.json();

    if (!from_account_id || !to_account_id || !amount) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
    }
    if (from_account_id === to_account_id) {
      return NextResponse.json({ error: "لا يمكن التحويل لنفس الحساب" }, { status: 400 });
    }
    if (Number(amount) <= 0) {
      return NextResponse.json({ error: "المبلغ يجب أن يكون أكبر من صفر" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("treasury_transactions")
      .insert({
        project_id: id,
        transaction_type: "TRANSFER",
        from_account_id,
        to_account_id,
        amount: Number(amount),
        description: description || `تحويل بين حسابات`,
        transaction_date: transaction_date || new Date().toISOString().split("T")[0],
      })
      .select("*, from_account:financial_accounts!treasury_transactions_from_account_id_fkey(account_name), to_account:financial_accounts!treasury_transactions_to_account_id_fkey(account_name)")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ transaction: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
