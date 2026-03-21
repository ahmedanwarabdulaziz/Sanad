import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; saleId: string }> }) {
  const { id, saleId } = await params;
  const body = await req.json();

  // Action: edit
  if (body.action === "edit") {
    const { customer_name, customer_phone, customer_id, sale_date, notes, items } = body;
    const total_amount = (items || []).reduce((s: number, i: any) => s + Number(i.quantity) * Number(i.unit_price), 0);
    await supabase.from("proj2_sales").update({ customer_id: customer_id || null, customer_name, customer_phone, sale_date, notes, total_amount }).eq("id", saleId);
    await supabase.from("proj2_sale_items").delete().eq("sale_id", saleId);
    await supabase.from("proj2_sale_items").insert(
      (items || []).map((i: any) => ({ sale_id: saleId, item_id: i.item_id || null, quantity: Number(i.quantity), unit_price: Number(i.unit_price) }))
    );
    return NextResponse.json({ success: true });
  }

  // Action: pay
  if (body.action === "pay") {
    const { vault_id, amount, notes, payment_date } = body;
    if (!vault_id || !amount || amount <= 0) return NextResponse.json({ error: "بيانات الدفع غير صحيحة" }, { status: 400 });

    const { data: saleRef, error: e1 } = await supabase.from("proj2_sales").select("code, paid_amount, total_amount").eq("id", saleId).single();
    if (e1 || !saleRef) return NextResponse.json({ error: e1?.message || "الفاتورة غير موجودة" }, { status: 404 });

    const { data: vault, error: e2 } = await supabase.from("proj2_vaults").select("balance, name").eq("id", vault_id).single();
    if (e2 || !vault) return NextResponse.json({ error: e2?.message || "الخزنة غير موجودة" }, { status: 404 });

    // For sales: add to vault (income)
    const { error: e3 } = await supabase.from("proj2_vaults").update({ balance: vault.balance + amount }).eq("id", vault_id);
    if (e3) return NextResponse.json({ error: e3.message }, { status: 500 });

    const { error: e4 } = await supabase.from("proj2_vault_transactions").insert({
      vault_id, type: "deposit", amount,
      ref_type: "sale", ref_id: saleId,
      notes: notes || `تحصيل فاتورة ${saleRef.code}`
    });
    if (e4) return NextResponse.json({ error: e4.message }, { status: 500 });

    const { error: e5 } = await supabase.from("proj2_sale_payments").insert({ sale_id: saleId, vault_id, amount, payment_date: payment_date || new Date().toISOString().split("T")[0], notes });
    if (e5) return NextResponse.json({ error: e5.message }, { status: 500 });

    const newPaid = Number(saleRef.paid_amount) + amount;
    const payment_status = newPaid >= Number(saleRef.total_amount) ? "paid" : "partial";
    await supabase.from("proj2_sales").update({ paid_amount: newPaid, payment_status }).eq("id", saleId);
    return NextResponse.json({ success: true });
  }

  // Action: deliver (stock-out)
  if (body.action === "deliver") {
    const { data: sale } = await supabase
      .from("proj2_sales")
      .select("*, items:proj2_sale_items(*), code")
      .eq("id", saleId).single();
    if (!sale) return NextResponse.json({ error: "الفاتورة غير موجودة" }, { status: 404 });
    if (sale.status === "delivered") return NextResponse.json({ error: "تم التسليم مسبقاً" }, { status: 400 });

    const movements = (sale.items || [])
      .filter((i: any) => i.item_id)
      .map((i: any) => ({
        project_id: id, item_id: i.item_id, type: "out",
        quantity: i.quantity, ref_type: "sale", ref_id: saleId,
        movement_date: new Date().toISOString().split("T")[0],
        notes: `تسليم ${sale.code}`
      }));
    if (movements.length > 0) await supabase.from("proj2_stock_movements").insert(movements);

    await supabase.from("proj2_sales").update({ status: "delivered" }).eq("id", saleId);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "action غير معروف" }, { status: 400 });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; saleId: string }> }) {
  const { saleId } = await params;
  const { error } = await supabase.from("proj2_sales").delete().eq("id", saleId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
