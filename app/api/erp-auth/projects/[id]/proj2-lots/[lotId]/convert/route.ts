import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// POST: convert lot value to inventory items
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; lotId: string }> }
) {
  const { id, lotId } = await params;
  const { items, conversion_date, notes } = await req.json();
  // items: [{ item_id, quantity, unit_price }]

  if (!items || items.length === 0)
    return NextResponse.json({ error: "أضف صنفاً واحداً على الأقل" }, { status: 400 });

  // Validate lot exists
  const { data: lot } = await supabase.from("proj2_lots").select("id, code").eq("id", lotId).single();
  if (!lot) return NextResponse.json({ error: "اللوت غير موجود" }, { status: 404 });

  const convDate = conversion_date || new Date().toISOString().split("T")[0];

  // Insert conversion records
  const convRows = items.map((i: any) => ({
    lot_id: lotId,
    project_id: id,
    item_id: i.item_id,
    quantity: Number(i.quantity),
    unit_price: Number(i.unit_price),
    conversion_date: convDate,
    notes: notes || `تحويل من ${lot.code}`,
  }));
  const { error: convErr } = await supabase.from("proj2_lot_conversions").insert(convRows);
  if (convErr) return NextResponse.json({ error: convErr.message }, { status: 500 });

  // Create stock-in movements for each item
  const movements = items.map((i: any) => ({
    project_id: id,
    item_id: i.item_id,
    type: "in",
    quantity: Number(i.quantity),
    ref_type: "lot_conversion",
    ref_id: lotId,
    movement_date: convDate,
    notes: `تحويل من ${lot.code}${notes ? " — " + notes : ""}`,
  }));
  const { error: movErr } = await supabase.from("proj2_stock_movements").insert(movements);
  if (movErr) return NextResponse.json({ error: movErr.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
