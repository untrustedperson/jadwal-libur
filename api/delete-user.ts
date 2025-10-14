import express from "express";
import cors from "cors";
import { admin, db } from "./_firebase";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/delete-user", async (req, res) => {
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: "Missing UID" });

    console.log("🗑️ Hapus user:", uid);

    // Hapus dari Authentication
    await admin.auth().deleteUser(uid);

    // Hapus dari Firestore
    await db.collection("roles").doc(uid).delete();

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("🔥 Gagal hapus user:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Server error",
    });
  }
});

export default app;
