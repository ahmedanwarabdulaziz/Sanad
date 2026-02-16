/**
 * Standalone expenses (المصروفات) - related to buy/sell, general or invoice
 */

import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import type { Expense, ExpenseRelatedTo, ExpenseScope } from "../types";

function omitUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export const EXPENSES_COLLECTION = "expenses";

export const expensesRef = () => collection(db, EXPENSES_COLLECTION);
export const expenseDoc = (id: string) => doc(db, EXPENSES_COLLECTION, id);

export async function getExpenseById(id: string): Promise<Expense | null> {
  const snap = await getDoc(expenseDoc(id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Expense;
}

export async function getAllExpenses(): Promise<Expense[]> {
  const q = query(expensesRef(), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Expense));
}

export async function getExpensesByRelatedTo(relatedTo: ExpenseRelatedTo): Promise<Expense[]> {
  const all = await getAllExpenses();
  return all.filter((e) => e.relatedTo === relatedTo);
}

export async function getExpensesBySalesInvoiceId(salesInvoiceId: string): Promise<Expense[]> {
  const all = await getAllExpenses();
  return all.filter(
    (e) => e.scope === "invoice" && e.relatedTo === "sell" && e.salesInvoiceId === salesInvoiceId
  );
}

export async function getExpensesByPurchaseInvoiceId(purchaseInvoiceId: string): Promise<Expense[]> {
  const all = await getAllExpenses();
  return all.filter(
    (e) => e.scope === "invoice" && e.relatedTo === "buy" && e.purchaseInvoiceId === purchaseInvoiceId
  );
}

export async function createExpense(
  expense: Omit<Expense, "id" | "createdAt"> & { createdAt?: number }
): Promise<string> {
  const ref = doc(expensesRef());
  const now = expense.createdAt ?? Date.now();
  await setDoc(ref, omitUndefined({ ...expense, createdAt: now }));
  return ref.id;
}

export async function updateExpense(id: string, data: Partial<Expense>): Promise<void> {
  await updateDoc(expenseDoc(id), omitUndefined({ ...data, updatedAt: Date.now() }));
}
