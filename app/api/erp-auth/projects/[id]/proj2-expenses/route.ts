import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET: list all expenses for this project (with joins)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await supabase
    .from("proj2_expenses")
    .select(`
      *,
      category:proj2_expense_categories(name, expense_type),
      vault:proj2_vaults(name)
    `)
    .eq("project_id", id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ expenses: data });
}

// POST: create new expense
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const {
    category_id, expense_type, purchase_order_ids, sale_order_ids, lot_order_ids,
    description, amount, payment_status,
    paid_amount, vault_id, expense_date, notes
  } = body;

  if (!amount || amount <= 0) return NextResponse.json({ error: "المبلغ مطلوب" }, { status: 400 });

  // Auto-generate code
  const { data: lastExp } = await supabase
    .from("proj2_expenses")
    .select("code")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextNum = 1;
  if (lastExp?.code) {
    const parts = lastExp.code.split("-");
    const last = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(last)) nextNum = last + 1;
  }
  const code = `EXP-${String(nextNum).padStart(3, "0")}`;

  // If immediate/advance payment, deduct from vault
  const actualPaid = payment_status === "future" ? 0 : (Number(paid_amount) || Number(amount));
  if (actualPaid > 0 && vault_id) {
    const { data: vault } = await supabase.from("proj2_vaults").select("balance, name").eq("id", vault_id).single();
    if (!vault) return NextResponse.json({ error: "الخزنة غير موجودة" }, { status: 404 });
    if (vault.balance < actualPaid)
      return NextResponse.json({ error: `الرصيد غير كافي في ${vault.name}` }, { status: 400 });

    await supabase.from("proj2_vaults").update({ balance: vault.balance - actualPaid }).eq("id", vault_id);
    await supabase.from("proj2_vault_transactions").insert({
      vault_id, type: "withdrawal", amount: actualPaid,
      ref_type: "expense", ref_id: null,
      notes: `${description || "مصروف"} — ${code}`
    });
  }

  const { data: expense, error } = await supabase
    .from("proj2_expenses")
    .insert({
      project_id: id, code, category_id,
      expense_type: expense_type || "general",
      purchase_order_ids: Array.isArray(purchase_order_ids) ? purchase_order_ids : [],
      sale_order_ids: Array.isArray(sale_order_ids) ? sale_order_ids : [],
      lot_order_ids: Array.isArray(lot_order_ids) ? lot_order_ids : [],
      description, amount: Number(amount),
      payment_status: payment_status || "future",
      paid_amount: actualPaid,
      vault_id: vault_id || null,
      expense_date: expense_date || new Date().toISOString().split("T")[0],
      notes
    })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ expense }, { status: 201 });
}
