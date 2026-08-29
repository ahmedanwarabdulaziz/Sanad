import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── GET /api/sanad-zayed/investor-returns ─────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await requireAuth("viewer");
  if ("error" in auth) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const investorId = searchParams.get("investor_id");

    // Fetch Treasury Transactions that are WITHDRAWALs for Investors with reason_type = 'CREDIT_REFUND'
    let query = supabase
      .from("sz_treasury_transactions")
      .select(`
        *,
        from_account:from_account_id(account_name),
        investor:investor_id(name)
      `)
      .eq("transaction_type", "WITHDRAWAL")
      .eq("reason_type", "CREDIT_REFUND")
      .not("investor_id", "is", null)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (investorId) {
      query = query.eq("investor_id", investorId);
    }

    const { data: returns, error } = await query;
    if (error) throw error;

    return NextResponse.json({ returns });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}

// ── POST /api/sanad-zayed/investor-returns ────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();

    const {
      from_account_id,
      amount,
      description,
      investor_id,
      transaction_date,
      return_category,
    } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "المبلغ غير صالح" }, { status: 422 });
    }
    if (!from_account_id) {
      return NextResponse.json({ error: "يجب تحديد الخزينة" }, { status: 422 });
    }
    if (!investor_id) {
      return NextResponse.json({ error: "يجب تحديد المستثمر" }, { status: 422 });
    }
    if (!return_category) {
      return NextResponse.json({ error: "يجب تحديد نوع المرتجع" }, { status: 422 });
    }

    const finalDescription = `${return_category} - ${description?.trim() || ""}`;

    // Insert transaction. The trg_sz_update_balance Postgres trigger
    // will automatically update the account balances!
    const { data, error } = await supabase
      .from("sz_treasury_transactions")
      .insert({
        transaction_type: "WITHDRAWAL",
        from_account_id,
        to_account_id: null,
        amount,
        description: finalDescription,
        investor_id,
        contract_id: null,
        reason_type: "CREDIT_REFUND",
        transaction_date: transaction_date || new Date().toISOString().split("T")[0],
      })
      .select(`
        *,
        from_account:from_account_id(account_name),
        investor:investor_id(name)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ returnTransaction: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}
