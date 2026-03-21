import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await supabase
    .from("proj2_vaults")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ vaults: data });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  if (!body.name || !body.type) return NextResponse.json({ error: "الاسم والنوع مطلوبان" }, { status: 400 });
  const { data, error } = await supabase
    .from("proj2_vaults")
    .insert({ project_id: id, name: body.name, type: body.type, user_id: body.user_id || null, balance: body.initial_balance || 0 })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Log initial deposit if balance > 0
  if ((body.initial_balance || 0) > 0) {
    await supabase.from("proj2_vault_transactions").insert({
      vault_id: data.id, type: "deposit", amount: body.initial_balance, ref_type: "manual", notes: "رصيد افتتاحي"
    });
  }
  return NextResponse.json({ vault: data }, { status: 201 });
}
