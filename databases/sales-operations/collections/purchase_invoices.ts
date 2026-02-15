/**
 * Purchase invoices (فواتير الشراء) - Firestore
 */

import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import type { PurchaseInvoice } from "../types";

function omitUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export const PURCHASE_INVOICES_COLLECTION = "purchase_invoices";

export const purchaseInvoicesRef = () => collection(db, PURCHASE_INVOICES_COLLECTION);
export const purchaseInvoiceDoc = (id: string) => doc(db, PURCHASE_INVOICES_COLLECTION, id);

export async function getPurchaseInvoiceById(id: string): Promise<PurchaseInvoice | null> {
  const snap = await getDoc(purchaseInvoiceDoc(id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as PurchaseInvoice;
}

export async function getAllPurchaseInvoices(): Promise<PurchaseInvoice[]> {
  const q = query(purchaseInvoicesRef(), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PurchaseInvoice));
}

export async function createPurchaseInvoice(
  invoice: Omit<PurchaseInvoice, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const ref = doc(purchaseInvoicesRef());
  const now = Date.now();
  await setDoc(ref, omitUndefined({ ...invoice, createdAt: now, updatedAt: now }));
  return ref.id;
}

export async function updatePurchaseInvoice(id: string, data: Partial<PurchaseInvoice>): Promise<void> {
  await updateDoc(purchaseInvoiceDoc(id), omitUndefined({ ...data, updatedAt: Date.now() }));
}

const INVOICE_NUMBER_PREFIX = "FV-";
const INVOICE_NUMBER_YEAR_SEP = "-";

/** Suggest next invoice number: FV-YYYY-001, FV-YYYY-002, ... (no duplication) */
export function suggestNextInvoiceNumber(existing: PurchaseInvoice[]): string {
  const year = new Date().getFullYear();
  const prefix = `${INVOICE_NUMBER_PREFIX}${year}${INVOICE_NUMBER_YEAR_SEP}`;
  let maxSeq = 0;
  for (const inv of existing) {
    const n = inv.invoiceNumber?.trim();
    if (!n || !n.startsWith(prefix)) continue;
    const seqStr = n.slice(prefix.length).replace(/\D/g, "");
    const seq = parseInt(seqStr, 10);
    if (!Number.isNaN(seq) && seq > maxSeq) maxSeq = seq;
  }
  const next = maxSeq + 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

/** Check if invoice number is already used by another invoice (exclude given id when editing) */
export function isInvoiceNumberDuplicate(
  existing: PurchaseInvoice[],
  invoiceNumber: string,
  excludeId?: string
): boolean {
  const n = invoiceNumber?.trim();
  if (!n) return false;
  return existing.some((inv) => inv.id !== excludeId && (inv.invoiceNumber?.trim() || "").toLowerCase() === n.toLowerCase());
}
