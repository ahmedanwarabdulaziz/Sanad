/**
 * Expense types (أنواع المصروفات) - Firestore
 */

import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { ExpenseType } from "../types";

function omitUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export const EXPENSE_TYPES_COLLECTION = "expense_types";

export const expenseTypesRef = () => collection(db, EXPENSE_TYPES_COLLECTION);
export const expenseTypeDoc = (id: string) => doc(db, EXPENSE_TYPES_COLLECTION, id);

export async function getExpenseTypeById(id: string): Promise<ExpenseType | null> {
  const snap = await getDoc(expenseTypeDoc(id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as ExpenseType;
}

export async function getAllExpenseTypes(): Promise<ExpenseType[]> {
  const snap = await getDocs(expenseTypesRef());
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as ExpenseType))
    .sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);
}

export async function getActiveExpenseTypes(): Promise<ExpenseType[]> {
  const all = await getAllExpenseTypes();
  return all.filter((e) => e.active);
}

export async function createExpenseType(expenseType: Omit<ExpenseType, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const ref = doc(expenseTypesRef());
  const now = Date.now();
  await setDoc(ref, omitUndefined({ ...expenseType, createdAt: now, updatedAt: now }));
  return ref.id;
}

export async function updateExpenseType(id: string, data: Partial<ExpenseType>): Promise<void> {
  await updateDoc(expenseTypeDoc(id), omitUndefined({ ...data, updatedAt: Date.now() }));
}
