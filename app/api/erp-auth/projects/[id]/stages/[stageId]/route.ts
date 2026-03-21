import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// PATCH /api/erp-auth/projects/[id]/stages/[stageId]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stageId: string }> }
) {
  try {
    const { stageId } = await params;
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.stage_name !== undefined) updates.stage_name = body.stage_name;
    if (body.unit_type !== undefined) updates.unit_type = body.unit_type;
    if (body.base_unit_price !== undefined) updates.base_unit_price = body.base_unit_price;
    if (body.total_area !== undefined) updates.total_area = body.total_area;
    if (body.management_percentage !== undefined) updates.management_percentage = body.management_percentage;
    if (body.status !== undefined) updates.status = body.status;
    if (body.sort_order !== undefined) updates.sort_order = body.sort_order;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("project_stages")
      .update(updates)
      .eq("id", stageId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ stage: data });
  } catch {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

// DELETE /api/erp-auth/projects/[id]/stages/[stageId]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; stageId: string }> }
) {
  try {
    const { stageId } = await params;
    const { error } = await supabase
      .from("project_stages")
      .delete()
      .eq("id", stageId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ message: "تم حذف المرحلة" });
  } catch {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
