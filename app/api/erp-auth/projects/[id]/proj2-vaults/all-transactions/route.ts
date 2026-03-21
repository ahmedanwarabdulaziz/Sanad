import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET /api/erp-auth/projects/[id]/proj2-vaults/all-transactions
// Returns all vault transactions for the project, optionally filtered by vault_id
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const vaultId = searchParams.get("vault_id");

  // Get all vault IDs that belong to this project
  const { data: vaults } = await supabase
    .from("proj2_vaults")
    .select("id, name, type")
    .eq("project_id", id);

  if (!vaults || vaults.length === 0) {
    return NextResponse.json({ transactions: [] });
  }

  const vaultIds = vaultId
    ? [vaultId]
    : vaults.map((v) => v.id);

  const { data, error } = await supabase
    .from("proj2_vault_transactions")
    .select("*")
    .in("vault_id", vaultIds)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach vault name to each transaction
  const vaultMap = Object.fromEntries(vaults.map((v) => [v.id, v]));
  const transactions = (data || []).map((tx) => ({
    ...tx,
    vault: vaultMap[tx.vault_id] || null,
  }));

  return NextResponse.json({ transactions });
}
