import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const groupId = req.nextUrl.searchParams.get("group_id");
  const supabase = await createClient();
  let query = supabase
    .from("gallery_tags")
    .select("*, gallery_tag_groups(name)")
    .order("created_at");

  // Filter by group if specified
  if (groupId) {
    query = query.eq("group_id", groupId);
  } else {
    // Filter to only tags belonging to this project's groups
    const { data: groups } = await supabase
      .from("gallery_tag_groups")
      .select("id")
      .eq("project_id", projectId);
    const groupIds = (groups || []).map((g: { id: string }) => g.id);
    if (groupIds.length === 0) return NextResponse.json({ tags: [] });
    query = query.in("group_id", groupIds);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tags: data });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params;
  const body = await req.json();
  if (!body.name || !body.group_id)
    return NextResponse.json({ error: "الاسم والمجموعة مطلوبان" }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gallery_tags")
    .insert({ group_id: body.group_id, name: body.name })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tag: data }, { status: 201 });
}
