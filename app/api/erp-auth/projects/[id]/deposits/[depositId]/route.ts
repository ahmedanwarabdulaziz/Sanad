import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// PATCH — update a deposit (amount, date, notes)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; depositId: string }> }
) {
  try {
    const { depositId } = await params;
    const body = await request.json();

    const updates: Record<string, unknown> = {};
    if (body.amount !== undefined) updates.amount = Number(body.amount);
    if (body.deposit_date !== undefined) updates.deposit_date = body.deposit_date;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.financial_account_id !== undefined) updates.financial_account_id = body.financial_account_id;

    const { data, error } = await supabase
      .from("investor_deposits")
      .update(updates)
      .eq("id", depositId)
      .select("*, investor:investors(name), account:financial_accounts(account_name, account_type)")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ deposit: data });
  } catch {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

// DELETE — remove a deposit
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; depositId: string }> }
) {
  try {
    const { depositId } = await params;
    const { error } = await supabase
      .from("investor_deposits")
      .delete()
      .eq("id", depositId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: "تم حذف الإيداع" });
  } catch {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
