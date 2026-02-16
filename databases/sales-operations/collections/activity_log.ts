/**
 * Activity log for payments and collections - Firestore
 */

import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { ActivityLogEntry, ActivityLogType } from "../types";

function omitUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export const ACTIVITY_LOG_COLLECTION = "activity_log";

export const activityLogRef = () => collection(db, ACTIVITY_LOG_COLLECTION);

export async function createActivityLogEntry(
  entry: Omit<ActivityLogEntry, "id" | "timestamp"> & { timestamp?: number }
): Promise<string> {
  const ref = doc(activityLogRef());
  const timestamp = entry.timestamp ?? Date.now();
  await setDoc(ref, omitUndefined({ ...entry, timestamp }));
  return ref.id;
}

function toMillis(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (v && typeof (v as { toMillis?: () => number }).toMillis === "function") return (v as { toMillis: () => number }).toMillis();
  if (v && typeof (v as { seconds?: number }).seconds === "number") return (v as { seconds: number; nanoseconds?: number }).seconds * 1000 + ((v as { nanoseconds?: number }).nanoseconds ?? 0) / 1e6;
  return Number(v) || Date.now();
}

export async function getAllActivityLogs(): Promise<ActivityLogEntry[]> {
  const snap = await getDocs(activityLogRef());
  const list = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      type: data.type as ActivityLogEntry["type"],
      timestamp: toMillis(data.timestamp),
      amount: Number(data.amount) || 0,
      vaultId: String(data.vaultId ?? ""),
      ref: String(data.ref ?? ""),
      createdBy: data.createdBy != null ? String(data.createdBy) : undefined,
    } as ActivityLogEntry;
  });
  list.sort((a, b) => b.timestamp - a.timestamp);
  return list;
}
