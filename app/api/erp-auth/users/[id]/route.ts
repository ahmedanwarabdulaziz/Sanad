import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// PATCH /api/erp-auth/users/[id] — update user role or status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.role) {
      const validRoles = ["super_admin", "admin", "editor", "viewer"];
      if (!validRoles.includes(body.role)) {
        return NextResponse.json(
          { error: "صلاحية غير صالحة" },
          { status: 400 }
        );
      }
      updates.role = body.role;
    }

    if (typeof body.is_active === "boolean") {
      updates.is_active = body.is_active;
    }

    if (body.name) {
      updates.name = body.name;
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("erp_users")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ user: data });
  } catch {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

// DELETE /api/erp-auth/users/[id] — delete a user
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the auth_id first
    const { data: user, error: fetchError } = await supabase
      .from("erp_users")
      .select("auth_id")
      .eq("id", id)
      .single();

    if (fetchError || !user) {
      return NextResponse.json(
        { error: "المستخدم غير موجود" },
        { status: 404 }
      );
    }

    // Delete from erp_users
    const { error: deleteError } = await supabase
      .from("erp_users")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    // Delete from Supabase Auth
    await supabase.auth.admin.deleteUser(user.auth_id);

    return NextResponse.json({ message: "تم حذف المستخدم بنجاح" });
  } catch {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
