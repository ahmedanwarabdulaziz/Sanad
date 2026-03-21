import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET — investor summary for a project: total deposited, total contracted, balance
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const investorId = request.nextUrl.searchParams.get("investor_id");

    // Get investors — all investors or a specific one
    let investorQuery = supabase.from("investors").select("*");

    if (investorId) {
      investorQuery = investorQuery.eq("id", investorId);
    }

    const { data: investors } = await investorQuery.order("name");

    // Get stage IDs for this project
    const { data: stages } = await supabase
      .from("project_stages")
      .select("id")
      .eq("project_id", id);
    const stageIds = (stages || []).map((s) => s.id);

    // Compute per-investor
    const summaries = await Promise.all(
      (investors || []).map(async (inv) => {
        // Total deposited
        const { data: deps } = await supabase
          .from("investor_deposits")
          .select("amount")
          .eq("project_id", id)
          .eq("investor_id", inv.id);
        const totalDeposited = (deps || []).reduce(
          (sum, d) => sum + Number(d.amount),
          0
        );

        // Total contracted (management already in unit_price, no double-counting)
        let totalContracted = 0;
        if (stageIds.length > 0) {
          const { data: contracts } = await supabase
            .from("investor_contracts")
            .select("unit_quantity, unit_price_at_contract")
            .eq("investor_id", inv.id)
            .in("stage_id", stageIds)
            .neq("status", "CANCELLED");
          totalContracted = (contracts || []).reduce(
            (sum, c) => sum + Number(c.unit_quantity) * Number(c.unit_price_at_contract),
            0
          );
        }

        return {
          ...inv,
          total_deposited: totalDeposited,
          total_contracted: totalContracted,
          remaining_balance: totalDeposited - totalContracted,
        };
      })
    );

    return NextResponse.json({ summaries });
  } catch {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
