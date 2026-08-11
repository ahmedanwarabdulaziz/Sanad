import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET() {
  const auth = await requireAuth("viewer");
  if ("error" in auth) return auth.error;

  try {
    const [investors, stages, contracts, expenses] = await Promise.all([
      supabase.from("sz_investors").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("sz_stages").select("id", { count: "exact", head: true }),
      supabase.from("sz_investor_contracts").select("total_contract_value").eq("status", "ACTIVE"),
      supabase.from("sz_expenses").select("actual_paid_amount").eq("status", "APPROVED"),
    ]);

    const totalInvestors = investors.count ?? 0;
    const totalStages = stages.count ?? 0;
    const totalContracts = contracts.data?.length ?? 0;
    const totalInvested = contracts.data?.reduce(
      (sum, c) => sum + (Number(c.total_contract_value) || 0),
      0
    ) ?? 0;
    const totalExpenses = expenses.data?.reduce(
      (sum, e) => sum + (Number(e.actual_paid_amount) || 0),
      0
    ) ?? 0;

    return NextResponse.json({
      totalInvestors,
      totalStages,
      totalContracts,
      totalInvested,
      totalExpenses,
    });
  } catch {
    // Tables may not exist yet — return zeros gracefully
    return NextResponse.json({
      totalInvestors: 0,
      totalStages: 0,
      totalContracts: 0,
      totalInvested: 0,
      totalExpenses: 0,
    });
  }
}
