import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; gid: string }> }
) {
  const { gid } = await params;
  const body = await req.json();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gallery_tag_groups")
    .update({ name: body.name, allow_multiple: body.allow_multiple })
    .eq("id", gid)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ group: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; gid: string }> }
) {
  const { gid } = await params;
  const supabase = await createClient();
  const { error } = await supabase.from("gallery_tag_groups").delete().eq("id", gid);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
