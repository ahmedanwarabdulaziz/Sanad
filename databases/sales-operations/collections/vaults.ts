/**
 * Vaults - Firestore
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Vault } from "../types";

function omitUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export const VAULTS_COLLECTION = "vaults";

export const vaultsRef = () => collection(db, VAULTS_COLLECTION);
export const vaultDoc = (id: string) => doc(db, VAULTS_COLLECTION, id);

export async function getVaultById(id: string): Promise<Vault | null> {
  const snap = await getDoc(vaultDoc(id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Vault;
}

export async function getVaultsByUser(userId: string): Promise<Vault[]> {
  const q = query(vaultsRef(), where("assignedToUserId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Vault))
    .filter((v) => v.active)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getAllVaults(): Promise<Vault[]> {
  const snap = await getDocs(vaultsRef());
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Vault))
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

export async function createVault(vault: Omit<Vault, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const ref = doc(vaultsRef());
  const now = Date.now();
  await setDoc(ref, omitUndefined({ ...vault, createdAt: now, updatedAt: now }));
  return ref.id;
}

export async function updateVault(id: string, data: Partial<Vault>): Promise<void> {
  await updateDoc(vaultDoc(id), omitUndefined({ ...data, updatedAt: Date.now() }));
}
