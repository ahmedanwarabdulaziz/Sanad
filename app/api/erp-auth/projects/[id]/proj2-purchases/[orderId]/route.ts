import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// PATCH: mark as received OR add payment
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; orderId: string }> }) {
  const { id, orderId } = await params;
  const body = await req.json();

  // Action: receive order
  if (body.action === "receive") {
    const { data: order } = await supabase.from("proj2_purchase_orders").select("*, items:proj2_purchase_order_items(*)").eq("id", orderId).single();
    if (!order) return NextResponse.json({ error: "الفاتورة غير موجودة" }, { status: 404 });
    if (order.status === "received") return NextResponse.json({ error: "تم الاستلام مسبقاً" }, { status: 400 });

    await supabase.from("proj2_purchase_orders").update({ status: "received", received_date: new Date().toISOString().split("T")[0] }).eq("id", orderId);

    // Create stock-in movements for each item
    const movements = order.items.map((i: any) => ({
      project_id: id, item_id: i.item_id, type: "in", quantity: i.quantity,
      ref_type: "purchase_order", ref_id: orderId, movement_date: new Date().toISOString().split("T")[0],
      notes: `استلام ${order.code}`
    }));
    if (movements.length > 0) await supabase.from("proj2_stock_movements").insert(movements);
    return NextResponse.json({ success: true });
  }

  // Action: add payment
  if (body.action === "pay") {
    const { vault_id, amount, payment_date, notes } = body;
    if (!vault_id || !amount || amount <= 0) return NextResponse.json({ error: "بيانات الدفع غير صحيحة" }, { status: 400 });

    // Fetch order code for readable note
    const { data: orderRef } = await supabase.from("proj2_purchase_orders").select("code").eq("id", orderId).single();
    const orderLabel = orderRef?.code || orderId;

    // Check vault balance
    const { data: vault } = await supabase.from("proj2_vaults").select("balance, name").eq("id", vault_id).single();
    if (!vault) return NextResponse.json({ error: "الخزنة غير موجودة" }, { status: 404 });
    if (vault.balance < amount) return NextResponse.json({ error: `الرصيد غير كافي في ${vault.name}` }, { status: 400 });

    // Deduct from vault
    await supabase.from("proj2_vaults").update({ balance: vault.balance - amount }).eq("id", vault_id);

    // Log vault transaction with human-readable note
    await supabase.from("proj2_vault_transactions").insert({
      vault_id, type: "withdrawal", amount, ref_type: "purchase_order", ref_id: orderId,
      notes: notes || `دفعة لفاتورة ${orderLabel}`
    });

    // Insert payment record
    await supabase.from("proj2_purchase_payments").insert({ purchase_order_id: orderId, vault_id, amount, payment_date: payment_date || new Date().toISOString().split("T")[0], notes });

    // Update paid_amount + payment_status on order
    const { data: order } = await supabase.from("proj2_purchase_orders").select("paid_amount, total_amount").eq("id", orderId).single();
    if (order) {
      const newPaid = order.paid_amount + amount;
      const payment_status = newPaid >= order.total_amount ? "paid" : "partial";
      await supabase.from("proj2_purchase_orders").update({ paid_amount: newPaid, payment_status }).eq("id", orderId);
    }

    return NextResponse.json({ success: true });
  }

  // Action: edit order
  if (body.action === "edit") {
    const { supplier_id, notes, order_date, items } = body;
    if (!items || items.length === 0) return NextResponse.json({ error: "لا توجد أصناف" }, { status: 400 });
    const total_amount = items.reduce((s: number, i: any) => s + Number(i.quantity) * Number(i.unit_price), 0);
    await supabase.from("proj2_purchase_orders").update({ supplier_id, notes, order_date, total_amount }).eq("id", orderId);
    await supabase.from("proj2_purchase_order_items").delete().eq("purchase_order_id", orderId);
    await supabase.from("proj2_purchase_order_items").insert(
      items.map((i: any) => ({ purchase_order_id: orderId, item_id: i.item_id, quantity: Number(i.quantity), unit_price: Number(i.unit_price) }))
    );
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "action غير معروف" }, { status: 400 });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; orderId: string }> }) {
  const { orderId } = await params;
  const { error } = await supabase.from("proj2_purchase_orders").delete().eq("id", orderId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
