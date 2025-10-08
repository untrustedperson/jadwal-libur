import { useEffect } from "react";
import { useAuth } from "./auth";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { isReady, hasToken, role, login } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (hasToken && role) {
      nav("/app", { replace: true });
    }
  }, [hasToken, role, nav]);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div style={{ background: "#fff", padding: 24, borderRadius: 12 }}>
        <h1>Jadwal Libur</h1>
        <p>Silakan login dengan Google untuk melanjutkan.</p>
        <button onClick={login} disabled={!isReady}>
          {isReady ? "Login dengan Google" : "Menyiapkan login..."}
        </button>
      </div>
    </div>
  );
}

