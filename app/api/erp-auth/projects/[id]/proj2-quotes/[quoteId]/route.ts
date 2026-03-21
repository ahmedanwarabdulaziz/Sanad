import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; quoteId: string }> }) {
  const { id, quoteId } = await params;
  const body = await req.json();

  // Action: edit
  if (body.action === "edit") {
    const { customer_id, customer_name, customer_phone, quote_date, valid_until, notes, items } = body;
    const total_amount = (items || []).reduce((s: number, i: any) => s + Number(i.quantity) * Number(i.unit_price), 0);
    await supabase.from("proj2_price_quotes").update({ customer_id: customer_id || null, customer_name, customer_phone, quote_date, valid_until: valid_until || null, notes, total_amount }).eq("id", quoteId);
    await supabase.from("proj2_price_quote_items").delete().eq("quote_id", quoteId);
    await supabase.from("proj2_price_quote_items").insert(
      (items || []).map((i: any) => ({ quote_id: quoteId, item_id: i.item_id || null, quantity: Number(i.quantity), unit_price: Number(i.unit_price) }))
    );
    return NextResponse.json({ success: true });
  }

  // Action: update status (sent/cancelled)
  if (body.action === "status") {
    await supabase.from("proj2_price_quotes").update({ status: body.status }).eq("id", quoteId);
    return NextResponse.json({ success: true });
  }

  // Action: convert to sale invoice
  if (body.action === "convert") {
    const { data: quote } = await supabase
      .from("proj2_price_quotes")
      .select("*, items:proj2_price_quote_items(*)")
      .eq("id", quoteId)
      .single();
    if (!quote) return NextResponse.json({ error: "عرض السعر غير موجود" }, { status: 404 });
    if (quote.status === "converted") return NextResponse.json({ error: "تم تحويل عرض السعر مسبقاً" }, { status: 400 });

    // Auto-code for sale
    const { count } = await supabase.from("proj2_sales").select("*", { count: "exact", head: true }).eq("project_id", id);
    const code = `SI-${String((count || 0) + 1).padStart(3, "0")}`;

    const { data: sale, error } = await supabase
      .from("proj2_sales")
      .insert({
        project_id: id, code,
        customer_id: quote.customer_id || null,
        customer_name: quote.customer_name,
        customer_phone: quote.customer_phone,
        quote_id: quoteId,
        sale_date: new Date().toISOString().split("T")[0],
        notes: quote.notes,
        total_amount: quote.total_amount,
        status: "pending", payment_status: "pending", paid_amount: 0
      })
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabase.from("proj2_sale_items").insert(
      (quote.items || []).map((i: any) => ({ sale_id: sale.id, item_id: i.item_id, quantity: i.quantity, unit_price: i.unit_price }))
    );

    await supabase.from("proj2_price_quotes").update({ status: "converted" }).eq("id", quoteId);
    return NextResponse.json({ sale });
  }

  return NextResponse.json({ error: "action غير معروف" }, { status: 400 });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; quoteId: string }> }) {
  const { quoteId } = await params;
  const { error } = await supabase.from("proj2_price_quotes").delete().eq("id", quoteId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
