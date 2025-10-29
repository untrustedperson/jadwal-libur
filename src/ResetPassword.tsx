import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "./firebaseConfig";
import { Link } from "react-router-dom";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setError("");
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMsg("Tautan reset password telah dikirim. Cek email kamu.");
      // Opsional: kembali ke login setelah beberapa detik
      // setTimeout(() => navigate("/login"), 2500);
    } catch (err: any) {
      console.error("Reset password error:", err);
      switch (err.code) {
        case "auth/invalid-email":
          setError("Format email tidak valid.");
          break;
        case "auth/user-not-found":
          setError("Email tidak terdaftar.");
          break;
        case "auth/too-many-requests":
          setError("Terlalu banyak percobaan. Coba lagi nanti.");
          break;
        default:
          setError("Gagal mengirim email reset password.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>🔑 Lupa Password</h2>

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

        {msg && <p style={{ ...styles.info, color: "#16a34a" }}>{msg}</p>}
        {error && <p style={styles.error}>{error}</p>}

        <p style={styles.linkText}>
          <Link to="/login" style={styles.link}>← Kembali ke Login</Link>
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
  error: { color: "red", fontSize: 14, marginTop: 8 },
  info: { fontSize: 14, marginTop: 8 },
  linkText: { color: "#2563eb", marginTop: 16, fontSize: 14 },
  link: { color: "#2563eb", fontWeight: 600, textDecoration: "none" },
};
