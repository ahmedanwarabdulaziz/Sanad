import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from("proj2_categories")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ categories: data });
  } catch {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: "اسم المجموعة مطلوب" }, { status: 400 });
    }

    const { data: existing } = await supabase.from("proj2_categories").select("code").eq("project_id", id);
    let nextNum = 1;
    if (existing && existing.length > 0) {
       const nums = existing.map(c => {
         const match = c.code ? c.code.match(/\d+/) : null;
         return match ? parseInt(match[0]) : 0;
       });
       nextNum = Math.max(...nums) + 1;
    }
    const code = `C-${String(nextNum).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from("proj2_categories")
      .insert({
        project_id: id,
        name: body.name,
        code,
        description: body.description || "",
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ category: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
