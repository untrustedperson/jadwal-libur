import type { VercelRequest, VercelResponse } from "@vercel/node";
import { admin, db } from "./_firebase.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { uid } = req.body;
    if (!uid) {
      return res.status(400).json({ error: "Missing UID" });
    }

    // 🔥 Hapus dari Authentication
    await admin.auth().deleteUser(uid);

    // 🔥 Hapus dari Firestore
    await db.collection("roles").doc(uid).delete();

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("❌ Gagal hapus user:", err);
    return res.status(500).json({
      error: "Server error",
      message: err.message,
    });
  }
}
