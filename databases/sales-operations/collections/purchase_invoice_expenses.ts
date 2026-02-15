/**
 * Purchase invoice extra expenses - Firestore
 */

import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where } from "firebase/firestore";
import { db } from "../firebase";
import type { PurchaseInvoiceExpense } from "../types";

function omitUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export const PURCHASE_INVOICE_EXPENSES_COLLECTION = "purchase_invoice_expenses";

export const purchaseInvoiceExpensesRef = () => collection(db, PURCHASE_INVOICE_EXPENSES_COLLECTION);
export const purchaseInvoiceExpenseDoc = (id: string) => doc(db, PURCHASE_INVOICE_EXPENSES_COLLECTION, id);

export async function getPurchaseInvoiceExpenseById(id: string): Promise<PurchaseInvoiceExpense | null> {
  const snap = await getDoc(purchaseInvoiceExpenseDoc(id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as PurchaseInvoiceExpense;
}

export async function getExpensesByPurchaseInvoiceId(purchaseInvoiceId: string): Promise<PurchaseInvoiceExpense[]> {
  const q = query(purchaseInvoiceExpensesRef(), where("purchaseInvoiceId", "==", purchaseInvoiceId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PurchaseInvoiceExpense));
}

export async function createPurchaseInvoiceExpense(
  expense: Omit<PurchaseInvoiceExpense, "id">
): Promise<string> {
  const ref = doc(purchaseInvoiceExpensesRef());
  await setDoc(ref, omitUndefined({ ...expense }));
  return ref.id;
}

export async function deletePurchaseInvoiceExpense(id: string): Promise<void> {
  await deleteDoc(purchaseInvoiceExpenseDoc(id));
}

export async function deleteExpensesByPurchaseInvoiceId(purchaseInvoiceId: string): Promise<void> {
  const expenses = await getExpensesByPurchaseInvoiceId(purchaseInvoiceId);
  await Promise.all(expenses.map((e) => deleteDoc(purchaseInvoiceExpenseDoc(e.id))));
}
