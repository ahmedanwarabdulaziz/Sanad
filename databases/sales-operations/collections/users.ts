/**
 * Users collection - Firestore
 * No Firebase Auth - fixed users with PIN login
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import type { SalesUser } from "../types";

export const USERS_COLLECTION = "users";

export const usersRef = () => collection(db, USERS_COLLECTION);
export const userDoc = (id: string) => doc(db, USERS_COLLECTION, id);

export async function getUserById(id: string): Promise<SalesUser | null> {
  const snap = await getDoc(userDoc(id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as SalesUser;
}

export async function getUserByName(name: string): Promise<SalesUser | null> {
  const q = query(
    usersRef(),
    where("name", "==", name),
    where("active", "==", true)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as SalesUser;
}

export async function getAllUsers(): Promise<SalesUser[]> {
  const snap = await getDocs(usersRef());
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SalesUser));
}

function omitUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export async function createUser(user: Omit<SalesUser, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const ref = doc(usersRef());
  const now = Date.now();
  await setDoc(ref, omitUndefined({ ...user, createdAt: now, updatedAt: now }));
  return ref.id;
}

export async function updateUser(id: string, data: Partial<SalesUser>): Promise<void> {
  await updateDoc(userDoc(id), omitUndefined({ ...data, updatedAt: Date.now() }));
}

export async function verifyPin(userId: string, pin: string): Promise<boolean> {
  const user = await getUserById(userId);
  if (!user || !user.active) return false;
  return user.pin === pin;
}
