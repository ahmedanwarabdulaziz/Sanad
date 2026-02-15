/**
 * Super admin seed - run once to create Anwar
 * Use: npx ts-node databases/sales-operations/seed/super-admin.ts
 * Or add to package.json script
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { firebaseConfig } from "../config";

const SUPER_ADMIN_ID = "super_admin_anwar";
const SUPER_ADMIN = {
  id: SUPER_ADMIN_ID,
  name: "Anwar",
  pin: "2510",
  role: "super_admin" as const,
  pageAccess: [],
  active: true,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

async function seed() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const ref = doc(db, "users", SUPER_ADMIN_ID);

  const existing = await getDoc(ref);
  if (existing.exists()) {
    console.log("Super admin already exists. Skipping.");
    process.exit(0);
  }

  await setDoc(ref, SUPER_ADMIN);
  console.log("Super admin (Anwar) created successfully.");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
