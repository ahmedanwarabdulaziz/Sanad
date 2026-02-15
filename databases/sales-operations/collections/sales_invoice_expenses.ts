/**
 * Sales invoice extra expenses - Firestore
 */

import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where } from "firebase/firestore";
import { db } from "../firebase";
import type { SalesInvoiceExpense } from "../types";

function omitUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export const SALES_INVOICE_EXPENSES_COLLECTION = "sales_invoice_expenses";

export const salesInvoiceExpensesRef = () => collection(db, SALES_INVOICE_EXPENSES_COLLECTION);
export const salesInvoiceExpenseDoc = (id: string) => doc(db, SALES_INVOICE_EXPENSES_COLLECTION, id);

export async function getSalesInvoiceExpenseById(id: string): Promise<SalesInvoiceExpense | null> {
  const snap = await getDoc(salesInvoiceExpenseDoc(id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as SalesInvoiceExpense;
}

export async function getExpensesBySalesInvoiceId(salesInvoiceId: string): Promise<SalesInvoiceExpense[]> {
  const q = query(salesInvoiceExpensesRef(), where("salesInvoiceId", "==", salesInvoiceId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SalesInvoiceExpense));
}

export async function createSalesInvoiceExpense(
  expense: Omit<SalesInvoiceExpense, "id">
): Promise<string> {
  const ref = doc(salesInvoiceExpensesRef());
  await setDoc(ref, omitUndefined({ ...expense }));
  return ref.id;
}

export async function deleteSalesInvoiceExpense(id: string): Promise<void> {
  await deleteDoc(salesInvoiceExpenseDoc(id));
}

export async function deleteExpensesBySalesInvoiceId(salesInvoiceId: string): Promise<void> {
  const expenses = await getExpensesBySalesInvoiceId(salesInvoiceId);
  await Promise.all(expenses.map((e) => deleteDoc(salesInvoiceExpenseDoc(e.id))));
}
