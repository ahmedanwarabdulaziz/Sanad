import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string, categoryId: string }> }
) {
  try {
    const { id, categoryId } = await params;
    const body = await request.json();

    if (!body.name) return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });

    const { data, error } = await supabase
      .from("proj2_categories")
      .update({ name: body.name, description: body.description || "" })
      .eq("id", categoryId)
      .eq("project_id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ category: data });
  } catch {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string, categoryId: string }> }
) {
  try {
    const { id, categoryId } = await params;
    const { error } = await supabase
      .from("proj2_categories")
      .delete()
      .eq("id", categoryId)
      .eq("project_id", id);

    // If there's an error (e.g. restriction due to items relying on it) return it clearly
    if (error) {
       if (error.code === '23503') return NextResponse.json({ error: "لا يمكن حذف المجموعة لوجود أصناف مرتبطة بها" }, { status: 400 });
       return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
