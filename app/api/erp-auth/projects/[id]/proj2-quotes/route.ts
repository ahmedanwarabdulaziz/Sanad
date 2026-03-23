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
    .from("proj2_price_quotes")
    .select("*, items:proj2_price_quote_items(*, item:proj2_items(name,code,unit)), customer:proj2_customers(name,phones)")
    .eq("project_id", id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ quotes: data });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { customer_id, customer_name, customer_phone, quote_date, valid_until, notes, items } = await req.json();

  if (!items || items.length === 0)
    return NextResponse.json({ error: "أضف صنفاً واحداً على الأقل" }, { status: 400 });

  // Auto-code: QT-001, QT-002, ...
  const { count } = await supabase
    .from("proj2_price_quotes")
    .select("*", { count: "exact", head: true })
    .eq("project_id", id);
  const code = `QT-${String((count || 0) + 1).padStart(3, "0")}`;

  const total_amount = items.reduce((s: number, i: any) => s + Number(i.quantity) * Number(i.unit_price), 0);

  const { data: quote, error } = await supabase
    .from("proj2_price_quotes")
    .insert({ project_id: id, code, customer_id: customer_id || null, customer_name, customer_phone, quote_date, valid_until: valid_until || null, notes, total_amount, status: "draft" })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("proj2_price_quote_items").insert(
    items.map((i: any) => ({
      quote_id: quote.id,
      item_id: i.item_id || null,
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
      custom_name: i.custom_name || null,
      display_mode: i.display_mode || 'item_only'
    }))
  );

  return NextResponse.json({ quote });
}
