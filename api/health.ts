import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db, assertEnv, getDb } from "./_firebase.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Pastikan environment variabel ada
    assertEnv("FIREBASE_PROJECT_ID");
    assertEnv("FIREBASE_CLIENT_EMAIL");
    assertEnv("FIREBASE_PRIVATE_KEY");

    // Tes koneksi Firestore
    const firestore = getDb();
    await firestore.collection("health").doc("status").set(
      { ok: true, ts: Date.now() },
      { merge: true }
    );

    return res.status(200).json({ status: "ok", message: "Firebase connection success 🚀" });
  } catch (err: any) {
    console.error("❌ Health check error:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
}
