import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string, itemId: string }> }
) {
  try {
    const { id, itemId } = await params;
    const body = await request.json();

    // Guard: system items cannot be modified
    const { data: existing } = await supabase.from("proj2_items").select("is_system").eq("id", itemId).single();
    if (existing?.is_system) return NextResponse.json({ error: "هذا صنف نظام ولا يمكن تعديله" }, { status: 403 });

    if (!body.name || !body.unit || !body.category_id) return NextResponse.json({ error: "الاسم والوحدة والمجموعة مطلوبين" }, { status: 400 });

    const { data, error } = await supabase
      .from("proj2_items")
      .update({ name: body.name, unit: body.unit, category_id: body.category_id })
      .eq("id", itemId)
      .eq("project_id", id)
      .select("*, category:proj2_categories(name)")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ item: data });
  } catch {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string, itemId: string }> }
) {
  try {
    const { id, itemId } = await params;

    // Guard: system items cannot be deleted
    const { data: existing } = await supabase.from("proj2_items").select("is_system").eq("id", itemId).single();
    if (existing?.is_system) return NextResponse.json({ error: "هذا صنف نظام ولا يمكن حذفه" }, { status: 403 });

    const { error } = await supabase
      .from("proj2_items")
      .delete()
      .eq("id", itemId)
      .eq("project_id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
