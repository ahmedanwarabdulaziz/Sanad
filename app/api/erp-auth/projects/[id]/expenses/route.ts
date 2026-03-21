import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET — list expenses for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const stageId = request.nextUrl.searchParams.get("stage_id");

    let query = supabase
      .from("project_expenses")
      .select("*, stage:project_stages(stage_name)")
      .eq("project_id", id)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (stageId) query = query.eq("stage_id", stageId);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Enrich with account names for each payment
    const accountIds = new Set<string>();
    (data || []).forEach((e) => {
      const payments = e.payments || [];
      payments.forEach((p: { account_id: string }) => { if (p.account_id) accountIds.add(p.account_id); });
      if (e.financial_account_id) accountIds.add(e.financial_account_id);
    });

    let accountMap: Record<string, string> = {};
    if (accountIds.size > 0) {
      const { data: accounts } = await supabase.from("financial_accounts").select("id, account_name").in("id", [...accountIds]);
      (accounts || []).forEach((a) => { accountMap[a.id] = a.account_name; });
    }

    const enriched = (data || []).map((e) => ({
      ...e,
      payments_display: (e.payments || []).map((p: { account_id: string; amount: number }) => ({
        ...p,
        account_name: accountMap[p.account_id] || "—",
      })),
      // backward compat
      account: e.financial_account_id ? { account_name: accountMap[e.financial_account_id] || "—" } : null,
    }));

    return NextResponse.json({ expenses: enriched });
  } catch {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

// Helper: compute account balance
async function getAccountBalance(accountId: string, projectId: string): Promise<number> {
  // Deposits into this account
  const { data: deposits } = await supabase
    .from("investor_deposits")
    .select("amount")
    .eq("financial_account_id", accountId)
    .eq("project_id", projectId);
  const totalDeposits = (deposits || []).reduce((s, d) => s + Number(d.amount), 0);

  // Transfers out
  const { data: txOut } = await supabase
    .from("treasury_transactions")
    .select("amount")
    .eq("from_account_id", accountId)
    .eq("project_id", projectId);
  const totalOut = (txOut || []).reduce((s, t) => s + Number(t.amount), 0);

  // Transfers in
  const { data: txIn } = await supabase
    .from("treasury_transactions")
    .select("amount")
    .eq("to_account_id", accountId)
    .eq("project_id", projectId)
    .eq("transaction_type", "TRANSFER");
  const totalIn = (txIn || []).reduce((s, t) => s + Number(t.amount), 0);

  return totalDeposits + totalIn - totalOut;
}

// POST — create expense
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.expense_name || !body.stage_id) {
      return NextResponse.json({ error: "اسم المصروف والمرحلة مطلوبان" }, { status: 400 });
    }

    // payments: [{account_id, amount}]
    const payments: { account_id: string; amount: number }[] = body.payments || [];

    // Validate each payment against account balance
    for (const p of payments) {
      if (p.amount <= 0) continue;
      const balance = await getAccountBalance(p.account_id, id);
      if (p.amount > balance) {
        // Get account name
        const { data: acc } = await supabase.from("financial_accounts").select("account_name").eq("id", p.account_id).single();
        const name = acc?.account_name || "الحساب";
        return NextResponse.json({
          error: `رصيد ${name} غير كافٍ. المتاح: ${balance.toLocaleString("en-US")} ج.م — المطلوب: ${p.amount.toLocaleString("en-US")} ج.م`
        }, { status: 400 });
      }
    }

    const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
    const companyAmt = Number(body.company_amount) || 0;
    const investorAmt = body.pricing_type === "DUAL" ? (Number(body.investor_amount) || 0) : companyAmt;
    // Payment validation is based on company_amount only (investor amount is charged to investors, not paid from treasury)
    const totalExpense = companyAmt;

    // Validate PAID: payments must equal company amount
    if (body.payment_status === "PAID" && totalPaid !== totalExpense) {
      return NextResponse.json({
        error: `حالة "مدفوع بالكامل" تتطلب أن يكون المبلغ المدفوع (${totalPaid.toLocaleString("en-US")}) يساوي مبلغ الشركة (${totalExpense.toLocaleString("en-US")})`
      }, { status: 400 });
    }

    // scheduled_payments: [{amount, due_date}]
    const scheduledPayments = body.scheduled_payments || [];

    const insert = {
      project_id: id,
      stage_id: body.stage_id,
      expense_name: body.expense_name,
      pricing_type: body.pricing_type || "SHARED",
      company_amount: companyAmt,
      investor_amount: investorAmt,
      payment_status: body.payment_status || "PAID",
      paid_amount: body.payment_status === "FUTURE" ? 0 : totalPaid,
      financial_account_id: payments.length > 0 ? payments[0].account_id : null,
      payments: payments,
      scheduled_payments: scheduledPayments,
      expense_date: body.expense_date || new Date().toISOString().split("T")[0],
      due_date: body.due_date || null,
      notes: body.notes || "",
      attachments: body.attachments || [],
      show_to_investors: body.show_to_investors !== false,
      investor_display_name: body.investor_display_name || null,
    };

    const { data, error } = await supabase
      .from("project_expenses")
      .insert(insert)
      .select("*, stage:project_stages(stage_name)")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Create treasury transactions for each payment (deduct from company)
    for (const p of payments) {
      if (p.amount <= 0) continue;
      await supabase.from("treasury_transactions").insert({
        project_id: id,
        transaction_type: "EXPENSE",
        from_account_id: p.account_id,
        to_account_id: null,
        amount: p.amount,
        description: `مصروف: ${insert.expense_name}`,
        reference_type: "expense",
        reference_id: data.id,
        transaction_date: insert.expense_date,
      });
    }

    return NextResponse.json({ expense: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
