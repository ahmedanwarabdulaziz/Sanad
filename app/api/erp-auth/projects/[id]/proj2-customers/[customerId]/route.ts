import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; customerId: string }> }) {
  try {
    const { id, customerId } = await params;
    const body = await request.json();
    if (!body.name) return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });
    const { data, error } = await supabase
      .from("proj2_customers")
      .update({ name: body.name, phones: body.phones || [], email: body.email || null, notes: body.notes || null })
      .eq("id", customerId).eq("project_id", id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ customer: data });
  } catch { return NextResponse.json({ error: "Server Error" }, { status: 500 }); }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; customerId: string }> }) {
  try {
    const { id, customerId } = await params;
    const { error } = await supabase.from("proj2_customers").delete().eq("id", customerId).eq("project_id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Server Error" }, { status: 500 }); }
}
