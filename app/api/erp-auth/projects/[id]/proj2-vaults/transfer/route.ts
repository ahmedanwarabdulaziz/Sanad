import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// POST: transfer between two vaults
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const body = await req.json();
  const { from_vault_id, to_vault_id, amount, notes } = body;
  if (!from_vault_id || !to_vault_id || !amount || amount <= 0 || from_vault_id === to_vault_id) {
    return NextResponse.json({ error: "بيانات التحويل غير صحيحة" }, { status: 400 });
  }
  const [{ data: from }, { data: to }] = await Promise.all([
    supabase.from("proj2_vaults").select("balance, name").eq("id", from_vault_id).single(),
    supabase.from("proj2_vaults").select("balance, name").eq("id", to_vault_id).single(),
  ]);
  if (!from || !to) return NextResponse.json({ error: "خزنة غير موجودة" }, { status: 404 });
  if (from.balance < amount) return NextResponse.json({ error: `الرصيد غير كافي في ${from.name}` }, { status: 400 });

  const transferId = crypto.randomUUID();
  await Promise.all([
    supabase.from("proj2_vaults").update({ balance: from.balance - amount }).eq("id", from_vault_id),
    supabase.from("proj2_vaults").update({ balance: to.balance + amount }).eq("id", to_vault_id),
    supabase.from("proj2_vault_transactions").insert([
      { vault_id: from_vault_id, type: "transfer_out", amount, ref_type: "transfer", ref_id: transferId, notes: notes || `تحويل إلى ${to.name}` },
      { vault_id: to_vault_id,   type: "transfer_in",  amount, ref_type: "transfer", ref_id: transferId, notes: notes || `تحويل من ${from.name}` },
    ]),
  ]);
  return NextResponse.json({ success: true, transferId }, { status: 201 });
}
