import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "./_firebase.js";
import admin from "firebase-admin";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { uid } = req.body;
    if (!uid) {
      return res.status(400).json({ success: false, error: "Missing UID" });
    }

    // 🔹 Hapus dari Firebase Auth
    await admin.auth().deleteUser(uid);

    // 🔹 Hapus dari Firestore
    const db = getDb();
    await db.collection("roles").doc(uid).delete();

    console.log(`✅ User ${uid} berhasil dihapus`);
    return res.status(200).json({ success: true, message: `User ${uid} deleted` });
  } catch (err: any) {
    console.error("❌ Gagal hapus user:", err);

    // Tangani error Firebase yang bukan JSON-friendly
    return res.status(500).json({
      success: false,
      error: err.message || "Server error",
      code: err.code || "UNKNOWN",
    });
  }
}
