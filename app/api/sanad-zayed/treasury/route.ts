import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── GET /api/sanad-zayed/treasury ─────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await requireAuth("viewer");
  if ("error" in auth) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const investorId = searchParams.get("investor_id");

    // 1. Fetch Accounts
    const { data: accounts, error: accError } = await supabase
      .from("sz_financial_accounts")
      .select("*")
      .order("account_name");
      
    if (accError) throw accError;

    // 2. Fetch Ledger Transactions
    let txQuery = supabase
      .from("sz_treasury_transactions")
      .select(`
        *,
        from_account:from_account_id(account_name),
        to_account:to_account_id(account_name),
        investor:investor_id(name),
        contract:contract_id(id, stage:stage_id(name)),
        expense:expense_id(id, description)
      `)
      .order("created_at", { ascending: false });

    if (investorId) {
      txQuery = txQuery.eq("investor_id", investorId);
    }

    const { data: transactions, error: txError } = await txQuery;
    if (txError) throw txError;

    return NextResponse.json({ accounts, transactions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}

// ── POST /api/sanad-zayed/treasury ────────────────────────────────────
// Creates a new ledger transaction (Deposit, Withdrawal, Transfer)
export async function POST(request: NextRequest) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();

    const {
      transaction_type, // 'DEPOSIT', 'WITHDRAWAL', 'TRANSFER'
      from_account_id,
      to_account_id,
      amount,
      description,
      investor_id,
      contract_id,
    } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "المبلغ غير صالح" }, { status: 422 });
    }

    // Insert transaction. The trg_sz_update_balance Postgres trigger
    // will automatically update the account balances!
    const { data, error } = await supabase
      .from("sz_treasury_transactions")
      .insert({
        transaction_type,
        from_account_id: from_account_id || null,
        to_account_id: to_account_id || null,
        amount,
        description: description?.trim() || "",
        investor_id: investor_id || null,
        contract_id: contract_id || null,
        reason_type: investor_id && transaction_type === "DEPOSIT" ? "CONTRACT_PAYMENT" : null,
        transaction_date: new Date().toISOString().split("T")[0],
      })
      .select(`
        *,
        from_account:from_account_id(account_name),
        to_account:to_account_id(account_name),
        investor:investor_id(name),
        contract:contract_id(id, stage:stage_id(name))
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ transaction: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}
