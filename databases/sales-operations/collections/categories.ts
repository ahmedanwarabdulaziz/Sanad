/**
 * Vault categories - Firestore
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import type { VaultCategory } from "../types";

function omitUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export const CATEGORIES_COLLECTION = "vault_categories";

export const categoriesRef = () => collection(db, CATEGORIES_COLLECTION);
export const categoryDoc = (id: string) => doc(db, CATEGORIES_COLLECTION, id);

export async function getCategoryById(id: string): Promise<VaultCategory | null> {
  const snap = await getDoc(categoryDoc(id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as VaultCategory;
}

export async function getCategoriesByType(type: "personal" | "bank"): Promise<VaultCategory[]> {
  const all = await getAllCategories();
  return all
    .filter((c) => c.active && (c.type === type || c.type === "all"))
    .sort((a, b) => a.order - b.order);
}

export async function getAllCategories(): Promise<VaultCategory[]> {
  const snap = await getDocs(categoriesRef());
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as VaultCategory))
    .sort((a, b) => a.order - b.order);
}

export async function createCategory(cat: Omit<VaultCategory, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const ref = doc(categoriesRef());
  const now = Date.now();
  await setDoc(ref, omitUndefined({ ...cat, createdAt: now, updatedAt: now }));
  return ref.id;
}

export async function updateCategory(id: string, data: Partial<VaultCategory>): Promise<void> {
  await updateDoc(categoryDoc(id), omitUndefined({ ...data, updatedAt: Date.now() }));
}
