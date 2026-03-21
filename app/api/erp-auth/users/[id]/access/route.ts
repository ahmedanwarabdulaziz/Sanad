import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET /api/erp-auth/users/[id]/access — get user's module & project access
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [moduleAccess, projectAccess] = await Promise.all([
      supabase
        .from("user_module_access")
        .select("module_id, role")
        .eq("user_id", id),
      supabase
        .from("user_project_access")
        .select("project_id, role")
        .eq("user_id", id),
    ]);

    if (moduleAccess.error || projectAccess.error) {
      return NextResponse.json(
        { error: moduleAccess.error?.message || projectAccess.error?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      modules: moduleAccess.data,
      projects: projectAccess.data,
    });
  } catch {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

// PUT /api/erp-auth/users/[id]/access — replace user's module & project access
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { modules, projects } = await request.json();

    // Update module access: delete all then insert new
    if (Array.isArray(modules)) {
      await supabase
        .from("user_module_access")
        .delete()
        .eq("user_id", id);

      if (modules.length > 0) {
        const rows = modules.map(
          (m: { module_id: string; role: string }) => ({
            user_id: id,
            module_id: m.module_id,
            role: m.role,
          })
        );
        const { error } = await supabase
          .from("user_module_access")
          .insert(rows);
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      }
    }

    // Update project access: delete all then insert new
    if (Array.isArray(projects)) {
      await supabase
        .from("user_project_access")
        .delete()
        .eq("user_id", id);

      if (projects.length > 0) {
        const rows = projects.map(
          (p: { project_id: string; role: string }) => ({
            user_id: id,
            project_id: p.project_id,
            role: p.role,
          })
        );
        const { error } = await supabase
          .from("user_project_access")
          .insert(rows);
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ message: "تم تحديث الصلاحيات بنجاح" });
  } catch {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
