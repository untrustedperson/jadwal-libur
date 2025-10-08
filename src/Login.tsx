import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "./firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // ambil role dari Firestore
      const userDoc = await getDoc(doc(db, "roles", uid));
      const role = userDoc.exists() ? userDoc.data().role : "viewer";

      console.log("User logged in with role:", role);

      // simpan role ke localStorage SEBELUM navigate
      localStorage.setItem("role", role);

      // arahkan ke halaman sesuai role
      if (role === "dev") navigate("/dashboard");
      else navigate("/calendar");
    } catch (err: any) {
      console.error("Login error:", err);
      setError("Email atau password salah.");
    }
  }

  return (
    <div className="login-container">
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button type="submit">Login</button>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <a href="/register">Belum punya akun? Daftar</a>
    </div>
  );
}
