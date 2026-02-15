/**
 * Default vault categories - run once
 * npm run seed:categories
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDocs, collection } from "firebase/firestore";
import { firebaseConfig } from "../config";

const DEFAULT_CATEGORIES = [
  { nameAr: "توفير", type: "personal" as const, order: 1 },
  { nameAr: "مصروفات", type: "personal" as const, order: 2 },
  { nameAr: "استثمار", type: "personal" as const, order: 3 },
  { nameAr: "مخصص شخصي", type: "personal" as const, order: 4 },
  { nameAr: "حساب جاري", type: "bank" as const, order: 5 },
  { nameAr: "حساب توفير", type: "bank" as const, order: 6 },
  { nameAr: "قرض", type: "bank" as const, order: 7 },
  { nameAr: "خط ائتمان", type: "bank" as const, order: 8 },
];

async function seed() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const col = collection(db, "vault_categories");
  const existing = await getDocs(col);
  if (existing.size > 0) {
    console.log("Categories already exist. Skipping.");
    process.exit(0);
  }
  const now = Date.now();
  for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
    const c = DEFAULT_CATEGORIES[i];
    const ref = doc(col);
    await setDoc(ref, {
      nameAr: c.nameAr,
      type: c.type,
      order: c.order,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  }
  console.log("Default categories created.");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
