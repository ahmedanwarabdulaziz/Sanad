/**
 * Products (أصناف المخزن) - Firestore
 */

import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { Product } from "../types";

function omitUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export const PRODUCTS_COLLECTION = "products";

export const productsRef = () => collection(db, PRODUCTS_COLLECTION);
export const productDoc = (id: string) => doc(db, PRODUCTS_COLLECTION, id);

export async function getProductById(id: string): Promise<Product | null> {
  const snap = await getDoc(productDoc(id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Product;
}

export async function getAllProducts(): Promise<Product[]> {
  const snap = await getDocs(productsRef());
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Product))
    .sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);
}

export async function getActiveProducts(): Promise<Product[]> {
  const all = await getAllProducts();
  return all.filter((p) => p.active);
}

export async function createProduct(product: Omit<Product, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const ref = doc(productsRef());
  const now = Date.now();
  await setDoc(ref, omitUndefined({ ...product, createdAt: now, updatedAt: now }));
  return ref.id;
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<void> {
  await updateDoc(productDoc(id), omitUndefined({ ...data, updatedAt: Date.now() }));
}
