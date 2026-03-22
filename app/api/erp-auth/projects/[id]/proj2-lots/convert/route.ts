import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// POST: convert from the general lot pool into stock items (no specific lot)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { items, conversion_date, notes } = await req.json();

  if (!items || items.length === 0)
    return NextResponse.json({ error: "أضف صنفاً واحداً على الأقل" }, { status: 400 });

  const convDate = conversion_date || new Date().toISOString().split("T")[0];

  // Insert conversion records (lot_id = null = from general pool)
  const convRows = items.map((i: any) => ({
    lot_id: null,
    project_id: id,
    item_id: i.item_id,
    quantity: Number(i.quantity),
    unit_price: Number(i.unit_price),
    conversion_date: convDate,
    notes: notes || "تحويل من مخزون اللوتات",
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
    ref_id: null,
    movement_date: convDate,
    notes: notes || "تحويل من مخزون اللوتات",
  }));
  const { error: movErr } = await supabase.from("proj2_stock_movements").insert(movements);
  if (movErr) return NextResponse.json({ error: movErr.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
