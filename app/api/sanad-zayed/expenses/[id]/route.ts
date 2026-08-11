import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── PATCH /api/sanad-zayed/expenses/[id] ────────────────────────────────
// Partial update — only fields present in the body are touched, so callers
// (the investor-override editor and the investor-recovery linker) never
// clobber each other's fields.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if ("investor_override_description" in body) {
      update.investor_override_description = body.investor_override_description?.trim() || null;
    }
    if ("investor_override_amount" in body) {
      update.investor_override_amount =
        body.investor_override_amount !== undefined && body.investor_override_amount !== "" && body.investor_override_amount !== null
          ? Number(body.investor_override_amount)
          : null;
    }
    if ("hide_from_investor" in body) {
      update.hide_from_investor = Boolean(body.hide_from_investor);
    }
    if ("recoverable_investor_id" in body) {
      const newInvestorId = body.recoverable_investor_id || null;

      if (newInvestorId) {
        const { count } = await supabase
          .from("sz_expense_allocations")
          .select("id", { count: "exact", head: true })
          .eq("expense_id", id);

        if ((count ?? 0) > 0) {
          return NextResponse.json(
            { error: "لا يمكن ربط المصروف بمستثمر — موزّع على مرحلة بالفعل. ألغِ توزيع المرحلة أولاً" },
            { status: 422 }
          );
        }
      }

      update.recoverable_investor_id = newInvestorId;
    }

    const { data, error } = await supabase
      .from("sz_expenses")
      .update(update)
      .eq("id", id)
      .select(`*, financial_account:financial_account_id(account_name), allocations:sz_expense_allocations(id, stage_id, percentage, stage:stage_id(name)), payments:sz_expense_payments(id, amount, paid_date), recoverable_investor:recoverable_investor_id(id, name)`)
      .single();

    if (error) throw error;

    // Linking/unlinking an investor after the fact must retroactively re-tag any
    // payments already made on this expense — otherwise money already paid never
    // shows up against the investor's balance (or keeps showing after unlinking).
    if ("recoverable_investor_id" in body) {
      const newInvestorId = body.recoverable_investor_id || null;
      const { error: txUpdateError } = await supabase
        .from("sz_treasury_transactions")
        .update(
          newInvestorId
            ? { investor_id: newInvestorId, reason_type: "PERSONAL_SERVICE_DEDUCTION", transaction_type: "WITHDRAWAL" }
            : { investor_id: null, reason_type: null, transaction_type: "EXPENSE" }
        )
        .eq("expense_id", id);

      if (txUpdateError) throw txUpdateError;
    }

    return NextResponse.json({ expense: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}
