import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gallery_tag_groups")
    .select("*, gallery_tags(*)")
    .eq("project_id", projectId)
    .order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ groups: data });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gallery_tag_groups")
    .insert({ project_id: projectId, name: body.name, allow_multiple: body.allow_multiple ?? false })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ group: data }, { status: 201 });
}
