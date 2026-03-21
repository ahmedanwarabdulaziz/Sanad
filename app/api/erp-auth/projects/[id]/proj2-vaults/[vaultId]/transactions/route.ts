import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET transactions for a vault
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; vaultId: string }> }) {
  const { vaultId } = await params;
  const { data, error } = await supabase
    .from("proj2_vault_transactions")
    .select("*")
    .eq("vault_id", vaultId)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ transactions: data });
}

// POST: manual deposit or withdrawal
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; vaultId: string }> }) {
  const { id, vaultId } = await params;
  const body = await req.json();
  const { type, amount, notes } = body;
  if (!["deposit", "withdrawal"].includes(type) || !amount || amount <= 0) {
    return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  }
  // Update balance
  const { data: vault } = await supabase.from("proj2_vaults").select("balance").eq("id", vaultId).single();
  if (!vault) return NextResponse.json({ error: "الخزنة غير موجودة" }, { status: 404 });
  const newBalance = type === "deposit" ? vault.balance + amount : vault.balance - amount;
  if (newBalance < 0) return NextResponse.json({ error: "الرصيد غير كافي" }, { status: 400 });
  await supabase.from("proj2_vaults").update({ balance: newBalance }).eq("id", vaultId);
  const { data, error } = await supabase.from("proj2_vault_transactions")
    .insert({ vault_id: vaultId, type, amount, ref_type: "manual", notes })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ transaction: data, newBalance }, { status: 201 });
}
