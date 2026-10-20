import type { SupabaseClient } from "@supabase/supabase-js";

// Investor wallet: money the investor has actually put in, net of refunds and
// deductions, and how much of it is locked by issued contracts.
//
//   net       = deposits − withdrawals − area-reconciliation deltas
//   claim(c)  = value(c) − pending installments(c)    for each ACTIVE issued contract
//   locked    = Σ claims
//   refundable          = max(0, net − locked)
//   availableFor(c)     = clamp(net − Σ claims of the OTHER issued contracts, 0, value(c))
//
// Contracts that are not issued yet do not lock anything: the wallet balance
// is only reserved once a contract is issued.

export interface WalletContract {
  id: string;
  value: number;
  status: string;
  issued_at: string | null;
  pending_installments: number;
  claim: number; // locked share (issued contracts only)
}

export interface InvestorWallet {
  deposits: number;
  withdrawals: number;
  reconciliation: number;
  net: number;
  locked: number;
  refundable: number;
  contracts: WalletContract[];
}

export async function loadInvestorWallet(supabase: SupabaseClient, investorId: string): Promise<InvestorWallet> {
  const [{ data: txs, error: tErr }, { data: contracts, error: cErr }] = await Promise.all([
    supabase.from("sz_treasury_transactions").select("amount, transaction_type").eq("investor_id", investorId),
    supabase
      .from("sz_investor_contracts")
      .select("id, status, unit_quantity, unit_price_at_contract, total_contract_value, issued_at, installments:sz_contract_installments(amount, status)")
      .eq("investor_id", investorId),
  ]);
  if (tErr) throw tErr;
  if (cErr) throw cErr;

  const ids = (contracts ?? []).map(c => c.id);
  let reconciliation = 0;
  if (ids.length) {
    const { data: recs, error: rErr } = await supabase.from("sz_area_reconciliations").select("delta_amount").in("contract_id", ids);
    if (rErr) throw rErr;
    reconciliation = (recs ?? []).reduce((s, r) => s + Number(r.delta_amount), 0);
  }

  const deposits = (txs ?? []).filter(t => t.transaction_type === "DEPOSIT").reduce((s, t) => s + Number(t.amount), 0);
  const withdrawals = (txs ?? []).filter(t => t.transaction_type === "WITHDRAWAL").reduce((s, t) => s + Number(t.amount), 0);
  const net = deposits - withdrawals - reconciliation;

  const list: WalletContract[] = (contracts ?? []).map((c: any) => {
    // The contract price is area × reference meter cost (falls back to the stored total).
    const value = Number(c.unit_quantity) * Number(c.unit_price_at_contract) || Number(c.total_contract_value) || 0;
    const pending = (c.installments ?? []).filter((i: any) => i.status !== "PAID").reduce((s: number, i: any) => s + Number(i.amount), 0);
    const issued = c.status === "ACTIVE" && !!c.issued_at;
    return {
      id: c.id,
      value,
      status: c.status,
      issued_at: c.issued_at,
      pending_installments: pending,
      claim: issued ? Math.max(0, value - pending) : 0,
    };
  });

  const locked = list.reduce((s, c) => s + c.claim, 0);
  return {
    deposits,
    withdrawals,
    reconciliation,
    net,
    locked,
    refundable: Math.max(0, round2(net - locked)),
    contracts: list,
  };
}

/** The most this contract can count as paid from the investor's wallet. */
export function availableForContract(wallet: InvestorWallet, contractId: string): number {
  const c = wallet.contracts.find(x => x.id === contractId);
  if (!c) return 0;
  const othersLocked = wallet.locked - c.claim;
  return Math.min(Math.max(round2(wallet.net - othersLocked), 0), c.value);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
