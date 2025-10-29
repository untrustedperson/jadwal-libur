import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "./firebaseConfig";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setMsg(""); setErr(""); setLoading(true);

    try {
      auth.languageCode = "id"; // opsional: email Bahasa Indonesia
      const url = import.meta.env.VITE_CONTINUE_URL; // misal: https://jadwal-libur-app.web.app/login

      if (url) {
        try {
          await sendPasswordResetEmail(auth, email, {
            url,
            handleCodeInApp: false,
          });
        } catch (e: any) {
          // Jika unauthorized-continue-uri, fallback tanpa actionCodeSettings
          if (e?.code === "auth/unauthorized-continue-uri") {
            console.warn("Fallback: unauthorized-continue-uri, kirim tanpa continue URL");
            await sendPasswordResetEmail(auth, email);
          } else {
            throw e;
          }
        }
      } else {
        await sendPasswordResetEmail(auth, email);
      }

      setMsg("Tautan reset password sudah dikirim. Silakan cek inbox/spam email Anda.");
    } catch (e: any) {
      console.error("sendPasswordResetEmail error:", e?.code, e?.message);
      if (e?.code === "auth/invalid-email") {
        setErr("Format email tidak valid.");
      } else if (e?.code === "auth/user-not-found") {
        // Kadang bisa muncul, tergantung konfigurasi: beri pesan netral
        setMsg("Jika email terdaftar, tautan reset akan dikirim.");
      } else if (e?.code === "auth/network-request-failed") {
        setErr("Jaringan bermasalah. Coba lagi.");
      } else {
        setErr("Gagal mengirim tautan reset. Coba lagi beberapa saat.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleReset}>
      <input
        type="email"
        value={email}
        onChange={(e)=>setEmail(e.target.value)}
        required
        placeholder="Email Anda"
      />
      <button type="submit" disabled={loading}>
        {loading ? "Mengirim..." : "Kirim Tautan Reset"}
      </button>
      {msg && <p style={{color:"#16a34a"}}>{msg}</p>}
      {err && <p style={{color:"#ef4444"}}>{err}</p>}
    </form>
  );
}
