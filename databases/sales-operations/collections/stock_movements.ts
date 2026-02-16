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

function toNum(v: unknown): number {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
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
    const qty = toNum(m.quantity);
    sumQty[m.productId] += qty;
    const totalC = toNum(m.totalCost);
    const unitC = toNum(m.unitCost);
    const cost = totalC > 0 ? totalC : (unitC > 0 && qty > 0 ? qty * unitC : 0);
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

/** Last known unit cost per product (from most recent purchase/adjustment with cost). Used when average is 0. */
export async function getLastUnitCostByProduct(): Promise<Record<string, number>> {
  const all = await getAllStockMovements();
  const byProduct: Record<string, number> = {};
  for (const m of all) {
    if (m.type !== "purchase" && m.type !== "adjustment") continue;
    if (byProduct[m.productId] != null) continue;
    const totalC = toNum(m.totalCost);
    const unitC = toNum(m.unitCost);
    const qty = toNum(m.quantity);
    const costPerUnit = totalC > 0 && qty > 0 ? totalC / qty : unitC;
    if (costPerUnit > 0) byProduct[m.productId] = costPerUnit;
  }
  return byProduct;
}

/** Total value of warehouse stock (quantity × cost per product; cost = average or last known). */
export async function getWarehouseValue(): Promise<number> {
  const [byProduct, avgCost, lastCost] = await Promise.all([
    getStockByProduct(),
    getAverageCostByProduct(),
    getLastUnitCostByProduct(),
  ]);
  let total = 0;
  for (const pid of Object.keys(byProduct)) {
    const qty = Math.max(0, byProduct[pid].quantity);
    const cost = (avgCost[pid]?.averageCost && avgCost[pid].averageCost > 0)
      ? avgCost[pid].averageCost
      : (lastCost[pid] ?? 0);
    total += qty * cost;
  }
  return total;
}
