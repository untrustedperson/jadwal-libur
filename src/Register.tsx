import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebaseConfig";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password minimal 6 karakter!");
      return;
    }

    try {
      setLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Set role default = viewer
      await setDoc(doc(db, "roles", uid), { email, role: "viewer" });

      // (opsional) simpan role agar UI langsung tahu
      localStorage.setItem("role", "viewer");

      navigate("/calendar");
    } catch (err: any) {
      if (err.code === "auth/weak-password") {
        setError("Password minimal 6 karakter!");
      } else if (err.code === "auth/email-already-in-use") {
        setError("Email sudah terdaftar.");
      } else if (err.code === "auth/invalid-email") {
        setError("Format email tidak valid.");
      } else {
        setError("Terjadi kesalahan saat register. Coba lagi.");
      }
      console.error("register error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="register-container" style={{ maxWidth: 360, margin: "40px auto" }}>
      <h2>Daftar Akun</h2>

      <form onSubmit={handleRegister} style={{ display: "grid", gap: 8 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password (min 6)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={6}
        />

        <button type="submit" disabled={loading} style={{ padding: "8px 12px" }}>
          {loading ? "Mendaftar..." : "Daftar"}
        </button>
      </form>

      {error && <p style={{ color: "red", marginTop: 8 }}>{error}</p>}

      <div style={{ marginTop: 12 }}>
        <Link to="/login">Sudah punya akun? Login</Link>
      </div>
    </div>
  );
}
