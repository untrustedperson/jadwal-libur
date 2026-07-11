import admin from "firebase-admin";

// 🔒 Pastikan hanya diinisialisasi sekali
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

// 🔹 Firestore instance
export const db = admin.firestore();
export { admin };

/**
 * ✅ Utility: memastikan env variable ada
 */
export function assertEnv(name: string) {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

/**
 * ✅ Utility: ambil instance Firestore
 */
export function getDb() {
  return db;
}
