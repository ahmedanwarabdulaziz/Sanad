import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// PATCH — update company expense
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const { expenseId } = await params;
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.description !== undefined) updates.description = body.description;
    if (body.amount !== undefined) updates.amount = Number(body.amount);
    if (body.type !== undefined) updates.type = body.type;
    if (body.expense_date !== undefined) updates.expense_date = body.expense_date;
    if (body.notes !== undefined) updates.notes = body.notes || null;

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("company_expenses")
      .update(updates)
      .eq("id", expenseId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ expense: data });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE — delete company expense
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const { expenseId } = await params;
    const { error } = await supabase
      .from("company_expenses")
      .delete()
      .eq("id", expenseId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
