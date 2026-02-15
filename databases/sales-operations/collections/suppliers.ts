/**
 * Suppliers (الموردين) - Firestore
 */

import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { Supplier } from "../types";

function omitUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export const SUPPLIERS_COLLECTION = "suppliers";

export const suppliersRef = () => collection(db, SUPPLIERS_COLLECTION);
export const supplierDoc = (id: string) => doc(db, SUPPLIERS_COLLECTION, id);

export async function getSupplierById(id: string): Promise<Supplier | null> {
  const snap = await getDoc(supplierDoc(id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Supplier;
}

export async function getAllSuppliers(): Promise<Supplier[]> {
  const snap = await getDocs(suppliersRef());
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Supplier))
    .sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);
}

export async function getActiveSuppliers(): Promise<Supplier[]> {
  const all = await getAllSuppliers();
  return all.filter((s) => s.active);
}

export async function createSupplier(supplier: Omit<Supplier, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const ref = doc(suppliersRef());
  const now = Date.now();
  await setDoc(ref, omitUndefined({ ...supplier, createdAt: now, updatedAt: now }));
  return ref.id;
}

export async function updateSupplier(id: string, data: Partial<Supplier>): Promise<void> {
  await updateDoc(supplierDoc(id), omitUndefined({ ...data, updatedAt: Date.now() }));
}
