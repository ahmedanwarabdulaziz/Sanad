import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── Server-side validation ────────────────────────────────────────────
function validateInvestor(body: Record<string, unknown>) {
  const errors: Record<string, string> = {};

  // Name: required, ≥ 2 chars
  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    errors.name = "الاسم مطلوب";
  } else if (body.name.trim().length < 2) {
    errors.name = "الاسم يجب أن يكون حرفين على الأقل";
  }

  // Email: optional, valid format if provided
  if (body.email && typeof body.email === "string" && body.email.trim()) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
      errors.email = "البريد الإلكتروني غير صالح";
    }
  }

  // Phone 1: required, Egyptian format (11 digits starting with 01)
  if (!body.phone || typeof body.phone !== "string" || !body.phone.trim()) {
    errors.phone = "رقم الهاتف الأول مطلوب";
  } else {
    const cleaned = body.phone.toString().replace(/[\s\-]/g, "");
    if (!/^01[0-9]{9}$/.test(cleaned)) {
      errors.phone = "رقم هاتف غير صالح — يجب أن يكون 11 رقماً ويبدأ بـ 01";
    }
  }

  // Phone 2: optional, same format if provided
  if (body.phone_2 && typeof body.phone_2 === "string" && body.phone_2.trim()) {
    const cleaned = body.phone_2.replace(/[\s\-]/g, "");
    if (!/^01[0-9]{9}$/.test(cleaned)) {
      errors.phone_2 = "رقم هاتف غير صالح — يجب أن يكون 11 رقماً ويبدأ بـ 01";
    }
  }

  // National ID: optional, exactly 14 digits if provided
  if (body.national_id && typeof body.national_id === "string" && body.national_id.trim()) {
    if (!/^\d{14}$/.test(body.national_id.trim())) {
      errors.national_id = "رقم البطاقة القومية يجب أن يتكون من 14 رقماً";
    }
  }

  return errors;
}

// ── GET /api/sanad-zayed/investors ────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await requireAuth("viewer");
  if ("error" in auth) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() ?? "";

    let query = supabase
      .from("sz_investors")
      .select(`
        *,
        sz_treasury_transactions (amount, transaction_type),
        sz_investor_contracts (id, status, total_contract_value)
      `)
      .order("created_at", { ascending: false });

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,national_id.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Reconciliation deltas, grouped by investor, so "remaining" matches the
    // same balance formula used on the investor ledger/statement pages.
    const investorIds = (data ?? []).map((inv: any) => inv.id);
    const reconciliationByInvestor = new Map<string, number>();
    if (investorIds.length > 0) {
      const { data: reconciliations } = await supabase
        .from("sz_area_reconciliations")
        .select("delta_amount, contract:contract_id(investor_id)");

      for (const r of reconciliations ?? []) {
        const investorId = (r as any).contract?.investor_id;
        if (!investorId) continue;
        reconciliationByInvestor.set(investorId, (reconciliationByInvestor.get(investorId) ?? 0) + Number(r.delta_amount));
      }
    }

    // Calculate total payments / returns / contract value / remaining balance for each investor
    const investorsWithTotals = data.map((inv: any) => {
      const transactions = inv.sz_treasury_transactions ?? [];
      const contracts = inv.sz_investor_contracts ?? [];

      const deposits = transactions
        .filter((tx: any) => tx.transaction_type === "DEPOSIT")
        .reduce((sum: number, tx: any) => sum + Number(tx.amount), 0);
      const withdrawals = transactions
        .filter((tx: any) => tx.transaction_type === "WITHDRAWAL")
        .reduce((sum: number, tx: any) => sum + Number(tx.amount), 0);
      const contractValue = contracts
        .filter((c: any) => c.status === "ACTIVE")
        .reduce((sum: number, c: any) => sum + Number(c.total_contract_value), 0);
      const reconciliationDelta = reconciliationByInvestor.get(inv.id) ?? 0;

      const { sz_treasury_transactions, sz_investor_contracts, ...rest } = inv;
      return {
        ...rest,
        total_paid: deposits,
        total_returned: withdrawals,
        net_paid: deposits - withdrawals,
        contract_value: contractValue,
        remaining_balance: deposits - withdrawals - contractValue - reconciliationDelta,
        has_transactions: transactions.length > 0,
        has_contracts: contracts.length > 0,
      };
    });

    return NextResponse.json({ investors: investorsWithTotals });
  } catch {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

// ── POST /api/sanad-zayed/investors ───────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();

    const errors = validateInvestor(body);
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 422 });
    }

    const { data, error } = await supabase
      .from("sz_investors")
      .insert({
        name:                   body.name.trim(),
        email:                  body.email?.trim() ?? "",
        phone:                  body.phone.trim().replace(/[\s\-]/g, ""),
        phone_2:                body.phone_2?.trim().replace(/[\s\-]/g, "") ?? "",
        national_id:            body.national_id?.trim() ?? "",
        job_in_national_id:     body.job_in_national_id?.trim() ?? "",
        address_in_national_id: body.address_in_national_id?.trim() ?? "",
        notes:                  body.notes?.trim() ?? "",
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ investor: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
