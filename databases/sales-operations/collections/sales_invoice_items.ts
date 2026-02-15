/**
 * Sales invoice line items - Firestore
 */

import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where } from "firebase/firestore";
import { db } from "../firebase";
import type { SalesInvoiceItem } from "../types";

function omitUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export const SALES_INVOICE_ITEMS_COLLECTION = "sales_invoice_items";

export const salesInvoiceItemsRef = () => collection(db, SALES_INVOICE_ITEMS_COLLECTION);
export const salesInvoiceItemDoc = (id: string) => doc(db, SALES_INVOICE_ITEMS_COLLECTION, id);

export async function getSalesInvoiceItemById(id: string): Promise<SalesInvoiceItem | null> {
  const snap = await getDoc(salesInvoiceItemDoc(id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as SalesInvoiceItem;
}

export async function getItemsBySalesInvoiceId(salesInvoiceId: string): Promise<SalesInvoiceItem[]> {
  const q = query(salesInvoiceItemsRef(), where("salesInvoiceId", "==", salesInvoiceId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SalesInvoiceItem));
}

export async function createSalesInvoiceItem(
  item: Omit<SalesInvoiceItem, "id">
): Promise<string> {
  const ref = doc(salesInvoiceItemsRef());
  await setDoc(ref, omitUndefined({ ...item }));
  return ref.id;
}

export async function deleteSalesInvoiceItem(id: string): Promise<void> {
  await deleteDoc(salesInvoiceItemDoc(id));
}

export async function deleteItemsBySalesInvoiceId(salesInvoiceId: string): Promise<void> {
  const items = await getItemsBySalesInvoiceId(salesInvoiceId);
  await Promise.all(items.map((i) => deleteDoc(salesInvoiceItemDoc(i.id))));
}
