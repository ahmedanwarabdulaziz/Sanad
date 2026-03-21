import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; tid: string }> }
) {
  const { tid } = await params;
  const body = await req.json();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gallery_tags")
    .update({ name: body.name, group_id: body.group_id })
    .eq("id", tid)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tag: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; tid: string }> }
) {
  const { tid } = await params;
  const supabase = await createClient();
  const { error } = await supabase.from("gallery_tags").delete().eq("id", tid);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
