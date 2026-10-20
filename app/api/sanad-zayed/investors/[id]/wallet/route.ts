import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";
import { loadInvestorWallet } from "@/lib/sanad-zayed/investorWallet";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── GET /api/sanad-zayed/investors/[id]/wallet ────────────────────────
// Net paid, amount locked by issued contracts, and the refundable balance.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth("viewer");
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const wallet = await loadInvestorWallet(supabase, id);
    return NextResponse.json({ net: wallet.net, locked: wallet.locked, refundable: wallet.refundable });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}
