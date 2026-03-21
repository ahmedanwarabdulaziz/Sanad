import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET — list company expenses
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from("company_expenses")
      .select("*")
      .eq("project_id", id)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ expenses: data });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST — create company expense
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { description, amount, type, expense_date, notes } = body;

    if (!description) return NextResponse.json({ error: "الوصف مطلوب" }, { status: 400 });
    if (!amount || Number(amount) <= 0) return NextResponse.json({ error: "المبلغ مطلوب" }, { status: 400 });

    const { data, error } = await supabase
      .from("company_expenses")
      .insert({
        project_id: id,
        description,
        amount: Number(amount),
        type: type || "EXPENSE",
        expense_date: expense_date || new Date().toISOString().split("T")[0],
        notes: notes || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ expense: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
