import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET: all lots for a project with computed converted_value and expenses
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: lots, error } = await supabase
    .from("proj2_lots")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch all conversions for this project
  const lotIds = (lots || []).map(l => l.id);
  const { data: allConvData, error: convErr } = await supabase
    .from("proj2_lot_conversions")
    .select("*, item:proj2_items(name,code,unit)")
    .eq("project_id", id)
    .order("conversion_date", { ascending: false });

  const allConversions: any[] = allConvData || [];
  const global_converted_value = allConversions.reduce(
    (s: number, c: any) => s + Number(c.unit_price) * Number(c.quantity), 0
  );
  const conversions = allConversions;


  // Fetch expenses linked to lots
  const { data: expenses } = await supabase
    .from("proj2_expenses")
    .select("*, vault:proj2_vaults(name)")
    .eq("project_id", id)
    .eq("expense_type", "lot");

  // Fetch linked purchase orders (payment info)
  const poIds = (lots || []).map(l => l.purchase_order_id).filter(Boolean);
  const { data: poData } = poIds.length > 0
    ? await supabase
        .from("proj2_purchase_orders")
        .select("id, paid_amount, total_amount, payment_status, payments:proj2_purchase_payments(*)")
        .in("id", poIds)
    : { data: [] };
  const poMap: Record<string, any> = {};
  (poData || []).forEach((p: any) => { poMap[p.id] = p; });

  // Fetch lot sales: find the system "لوت" item then sum its sale items
  const { data: lotItemRow } = await supabase
    .from("proj2_items")
    .select("id")
    .eq("project_id", id)
    .eq("name", "لوت")
    .maybeSingle();

  let lot_sales_total = 0;
  let saleRows: any[] = [];
  if (lotItemRow?.id) {
    const { data } = await supabase
      .from("proj2_sale_items")
      .select("quantity, unit_price, sale:proj2_sales!inner(project_id, sale_date)")
      .eq("item_id", lotItemRow.id)
      .eq("sale.project_id", id);
    saleRows = data || [];
    lot_sales_total = saleRows.reduce((s: number, r: any) => s + Number(r.quantity) * Number(r.unit_price), 0);
  }

  // Attach to each lot
  const enriched = (lots || []).map(lot => {
    const lotConversions = (conversions || []).filter((c: any) => c.lot_id === lot.id);
    const converted_value = lotConversions.reduce((s: number, c: any) => s + Number(c.unit_price) * Number(c.quantity), 0);
    const lotExpenses = (expenses || []).filter((e: any) => Array.isArray(e.lot_order_ids) && e.lot_order_ids.includes(lot.id));
    const total_expenses = lotExpenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
    const po = lot.purchase_order_id ? poMap[lot.purchase_order_id] : null;
    return { ...lot, conversions: lotConversions, converted_value, expenses: lotExpenses, total_expenses, po };
  });

  return NextResponse.json({ lots: enriched, lot_sales_total, lot_sales: saleRows || [], all_conversions: allConversions, global_converted_value });
}

// POST: create a new lot (+ linked purchase order)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { description, total_cost, lot_date, notes, supplier_id } = await req.json();

  if (!total_cost || Number(total_cost) <= 0)
    return NextResponse.json({ error: "التكلفة مطلوبة" }, { status: 400 });

  // Auto-code LOT-001
  const { data: last } = await supabase
    .from("proj2_lots")
    .select("code")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextNum = 1;
  if (last?.code) {
    const parts = last.code.split("-");
    const n = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(n)) nextNum = n + 1;
  }
  const code = `LOT-${String(nextNum).padStart(3, "0")}`;

  // Create the lot
  const { data: lot, error } = await supabase
    .from("proj2_lots")
    .insert({ project_id: id, code, description, supplier_id: supplier_id || null, total_cost: Number(total_cost), lot_date: lot_date || new Date().toISOString().split("T")[0], notes })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also create a matching purchase order so it appears in purchases + supplier history
  const { data: po } = await supabase
    .from("proj2_purchase_orders")
    .insert({
      project_id: id,
      code,                               // Same code: LOT-001
      supplier_id: supplier_id || null,
      total_amount: Number(total_cost),
      paid_amount: 0,
      status: "pending",
      payment_status: "pending",
      order_date: lot_date || new Date().toISOString().split("T")[0],
      notes: `لوت — ${description || code}`,
      lot_id: lot.id,                     // back-reference (needs column)
    })
    .select("id").single();

  // Link the purchase order back to the lot
  if (po?.id) {
    await supabase.from("proj2_lots").update({ purchase_order_id: po.id }).eq("id", lot.id);
  }

  return NextResponse.json({ lot: { ...lot, purchase_order_id: po?.id } }, { status: 201 });
}
