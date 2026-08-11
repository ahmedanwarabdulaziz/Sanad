import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── GET /api/sanad-zayed/contracts/[id]/installments ──────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth("viewer");
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from("sz_contract_installments")
      .select("*")
      .eq("contract_id", id)
      .order("seq", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ installments: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}

// ── POST /api/sanad-zayed/contracts/[id]/installments ──────────────────────
// With no body (or { seed_from_template: true }): generates the schedule from
// the contract's stage default template. With { rows: [...] }: creates a
// fully custom schedule instead (for special-case negotiated plans).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const { data: existing } = await supabase.from("sz_contract_installments").select("id").eq("contract_id", id);
    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "يوجد جدول دفعات لهذا العقد بالفعل" }, { status: 409 });
    }

    const { data: contract, error: cErr } = await supabase
      .from("sz_investor_contracts")
      .select("id, stage_id, total_contract_value, contract_date")
      .eq("id", id)
      .single();

    if (cErr || !contract) return NextResponse.json({ error: "العقد غير موجود" }, { status: 404 });

    let rows: { label: string; percentage: number; offset_days: number }[];

    if (body.rows && body.rows.length > 0) {
      rows = body.rows;
      const total = rows.reduce((sum, r) => sum + Number(r.percentage), 0);
      if (Math.abs(total - 100) > 0.01) {
        return NextResponse.json({ error: `مجموع نسب الدفعات يجب أن يكون 100% (الحالي: ${total}%)` }, { status: 422 });
      }
    } else {
      const { data: template } = await supabase
        .from("sz_stage_installment_templates")
        .select("label, percentage, offset_days")
        .eq("stage_id", contract.stage_id)
        .order("seq", { ascending: true });

      if (!template || template.length === 0) {
        return NextResponse.json({ error: "لا يوجد جدول دفعات افتراضي لهذه المرحلة — أضف بنود مخصصة" }, { status: 422 });
      }
      rows = template;
    }

    const contractDate = new Date(contract.contract_date);
    const total = Number(contract.total_contract_value);

    const installments = rows.map((r, i) => {
      const dueDate = new Date(contractDate);
      dueDate.setDate(dueDate.getDate() + (Number(r.offset_days) || 0));
      return {
        contract_id: id,
        seq: i + 1,
        label: r.label,
        due_date: dueDate.toISOString().split("T")[0],
        amount: Math.round((total * Number(r.percentage) / 100) * 100) / 100,
        status: "PENDING" as const,
      };
    });

    const { data, error } = await supabase.from("sz_contract_installments").insert(installments).select();
    if (error) throw error;

    return NextResponse.json({ installments: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}
