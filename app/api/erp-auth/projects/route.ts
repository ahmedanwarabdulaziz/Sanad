import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET /api/erp-auth/projects — list all projects
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select("*, project_stages(count)")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ projects: data });
  } catch {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

// POST /api/erp-auth/projects — create a new project
export async function POST(request: Request) {
  try {
    const { name, slug, description, location, project_type } = await request.json();
    if (!name || !slug) {
      return NextResponse.json({ error: "الاسم والمعرف مطلوبان" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("projects")
      .insert({
        name,
        slug,
        description: description || "",
        location: location || "",
        project_type: project_type || "custom",
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes("duplicate")) {
        return NextResponse.json({ error: "معرف المشروع مستخدم بالفعل" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ project: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
