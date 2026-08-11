import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── PATCH /api/sanad-zayed/units/[id] ────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.building_code !== undefined) update.building_code = (body.building_code as string)?.trim() || "";
    if (body.floor !== undefined) update.floor = (body.floor as string)?.trim() || "";
    if (body.unit_code !== undefined) update.unit_code = (body.unit_code as string)?.trim();
    if (body.licensed_area !== undefined) update.licensed_area = Number(body.licensed_area);
    if (body.notes !== undefined) update.notes = (body.notes as string)?.trim() || "";

    const { data, error } = await supabase.from("sz_units").update(update).eq("id", id).select().single();
    if (error) throw error;

    return NextResponse.json({ unit: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}

// ── DELETE /api/sanad-zayed/units/[id] ───────────────────────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth("admin");
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;

    const { count, error: allocError } = await supabase
      .from("sz_unit_allocations")
      .select("id", { count: "exact", head: true })
      .eq("unit_id", id);
    if (allocError) throw allocError;
    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: "لا يمكن حذف وحدة مخصصة لمستثمر — احذف التخصيص أولاً" }, { status: 409 });
    }

    const { error } = await supabase.from("sz_units").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ message: "تم حذف الوحدة" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}
