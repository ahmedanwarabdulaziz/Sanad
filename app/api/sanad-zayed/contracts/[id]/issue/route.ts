import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";
import { loadInvestorWallet, availableForContract } from "@/lib/sanad-zayed/investorWallet";
import {
  resolveValues, parseAmount, parseSchedule, parseDmy, formatNumber, upgradeTemplateBody, missingVariables, variableLabels,
  CONTRACT_LOCKED_VARS,
  DEFAULT_TEMPLATE_BODY,
} from "@/lib/sanad-zayed/contractTemplate";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── POST /api/sanad-zayed/contracts/[id]/issue ────────────────────────
// Issues (or re-issues) the contract document:
//  • the paid amount and installment schedule are resolved server-side from
//    the saved per-contract values and frozen into document_vars,
//  • the paid amount may not exceed what the investor's wallet holds for it,
//  • the pending amount is written to sz_contract_installments (pending rows
//    are replaced; installments already PAID are kept),
//  • issued_at is set, which locks the contract's paid share in the wallet.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const { data: contract, error } = await supabase
      .from("sz_investor_contracts")
      .select(`
        id, stage_id, investor_id, contract_date, unit_quantity, unit_price_at_contract,
        total_contract_value, status, document_vars, issued_at,
        investor:investor_id(id, name, phone, email, national_id, address_in_national_id, job_in_national_id),
        stage:stage_id(id, name),
        installments:sz_contract_installments(id, seq, due_date, amount, status)
      `)
      .eq("id", id)
      .single();
    if (error || !contract) return NextResponse.json({ error: "العقد غير موجود" }, { status: 404 });
    if (contract.status !== "ACTIVE") return NextResponse.json({ error: "لا يمكن إصدار عقد غير نشط" }, { status: 422 });

    // Per-contract values sent with the request (latest edits), else the saved ones.
    const vars: Record<string, string> = {};
    for (const [k, v] of Object.entries((body.document_vars ?? contract.document_vars ?? {}) as Record<string, unknown>)) {
      const value = v === null || v === undefined ? "" : String(v).trim();
      if (/^[a-z0-9_]+$/i.test(k) && value && !CONTRACT_LOCKED_VARS.includes(k)) vars[k] = value;
    }

    const [{ data: template }, wallet] = await Promise.all([
      supabase.from("sz_contract_templates").select("body, defaults").eq("stage_id", contract.stage_id).maybeSingle(),
      loadInvestorWallet(supabase, contract.investor_id),
    ]);
    const available = availableForContract(wallet, id);

    const values = resolveValues(
      { ...(contract as any), wallet_paid: available },
      (template?.defaults ?? {}) as Record<string, string>,
      vars
    );
    // Every field the document prints must be filled before it can be issued.
    const missing = missingVariables(upgradeTemplateBody(template?.body || DEFAULT_TEMPLATE_BODY), values);
    if (missing.length) {
      return NextResponse.json({ error: `لا يمكن إصدار العقد — بيانات ناقصة: ${variableLabels(missing).join("، ")}` }, { status: 422 });
    }

    const total = parseAmount(values.financing_amount);
    const paid = parseAmount(values.paid_amount);
    const pending = parseAmount(values.pending_amount) || 0;

    if (!(total > 0)) return NextResponse.json({ error: "قيمة العقد غير صالحة" }, { status: 422 });
    if (!Number.isFinite(paid) || paid < 0) return NextResponse.json({ error: "المبلغ المسدد غير صالح" }, { status: 422 });
    if (paid > available + 0.5) {
      return NextResponse.json(
        { error: `المبلغ المسدد (${formatNumber(paid)}) أكبر من رصيد المستثمر المتاح لهذا العقد (${formatNumber(available)})` },
        { status: 422 }
      );
    }
    if (Math.abs(paid + pending - total) > 0.5) {
      return NextResponse.json({ error: "المسدد + المتبقي لا يساوي قيمة العقد" }, { status: 422 });
    }

    const rows = pending > 0 ? parseSchedule(values.installments ?? "") : [];
    const schedule = rows.map((r, i) => ({ n: i + 1, date: parseDmy(r.date), amount: parseAmount(r.amount) }));
    if (pending > 0) {
      if (!schedule.length) return NextResponse.json({ error: "يجب تحديد أقساط المبلغ المتبقي" }, { status: 422 });
      const bad = schedule.find(r => !r.date || !(r.amount > 0));
      if (bad) return NextResponse.json({ error: `القسط رقم ${bad.n} ينقصه تاريخ أو مبلغ صحيح` }, { status: 422 });
      const sum = schedule.reduce((s, r) => s + r.amount, 0);
      if (Math.abs(sum - pending) > 0.5) {
        return NextResponse.json({ error: `مجموع الأقساط (${formatNumber(sum)}) لا يساوي المبلغ المتبقي (${formatNumber(pending)})` }, { status: 422 });
      }
    }

    // Replace pending installments with the issued schedule; keep paid ones.
    const paidInstallments = (contract.installments ?? []).filter((i: any) => i.status === "PAID");
    const pendingIds = (contract.installments ?? []).filter((i: any) => i.status !== "PAID").map((i: any) => i.id);
    if (pendingIds.length) {
      const { error: dErr } = await supabase.from("sz_contract_installments").delete().in("id", pendingIds);
      if (dErr) throw dErr;
    }
    const startSeq = paidInstallments.reduce((m: number, i: any) => Math.max(m, Number(i.seq) || 0), 0);
    if (schedule.length) {
      const { error: iErr } = await supabase.from("sz_contract_installments").insert(
        schedule.map(r => ({
          contract_id: id,
          seq: startSeq + r.n,
          label: `القسط ${r.n} من ${schedule.length}`,
          due_date: r.date!.toISOString().slice(0, 10),
          amount: r.amount,
          status: "PENDING",
        }))
      );
      if (iErr) throw iErr;
    }

    // Freeze the issued figures so the document stays as issued.
    const frozen = { ...vars, paid_amount: formatNumber(paid), installments: values.installments ?? "" };
    if (!frozen.installments) delete (frozen as Record<string, string>).installments;
    const issuedAt = new Date().toISOString();
    const { error: uErr } = await supabase
      .from("sz_investor_contracts")
      .update({ document_vars: frozen, issued_at: issuedAt, updated_at: issuedAt })
      .eq("id", id);
    if (uErr) throw uErr;

    return NextResponse.json({
      issued_at: issuedAt,
      document_vars: frozen,
      paid,
      pending,
      installments: schedule.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}
