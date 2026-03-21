import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from("proj2_customers")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ customers: data });
  } catch { return NextResponse.json({ error: "Server Error" }, { status: 500 }); }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (!body.name) return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });
    const { data, error } = await supabase
      .from("proj2_customers")
      .insert({ project_id: id, name: body.name, phones: body.phones || [], email: body.email || null, notes: body.notes || null })
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ customer: data }, { status: 201 });
  } catch { return NextResponse.json({ error: "Server Error" }, { status: 500 }); }
}
