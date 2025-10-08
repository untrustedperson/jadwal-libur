import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebaseConfig";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      // 🔹 Daftarkan akun ke Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // 🔹 Simpan role default "viewer" di Firestore
      await setDoc(doc(db, "roles", uid), { email, role: "viewer" });

      // 🔹 Reset dan simpan role baru ke localStorage
      localStorage.clear();
      localStorage.setItem("role", "viewer");

      // 🔹 Arahkan ke halaman kalender
      navigate("/calendar");
    } catch (err: any) {
      console.error("Register error:", err);
      if (err.code === "auth/weak-password") {
        setError("Password minimal 6 karakter!");
      } else if (err.code === "auth/email-already-in-use") {
        setError("Email sudah terdaftar.");
      } else {
        setError("Terjadi kesalahan saat mendaftar.");
      }
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>📝 Daftar Akun</h2>

        <form onSubmit={handleRegister} style={styles.form}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
          />
          <button type="submit" style={styles.button}>
            Daftar
          </button>
        </form>

        {error && <p style={styles.error}>{error}</p>}

        <p style={styles.linkText}>
          Sudah punya akun?{" "}
          <a href="/login" style={styles.link}>
            Login
          </a>
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
    background: "linear-gradient(135deg, #16a34a, #4ade80)",
    overflowX: "hidden", // 🔒 mencegah background sisi kanan
    overflowY: "auto",
    margin: 0,
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
    boxSizing: "border-box",
  },
  title: {
    marginBottom: 24,
    color: "#1e3a8a",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  input: {
    padding: "10px 14px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  button: {
    padding: "10px",
    borderRadius: 8,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
    transition: "0.2s",
    width: "100%",
  },
  error: {
    color: "red",
    fontSize: 14,
    marginTop: 8,
  },
  linkText: {
    marginTop: 16,
    fontSize: 14,
  },
  link: {
    color: "#2563eb",
    fontWeight: 600,
    textDecoration: "none",
  },
};
