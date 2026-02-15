/**
 * Stock movements (حركة المخزون) - Firestore
 */

import { collection, doc, getDocs, setDoc, query, where, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import type { StockMovement, ProductUnit } from "../types";

function omitUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export const STOCK_MOVEMENTS_COLLECTION = "stock_movements";

export const stockMovementsRef = () => collection(db, STOCK_MOVEMENTS_COLLECTION);
export const stockMovementDoc = (id: string) => doc(db, STOCK_MOVEMENTS_COLLECTION, id);

export async function getAllStockMovements(): Promise<StockMovement[]> {
  const q = query(stockMovementsRef(), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as StockMovement));
}

export async function getMovementsByProductId(productId: string): Promise<StockMovement[]> {
  const q = query(
    stockMovementsRef(),
    where("productId", "==", productId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as StockMovement));
}

export async function createStockMovement(
  movement: Omit<StockMovement, "id" | "createdAt"> & { createdAt?: number }
): Promise<string> {
  const ref = doc(stockMovementsRef());
  const now = movement.createdAt ?? Date.now();
  await setDoc(ref, omitUndefined({ ...movement, createdAt: now }));
  return ref.id;
}

/** Sum quantity by product (positive = in, negative = out). Returns map productId -> { quantity, unit }. */
export async function getStockByProduct(): Promise<
  Record<string, { quantity: number; unit: ProductUnit }>
> {
  const all = await getAllStockMovements();
  const byProduct: Record<string, { quantity: number; unit: ProductUnit }> = {};
  for (const m of all) {
    if (!byProduct[m.productId]) {
      byProduct[m.productId] = { quantity: 0, unit: m.unit };
    }
    const entry = byProduct[m.productId];
    if (m.type === "purchase" || m.type === "adjustment") {
      entry.quantity += m.quantity;
    } else {
      entry.quantity -= m.quantity;
    }
  }
  return byProduct;
}

/** Average cost per unit by product (from purchase/adjustment movements only). */
export async function getAverageCostByProduct(): Promise<
  Record<string, { averageCost: number; unit: ProductUnit }>
> {
  const all = await getAllStockMovements();
  const sumQty: Record<string, number> = {};
  const sumCost: Record<string, number> = {};
  const unitByProduct: Record<string, ProductUnit> = {};
  for (const m of all) {
    if (m.type !== "purchase" && m.type !== "adjustment") continue;
    if (!sumQty[m.productId]) {
      sumQty[m.productId] = 0;
      sumCost[m.productId] = 0;
      unitByProduct[m.productId] = m.unit;
    }
    sumQty[m.productId] += m.quantity;
    const cost = m.totalCost ?? (m.unitCost != null ? m.quantity * m.unitCost : 0);
    sumCost[m.productId] += cost;
  }
  const result: Record<string, { averageCost: number; unit: ProductUnit }> = {};
  for (const pid of Object.keys(sumQty)) {
    const q = sumQty[pid];
    result[pid] = {
      averageCost: q > 0 ? sumCost[pid] / q : 0,
      unit: unitByProduct[pid],
    };
  }
  return result;
}
