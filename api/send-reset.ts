import type { VercelRequest, VercelResponse } from "@vercel/node";
import admin from "firebase-admin";
import { Resend } from "resend";

// --- Init Admin SDK (gunakan _firebase.ts kamu kalau sudah ada) ---
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { email } = req.body as { email?: string };
    if (!email) return res.status(400).json({ error: "Missing email" });

    // CONTINUE_URL harus sudah di-authorize di Firebase Auth → Authorized domains
    const CONTINUE_URL =
      process.env.CONTINUE_URL || "https://jadwal-libur-app.web.app/login";

    // Buat link reset
    const link = await admin.auth().generatePasswordResetLink(email, {
      url: CONTINUE_URL,
      handleCodeInApp: false,
    });

    // Kirim via Resend
    const from = process.env.MAIL_FROM || "no-reply@yourdomain.com";
    await resend.emails.send({
      from,
      to: email,
      subject: "Reset Password Akun Anda",
      html: `
        <p>Halo,</p>
        <p>Anda meminta reset kata sandi. Klik tautan berikut untuk mengatur ulang:</p>
        <p><a href="${link}">Atur ulang password</a></p>
        <p>Jika Anda tidak meminta ini, abaikan email ini.</p>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (e: any) {
    console.error("send-reset error:", e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}