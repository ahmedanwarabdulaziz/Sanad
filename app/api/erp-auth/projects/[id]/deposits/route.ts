import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET — list deposits for a project (optionally filtered by investor_id)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const investorId = request.nextUrl.searchParams.get("investor_id");

    let query = supabase
      .from("investor_deposits")
      .select("*, investor:investors(name), account:financial_accounts(account_name, account_type)")
      .eq("project_id", id)
      .order("deposit_date", { ascending: false });

    if (investorId) {
      query = query.eq("investor_id", investorId);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ deposits: data });
  } catch {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

// POST — create a deposit
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { investor_id, amount, financial_account_id, deposit_date, notes } = await request.json();

    if (!investor_id || !amount || !financial_account_id) {
      return NextResponse.json({ error: "جميع الحقول المطلوبة يجب ملؤها" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("investor_deposits")
      .insert({
        investor_id,
        project_id: id,
        amount,
        financial_account_id,
        deposit_date: deposit_date || new Date().toISOString().split("T")[0],
        notes: notes || "",
      })
      .select("*, investor:investors(name), account:financial_accounts(account_name)")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ deposit: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
