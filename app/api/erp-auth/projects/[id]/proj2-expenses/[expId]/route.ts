import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; expId: string }> }
) {
  const { expId } = await params;
  const body = await req.json();

  // Action: edit expense fields
  if (body.action === "edit") {
    const { category_id, expense_type, purchase_order_ids, description, amount, payment_status, paid_amount, vault_id, expense_date, notes } = body;
    await supabase.from("proj2_expenses").update({
      category_id: category_id || null,
      expense_type: expense_type || "general",
      purchase_order_ids: Array.isArray(purchase_order_ids) ? purchase_order_ids : [],
      description, amount: Number(amount),
      payment_status: payment_status || "future",
      paid_amount: Number(paid_amount) || 0,
      vault_id: vault_id || null,
      expense_date, notes
    }).eq("id", expId);
    return NextResponse.json({ success: true });
  }

  // Action: pay remaining
  const { vault_id, amount, notes } = body;

  if (!vault_id || !amount || amount <= 0)
    return NextResponse.json({ error: "بيانات الدفع غير صحيحة" }, { status: 400 });

  const { data: exp } = await supabase
    .from("proj2_expenses")
    .select("paid_amount, amount, code, description")
    .eq("id", expId)
    .single();
  if (!exp) return NextResponse.json({ error: "المصروف غير موجود" }, { status: 404 });

  const remaining = Number(exp.amount) - Number(exp.paid_amount);
  if (amount > remaining)
    return NextResponse.json({ error: `المبلغ أكبر من المتبقي (${remaining})` }, { status: 400 });

  const { data: vault } = await supabase.from("proj2_vaults").select("balance, name").eq("id", vault_id).single();
  if (!vault) return NextResponse.json({ error: "الخزنة غير موجودة" }, { status: 404 });
  if (vault.balance < amount)
    return NextResponse.json({ error: `الرصيد غير كافي في ${vault.name}` }, { status: 400 });

  await supabase.from("proj2_vaults").update({ balance: vault.balance - amount }).eq("id", vault_id);
  await supabase.from("proj2_vault_transactions").insert({
    vault_id, type: "withdrawal", amount,
    ref_type: "expense", ref_id: expId,
    notes: notes || `سداد ${exp.code} — ${exp.description || ""}`
  });

  const newPaid = Number(exp.paid_amount) + amount;
  const payment_status = newPaid >= Number(exp.amount) ? "immediate" : "advance";
  await supabase.from("proj2_expenses").update({ paid_amount: newPaid, payment_status, vault_id }).eq("id", expId);

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; expId: string }> }
) {
  const { expId } = await params;
  const { error } = await supabase.from("proj2_expenses").delete().eq("id", expId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
