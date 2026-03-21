import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// PATCH: edit vault name/type/user
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; vaultId: string }> }) {
  const { id, vaultId } = await params;
  const body = await req.json();
  const { data, error } = await supabase
    .from("proj2_vaults").update({ name: body.name, type: body.type, user_id: body.user_id || null })
    .eq("id", vaultId).eq("project_id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ vault: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; vaultId: string }> }) {
  const { id, vaultId } = await params;
  const { error } = await supabase.from("proj2_vaults").delete().eq("id", vaultId).eq("project_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
