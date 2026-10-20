import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── PATCH /api/sanad-zayed/contracts/[id] ─────────────────────────────
// Edits area/price/date/notes/status. The stage itself is not editable here —
// changing it would invalidate the sold-area accounting for two stages at
// once, so a wrong-stage contract should be cancelled and recreated instead.
// total_contract_value is always recomputed server-side, never trusted from
// the client, so it can never drift from area × price × (1 + fee%).
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();

    if (body.status && !["ACTIVE", "SETTLED", "CANCELLED"].includes(body.status)) {
      return NextResponse.json({ error: "حالة العقد غير صالحة" }, { status: 422 });
    }

    const { data: current, error: curErr } = await supabase
      .from("sz_investor_contracts")
      .select("stage_id, unit_quantity, unit_price_at_contract, management_fee_pct")
      .eq("id", id)
      .single();

    if (curErr || !current) {
      return NextResponse.json({ error: "العقد غير موجود" }, { status: 404 });
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.status) update.status = body.status;
    if (body.notes !== undefined) update.notes = (body.notes as string)?.trim() ?? "";
    if (body.contract_date !== undefined) update.contract_date = body.contract_date;

    const areaChanging = body.unit_quantity !== undefined;
    const priceChanging = body.unit_price_at_contract !== undefined;

    if (areaChanging || priceChanging) {
      const newArea = areaChanging ? Number(body.unit_quantity) : Number(current.unit_quantity);
      const newPrice = priceChanging ? Number(body.unit_price_at_contract) : Number(current.unit_price_at_contract);

      if (!newArea || newArea <= 0) {
        return NextResponse.json({ error: "المساحة يجب أن تكون أكبر من صفر" }, { status: 422 });
      }
      if (!newPrice || newPrice <= 0) {
        return NextResponse.json({ error: "سعر المتر يجب أن يكون أكبر من صفر" }, { status: 422 });
      }

      if (areaChanging) {
        const { data: stage } = await supabase
          .from("sz_stages")
          .select("target_sellable_area")
          .eq("id", current.stage_id)
          .single();

        const { data: otherContracts } = await supabase
          .from("sz_investor_contracts")
          .select("unit_quantity")
          .eq("stage_id", current.stage_id)
          .eq("status", "ACTIVE")
          .neq("id", id);

        const soldByOthers = (otherContracts ?? []).reduce((sum, c) => sum + Number(c.unit_quantity), 0);

        if (stage && soldByOthers + newArea > Number(stage.target_sellable_area)) {
          return NextResponse.json(
            {
              error: `المساحة الجديدة تتجاوز المساحة القابلة للبيع في هذه المرحلة. المتاح: ${(
                Number(stage.target_sellable_area) - soldByOthers
              ).toFixed(2)} م²`,
            },
            { status: 422 }
          );
        }
      }

      update.unit_quantity = newArea;
      update.unit_price_at_contract = newPrice;
      update.total_contract_value = newArea * newPrice * (1 + Number(current.management_fee_pct) / 100);
    }

    const { data, error } = await supabase
      .from("sz_investor_contracts")
      .update(update)
      .eq("id", id)
      .select(`*, investor:investor_id(name), stage:stage_id(name)`)
      .single();

    if (error) throw error;

    return NextResponse.json({ contract: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}

// ── DELETE /api/sanad-zayed/contracts/[id] ────────────────────────────
// Permanently removes a contract together with its installments, unit
// allocations and pending reconciliations (all ON DELETE CASCADE). Refused
// when money has already moved against it (treasury transactions or settled
// reconciliations) or when a later-stage contract carries it over — those
// would lose their audit trail or pricing basis; cancel the contract instead.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth("admin");
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;

    const [{ count: txCount }, { count: settledCount }, { count: linkedCount }] = await Promise.all([
      supabase.from("sz_treasury_transactions").select("id", { count: "exact", head: true }).eq("contract_id", id),
      supabase.from("sz_area_reconciliations").select("id", { count: "exact", head: true }).eq("contract_id", id).eq("status", "SETTLED"),
      supabase.from("sz_investor_contracts").select("id", { count: "exact", head: true }).eq("linked_contract_id", id),
    ]);

    if ((txCount ?? 0) > 0 || (settledCount ?? 0) > 0) {
      return NextResponse.json(
        { error: "لا يمكن حذف عقد عليه مدفوعات أو تسويات مسجلة في الخزينة — غيّر حالته إلى «ملغي» بدلاً من ذلك" },
        { status: 409 }
      );
    }
    if ((linkedCount ?? 0) > 0) {
      return NextResponse.json(
        { error: "لا يمكن حذف هذا العقد لأن عقدًا في مرحلة لاحقة مرتبط به — احذف العقد اللاحق أولًا" },
        { status: 409 }
      );
    }

    const { data, error } = await supabase.from("sz_investor_contracts").delete().eq("id", id).select("id");
    if (error) throw error;
    if (!data?.length) return NextResponse.json({ error: "العقد غير موجود" }, { status: 404 });

    return NextResponse.json({ message: "تم حذف العقد" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}
