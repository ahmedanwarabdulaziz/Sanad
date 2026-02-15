/**
 * Vault transfers (تحويلات بين الحسابات) - Firestore
 */

import { collection, doc, getDocs, setDoc, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import type { VaultTransfer } from "../types";

function omitUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export const VAULT_TRANSFERS_COLLECTION = "vault_transfers";

export const vaultTransfersRef = () => collection(db, VAULT_TRANSFERS_COLLECTION);
export const vaultTransferDoc = (id: string) => doc(db, VAULT_TRANSFERS_COLLECTION, id);

export async function getAllVaultTransfers(): Promise<VaultTransfer[]> {
  const q = query(vaultTransfersRef(), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as VaultTransfer));
}

export async function getTransfersByVaultId(vaultId: string): Promise<VaultTransfer[]> {
  const all = await getAllVaultTransfers();
  return all.filter((t) => t.fromVaultId === vaultId || t.toVaultId === vaultId);
}

/** Balance = openingBalance + sum(transfers in) - sum(transfers out) */
export async function getVaultBalance(vaultId: string, openingBalance: number = 0): Promise<number> {
  const all = await getAllVaultTransfers();
  let balance = openingBalance;
  for (const t of all) {
    if (t.toVaultId === vaultId) balance += t.amount;
    if (t.fromVaultId === vaultId) balance -= t.amount;
  }
  return balance;
}

/** Compute balance for each vault. Pass list of vaults and all transfers. */
export function computeBalancesByVault(
  vaults: { id: string; openingBalance?: number }[],
  transfers: VaultTransfer[]
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const v of vaults) {
    map[v.id] = v.openingBalance ?? 0;
  }
  for (const t of transfers) {
    if (map[t.toVaultId] !== undefined) map[t.toVaultId] += t.amount;
    if (map[t.fromVaultId] !== undefined) map[t.fromVaultId] -= t.amount;
  }
  return map;
}

export async function createVaultTransfer(
  transfer: Omit<VaultTransfer, "id" | "createdAt">
): Promise<string> {
  const ref = doc(vaultTransfersRef());
  const now = Date.now();
  await setDoc(ref, omitUndefined({ ...transfer, createdAt: now }));
  return ref.id;
}
