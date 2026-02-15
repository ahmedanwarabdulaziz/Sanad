/**
 * Sales invoices (فواتير المبيعات) - Firestore
 */

import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import type { SalesInvoice } from "../types";

function omitUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export const SALES_INVOICES_COLLECTION = "sales_invoices";

export const salesInvoicesRef = () => collection(db, SALES_INVOICES_COLLECTION);
export const salesInvoiceDoc = (id: string) => doc(db, SALES_INVOICES_COLLECTION, id);

export async function getSalesInvoiceById(id: string): Promise<SalesInvoice | null> {
  const snap = await getDoc(salesInvoiceDoc(id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as SalesInvoice;
}

export async function getAllSalesInvoices(): Promise<SalesInvoice[]> {
  const q = query(salesInvoicesRef(), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SalesInvoice));
}

export async function createSalesInvoice(
  invoice: Omit<SalesInvoice, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const ref = doc(salesInvoicesRef());
  const now = Date.now();
  await setDoc(ref, omitUndefined({ ...invoice, createdAt: now, updatedAt: now }));
  return ref.id;
}

export async function updateSalesInvoice(id: string, data: Partial<SalesInvoice>): Promise<void> {
  await updateDoc(salesInvoiceDoc(id), omitUndefined({ ...data, updatedAt: Date.now() }));
}

const INVOICE_NUMBER_PREFIX = "FS-";
const INVOICE_NUMBER_YEAR_SEP = "-";

export function suggestNextSalesInvoiceNumber(existing: SalesInvoice[]): string {
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
  return `${prefix}${String(maxSeq + 1).padStart(3, "0")}`;
}

export function isSalesInvoiceNumberDuplicate(
  existing: SalesInvoice[],
  invoiceNumber: string,
  excludeId?: string
): boolean {
  const n = invoiceNumber?.trim();
  if (!n) return false;
  return existing.some((inv) => inv.id !== excludeId && (inv.invoiceNumber?.trim() || "").toLowerCase() === n.toLowerCase());
}
