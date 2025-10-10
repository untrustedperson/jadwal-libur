import { useState } from "react"; // ⬅️ hapus useEffect karena tidak digunakan
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "./firebaseConfig";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 🔹 Login Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // 🔹 Ambil role user dari Firestore
      const userDoc = await getDoc(doc(db, "roles", uid));
      const role = userDoc.exists() ? userDoc.data().role : "viewer";

      // 🔹 Simpan role
      localStorage.setItem("role", role);

      // 🔁 Dengarkan perubahan role realtime
      onSnapshot(doc(db, "roles", uid), (snap) => {
        if (snap.exists()) {
          const newRole = snap.data().role;
          const oldRole = localStorage.getItem("role");
          if (newRole !== oldRole) {
            console.log("🔄 Role berubah:", oldRole, "→", newRole);
            localStorage.setItem("role", newRole);
            navigate(0); // ✅ re-render tanpa reload penuh
          }
        }
      });

      // 🔹 Arahkan sesuai role
      setTimeout(() => {
        if (role === "dev") navigate("/dashboard", { replace: true });
        else navigate("/calendar", { replace: true });
      }, 300);
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        setError("Email atau password salah.");
      } else if (err.code === "auth/user-not-found") {
        setError("Akun tidak ditemukan.");
      } else {
        setError("Terjadi kesalahan saat login.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>🔐 Login</h2>

        <form onSubmit={handleLogin} style={styles.form}>
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
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>

        {error && <p style={styles.error}>{error}</p>}

        <p style={styles.linkText}>
          Belum punya akun?{" "}
          <a href="/register" style={styles.link}>
            Daftar
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
    background: "linear-gradient(135deg, #2563eb, #60a5fa)",
    overflow: "hidden",
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
  linkText: { color: "#2563eb", marginTop: 16, fontSize: 14 },
  link: { color: "#2563eb", fontWeight: 600, textDecoration: "none" },
};

