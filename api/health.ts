import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb, assertEnv } from "./_firebase";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const missing = assertEnv();
    const envOk = missing.length === 0;

    let firestoreOk = false;
    let writeOk = false;
    let error: string | null = null;

    try {
      const db = getDb();
      await db.collection("roles").doc("__health_read__").get();
      firestoreOk = true;

      if (req.query.writeTest === "1") {
        await db.collection("roles").doc("__health_write__").set({
          ok: true,
          ts: new Date().toISOString(),
        }, { merge: true });
        writeOk = true;
      }
    } catch (e: any) {
      error = e?.message || String(e);
    }

    return res.status(200).json({
      ok: envOk && firestoreOk,
      env: { ok: envOk, missing },
      firestore: { ok: firestoreOk, writeOk },
      note: "Gunakan ?writeTest=1 untuk uji tulis dokumen dummy",
      error,
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}
