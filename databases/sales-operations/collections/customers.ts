/**
 * Customers (العملاء) - Firestore
 */

import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { Customer } from "../types";

function omitUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export const CUSTOMERS_COLLECTION = "customers";

export const customersRef = () => collection(db, CUSTOMERS_COLLECTION);
export const customerDoc = (id: string) => doc(db, CUSTOMERS_COLLECTION, id);

export async function getCustomerById(id: string): Promise<Customer | null> {
  const snap = await getDoc(customerDoc(id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Customer;
}

export async function getAllCustomers(): Promise<Customer[]> {
  const snap = await getDocs(customersRef());
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Customer))
    .sort((a, b) => a.order - b.order || (a.createdAt ?? 0) - (b.createdAt ?? 0));
}

export async function getActiveCustomers(): Promise<Customer[]> {
  const all = await getAllCustomers();
  return all.filter((c) => c.active);
}

export async function createCustomer(customer: Omit<Customer, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const ref = doc(customersRef());
  const now = Date.now();
  await setDoc(ref, omitUndefined({ ...customer, createdAt: now, updatedAt: now }));
  return ref.id;
}

export async function updateCustomer(id: string, data: Partial<Customer>): Promise<void> {
  await updateDoc(customerDoc(id), omitUndefined({ ...data, updatedAt: Date.now() }));
}
