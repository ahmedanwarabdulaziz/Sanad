/**
 * Purchase invoice line items - Firestore
 */

import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where } from "firebase/firestore";
import { db } from "../firebase";
import type { PurchaseInvoiceItem } from "../types";

function omitUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export const PURCHASE_INVOICE_ITEMS_COLLECTION = "purchase_invoice_items";

export const purchaseInvoiceItemsRef = () => collection(db, PURCHASE_INVOICE_ITEMS_COLLECTION);
export const purchaseInvoiceItemDoc = (id: string) => doc(db, PURCHASE_INVOICE_ITEMS_COLLECTION, id);

export async function getPurchaseInvoiceItemById(id: string): Promise<PurchaseInvoiceItem | null> {
  const snap = await getDoc(purchaseInvoiceItemDoc(id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as PurchaseInvoiceItem;
}

export async function getItemsByPurchaseInvoiceId(purchaseInvoiceId: string): Promise<PurchaseInvoiceItem[]> {
  const q = query(purchaseInvoiceItemsRef(), where("purchaseInvoiceId", "==", purchaseInvoiceId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PurchaseInvoiceItem));
}

export async function createPurchaseInvoiceItem(
  item: Omit<PurchaseInvoiceItem, "id">
): Promise<string> {
  const ref = doc(purchaseInvoiceItemsRef());
  await setDoc(ref, omitUndefined({ ...item }));
  return ref.id;
}

export async function deletePurchaseInvoiceItem(id: string): Promise<void> {
  await deleteDoc(purchaseInvoiceItemDoc(id));
}

export async function deleteItemsByPurchaseInvoiceId(purchaseInvoiceId: string): Promise<void> {
  const items = await getItemsByPurchaseInvoiceId(purchaseInvoiceId);
  await Promise.all(items.map((i) => deleteDoc(purchaseInvoiceItemDoc(i.id))));
}
