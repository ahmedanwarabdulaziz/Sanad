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
    .from("proj2_sales")
    .select(`
      *,
      items:proj2_sale_items(*, item:proj2_items(name,code,unit)),
      customer:proj2_customers(name,phones),
      payments:proj2_sale_payments(*)
    `)
    .eq("project_id", id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sales: data });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { customer_id, customer_name, customer_phone, quote_id, sale_date, notes, items } = await req.json();

  if (!items || items.length === 0)
    return NextResponse.json({ error: "أضف صنفاً واحداً على الأقل" }, { status: 400 });

  // Auto-code: SI-001, SI-002, ...
  const { count } = await supabase
    .from("proj2_sales")
    .select("*", { count: "exact", head: true })
    .eq("project_id", id);
  const code = `SI-${String((count || 0) + 1).padStart(3, "0")}`;

  const total_amount = items.reduce((s: number, i: any) => s + Number(i.quantity) * Number(i.unit_price), 0);

  const { data: sale, error } = await supabase
    .from("proj2_sales")
    .insert({ project_id: id, code, customer_id: customer_id || null, customer_name, customer_phone, quote_id: quote_id || null, sale_date, notes, total_amount, status: "pending", payment_status: "pending", paid_amount: 0 })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("proj2_sale_items").insert(
    items.map((i: any) => ({ sale_id: sale.id, item_id: i.item_id || null, quantity: Number(i.quantity), unit_price: Number(i.unit_price) }))
  );

  return NextResponse.json({ sale });
}
