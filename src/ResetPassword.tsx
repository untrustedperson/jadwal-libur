import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "./firebaseConfig";
import { Link } from "react-router-dom";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setErr("");
    setLoading(true);

    try {
      // ✅ Pastikan continue URL berasal dari domain kamu (harus ada di Authorized domains)
      const actionCodeSettings = {
        url: `${window.location.origin}/login`, // setelah klik "Reset", user kembali ke Login
        handleCodeInApp: false, // reset password standar
      };

      await sendPasswordResetEmail(auth, email, actionCodeSettings);

      setMsg(
        "Tautan reset password sudah dikirim. Silakan cek inbox/spam email Anda."
      );
    } catch (e: any) {
      console.error("reset error:", e);
      let message = "Gagal mengirim tautan reset.";
      switch (e.code) {
        case "auth/invalid-email":
          message = "Format email tidak valid.";
          break;
        case "auth/user-not-found":
          // Catatan: beberapa project menyembunyikan error ini demi privasi.
          message = "Email tidak terdaftar.";
          break;
        case "auth/too-many-requests":
          message =
            "Terlalu banyak percobaan. Coba lagi beberapa saat.";
          break;
        case "auth/network-request-failed":
          message = "Jaringan bermasalah. Periksa koneksi internet Anda.";
          break;
        case "auth/unauthorized-continue-uri":
          message =
            "URL lanjutan (continue URL) belum diizinkan di Firebase Auth.";
          break;
        default:
          message = e.message || message;
      }
      setErr(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>🔑 Reset Password</h2>

        <form onSubmit={handleReset} style={styles.form}>
          <input
            type="email"
            placeholder="Masukkan email terdaftar"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Mengirim..." : "Kirim Tautan Reset"}
          </button>
        </form>

        {msg && <p style={styles.success}>{msg}</p>}
        {err && <p style={styles.error}>{err}</p>}

        <p style={styles.linkText}>
          Kembali ke{" "}
          <Link to="/login" style={styles.link}>
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    width: "100vw",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #2563eb, #60a5fa)",
    padding: "0 16px",
    boxSizing: "border-box",
  },
  card: {
    background: "#fff",
    padding: "32px 28px",
    borderRadius: 12,
    boxShadow: "0 6px 20px rgba(0,0,0,0.1)",
    width: "100%",
    maxWidth: 380,
    textAlign: "center",
  },
  title: { marginBottom: 24, color: "#1e3a8a" },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  input: {
    padding: "10px 14px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
  },
  button: {
    padding: "10px",
    borderRadius: 8,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
  success: { color: "#16a34a", fontSize: 14, marginTop: 8 },
  error: { color: "red", fontSize: 14, marginTop: 8 },
  linkText: { color: "#2563eb", marginTop: 16, fontSize: 14 },
  link: { color: "#2563eb", fontWeight: 600, textDecoration: "none" },
};
