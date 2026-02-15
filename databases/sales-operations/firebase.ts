/**
 * Firebase app initialization for Sales Operations
 * Uses client SDK - no auth, PIN-based login
 */

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { firebaseConfig } from "./config";

let app: FirebaseApp;
let db: Firestore;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} else {
  app = getApps()[0] as FirebaseApp;
  db = getFirestore(app);
}

export { app, db };
