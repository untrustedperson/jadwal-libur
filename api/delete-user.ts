import type { VercelRequest, VercelResponse } from "@vercel/node";
import admin from "firebase-admin";
import { getDb } from "./_firebase";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: "Missing UID" });

    // Hapus dari Firebase Auth
    await admin.auth().deleteUser(uid);

    // Hapus dari Firestore
    const db = getDb();
    await db.collection("roles").doc(uid).delete();

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("Gagal hapus user:", err);
    return res.status(500).json({ error: err.message });
  }
}
