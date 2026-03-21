import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await supabase
    .from("proj2_purchase_orders")
    .select(`
      *,
      supplier:proj2_suppliers(name),
      items:proj2_purchase_order_items(*, item:proj2_items(name, code, unit)),
      payments:proj2_purchase_payments(*, vault:proj2_vaults(name))
    `)
    .eq("project_id", id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orders: data });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { supplier_id, items, notes, order_date } = body;
  if (!items || items.length === 0) return NextResponse.json({ error: "لا توجد أصناف في الفاتورة" }, { status: 400 });

  // Calculate total
  const total_amount = items.reduce((s: number, i: any) => s + i.quantity * i.unit_price, 0);

  // Auto-generate invoice code using MAX to handle gaps after deletions
  const { data: maxRow } = await supabase
    .from("proj2_purchase_orders")
    .select("code")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextNum = 1;
  if (maxRow?.code) {
    const parts = maxRow.code.split("-");
    const last = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(last)) nextNum = last + 1;
  }
  const code = `PO-${String(nextNum).padStart(3, "0")}`;


  const { data: order, error: orderErr } = await supabase
    .from("proj2_purchase_orders")
    .insert({ project_id: id, code, supplier_id, total_amount, notes, order_date: order_date || new Date().toISOString().split("T")[0] })
    .select().single();
  if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 });

  // Insert items
  const itemRows = items.map((i: any) => ({ purchase_order_id: order.id, item_id: i.item_id, quantity: i.quantity, unit_price: i.unit_price }));
  await supabase.from("proj2_purchase_order_items").insert(itemRows);

  return NextResponse.json({ order }, { status: 201 });
}
