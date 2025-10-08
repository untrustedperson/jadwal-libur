import React from "react";
import { useAuth } from "./auth";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { isReady, hasToken, user, role, login, logout } = useAuth();
  const nav = useNavigate();

  const handleLogin = async () => {
    await login();
  };

  React.useEffect(() => {
    if (hasToken && role) {
      nav("/app");
    }
  }, [hasToken, role, nav]);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f7f7f8" }}>
      <div style={{ background: "#fff", padding: 24, borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.08)", width: 360 }}>
        <h1 style={{ marginTop: 0 }}>Jadwal Libur</h1>
        <p style={{ color: "#555" }}>Silakan login dengan Google untuk melanjutkan.</p>

        <button
          onClick={handleLogin}
          disabled={!isReady}
          style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", cursor: "pointer" }}
        >
          {isReady ? "Login dengan Google" : "Menyiapkan login..."}
        </button>

        {user && (
          <div style={{ marginTop: 16, fontSize: 14, color: "#333" }}>
            <div>Masuk sebagai: <b>{user.email}</b></div>
            <div>Role: <b>{role}</b></div>
            <button onClick={logout} style={{ marginTop: 8, padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd" }}>
              Logout
            </button>
          </div>
        )}

        <div style={{ marginTop: 16, fontSize: 12, color: "#777" }}>
          * Admin dapat CRUD kalender; Viewer hanya dapat melihat.
        </div>
      </div>
    </div>
  );
}
