import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── POST /api/sanad-zayed/contracts/[id]/installments/add-row ───────────
// Appends a single custom installment (amount + due date) to a contract's
// schedule — unlike the bulk "generate from template" flow, this works
// whether or not a schedule already exists, so the remaining unscheduled
// balance can be split into ad hoc dated chunks (e.g. "3 now, 7 next month").
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const { label, amount, due_date } = body;

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "المبلغ غير صحيح" }, { status: 422 });
    }
    if (!due_date) {
      return NextResponse.json({ error: "التاريخ مطلوب" }, { status: 422 });
    }

    const { data: contract, error: cErr } = await supabase
      .from("sz_investor_contracts")
      .select("id")
      .eq("id", id)
      .single();

    if (cErr || !contract) {
      return NextResponse.json({ error: "العقد غير موجود" }, { status: 404 });
    }

    const { data: existing } = await supabase
      .from("sz_contract_installments")
      .select("seq")
      .eq("contract_id", id)
      .order("seq", { ascending: false })
      .limit(1);

    const nextSeq = existing && existing.length > 0 ? Number(existing[0].seq) + 1 : 1;

    const { data, error } = await supabase
      .from("sz_contract_installments")
      .insert({
        contract_id: id,
        seq: nextSeq,
        label: label?.trim() || `دفعة ${nextSeq}`,
        due_date,
        amount: Number(amount),
        status: "PENDING",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ installment: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}
