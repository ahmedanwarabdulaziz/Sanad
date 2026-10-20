import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";
import { loadInvestorWallet, availableForContract } from "@/lib/sanad-zayed/investorWallet";
import { CONTRACT_LOCKED_VARS } from "@/lib/sanad-zayed/contractTemplate";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── GET /api/sanad-zayed/contracts/[id]/document ──────────────────────
// Everything needed to render the printable contract: the contract with its
// investor and stage, the stage's template, the per-contract overrides, and
// the investor's wallet (what has actually been paid towards this contract).
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth("viewer");
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const { data: contract, error } = await supabase
      .from("sz_investor_contracts")
      .select(`
        id, stage_id, investor_id, contract_date, unit_quantity, unit_price_at_contract,
        total_contract_value, status, document_vars, issued_at,
        investor:investor_id(id, name, phone, national_id, address_in_national_id, job_in_national_id),
        stage:stage_id(id, name),
        installments:sz_contract_installments(seq, due_date, amount, status)
      `)
      .eq("id", id)
      .single();

    if (error || !contract) return NextResponse.json({ error: "العقد غير موجود" }, { status: 404 });

    const [{ data: template, error: tErr }, wallet] = await Promise.all([
      supabase.from("sz_contract_templates").select("*").eq("stage_id", contract.stage_id).maybeSingle(),
      loadInvestorWallet(supabase, contract.investor_id),
    ]);
    if (tErr) throw tErr;

    const available = availableForContract(wallet, id);
    return NextResponse.json({
      contract: { ...contract, wallet_paid: available },
      template,
      wallet: {
        net: wallet.net,
        locked: wallet.locked,
        locked_by_others: wallet.locked - (wallet.contracts.find(c => c.id === id)?.claim ?? 0),
        refundable: wallet.refundable,
        available_for_contract: available,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}

// ── PUT /api/sanad-zayed/contracts/[id]/document ──────────────────────
// Saves the per-contract variable overrides entered before review.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const vars: Record<string, string> = {};
    for (const [k, v] of Object.entries((body.document_vars ?? {}) as Record<string, unknown>)) {
      const value = v === null || v === undefined ? "" : String(v).trim();
      if (/^[a-z0-9_]+$/i.test(k) && value && !CONTRACT_LOCKED_VARS.includes(k)) vars[k] = value;
    }

    const { error } = await supabase
      .from("sz_investor_contracts")
      .update({ document_vars: vars, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;

    return NextResponse.json({ document_vars: vars });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}
