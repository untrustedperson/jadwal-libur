import admin from "firebase-admin";

// Pastikan environment terisi (helper)
export function assertEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

// Inisialisasi Firebase Admin sekali saja
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: assertEnv("FIREBASE_PROJECT_ID"),
      clientEmail: assertEnv("FIREBASE_CLIENT_EMAIL"),
      privateKey: assertEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    }),
  });
  console.log("✅ Firebase Admin initialized");
}

// Instance Firestore
const db = admin.firestore();

// Export default & named untuk kompatibilitas ESM
export { db };
export function getDb() {
  return db;
}
