import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import Login from "./Login";
import Register from "./Register";
import ResetPassword from "./ResetPassword";
import Calendar from "./calendar";
import Dashboard from "./Dashboard";
import ManageEmployees from "./ManageEmployees";
import { auth, db } from "./firebaseConfig";
import { onSnapshot, doc } from "firebase/firestore";

// ✅ Private Route untuk proteksi halaman berdasarkan role
function PrivateRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactElement;
  allowedRoles: string[];
}) {
  const role = localStorage.getItem("role");
  if (!role) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(role)) return <Navigate to="/calendar" replace />;
  return children;
}

// ✅ Komponen utama dengan kontrol auth & role
function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [_role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

useEffect(() => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  // 🕒 Fallback otomatis setelah 5 detik jika auth state tidak terdeteksi
  timeoutId = setTimeout(() => {
    console.warn("⏳ Timeout: auth state tidak terdeteksi, alihkan ke /login.");
    setLoading(false);
    navigate("/login", { replace: true });
  }, 5000);

  const unsubscribeAuth = auth.onAuthStateChanged((user) => {
    if (timeoutId) clearTimeout(timeoutId); // ✅ Batalkan fallback jika listener terpicu

    const isDeletingUser = localStorage.getItem("deleting_user") === "true";

    if (!user && !isDeletingUser) {
      const localRole = localStorage.getItem("role");
      if (localRole === "dev") {
        console.log("⚠️ Auth token invalid tapi role dev tetap dipertahankan.");
        setLoading(false);
        return;
      }

      setRole(null);
      localStorage.removeItem("role");
      setLoading(false);

      const PUBLIC_PATHS = ["/login", "/register", "/reset-password"];
      if (!PUBLIC_PATHS.includes(location.pathname)) {
        navigate("/login", { replace: true });
      }
      return;
    }

    // ✅ Jika user kosong, akhiri loading
    if (!user) {
      setLoading(false);
      return;
    }

    const roleRef = doc(db, "roles", user.uid);
    const unsubscribeRole = onSnapshot(roleRef, (docSnap) => {
      if (docSnap.exists()) {
        const newRole = docSnap.data().role;
        const oldRole = localStorage.getItem("role");

        if (newRole !== oldRole || !oldRole) {
          localStorage.setItem("role", newRole);
          setRole(newRole);
        }

        const AUTH_PAGES = ["/login", "/register"];
        if (AUTH_PAGES.includes(location.pathname)) {
          if (newRole === "dev") navigate("/dashboard", { replace: true });
          else navigate("/calendar", { replace: true });
        }
      } else {
        console.warn("⚠️ Role tidak ditemukan di Firestore, menetapkan viewer...");
        localStorage.setItem("role", "viewer");
        setRole("viewer");

        const AUTH_PAGES = ["/login", "/register"];
        if (AUTH_PAGES.includes(location.pathname)) {
          navigate("/calendar", { replace: true });
        }
      }

      setLoading(false);
    });

    return () => {
      try {
        unsubscribeRole();
      } catch (e) {
        console.warn("unsubscribeRole gagal:", e);
      }
    };
  });

  // ✅ Bersihkan listener & timeout saat unmount
  return () => {
    if (timeoutId) clearTimeout(timeoutId);
    unsubscribeAuth();
  };
}, [navigate, location.pathname]);


 if (loading) {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        fontSize: 18,
        color: "#2563eb",
        fontWeight: 600,
        background: "linear-gradient(135deg, #2563eb, #60a5fa)",
        textAlign: "center",
      }}
    >
      <div>⏳ Memuat aplikasi...</div>

      {/* 🔵 Animasi tiga titik */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: 12,
          gap: 8,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#fff",
              opacity: 0.8,
              animation: `pulse 1.5s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>

      {/* 🧩 Tambahkan CSS animasi lewat <style> inline */}
      <style>
        {`
          @keyframes pulse {
            0%, 80%, 100% { transform: scale(0.8); opacity: 0.6; }
            40% { transform: scale(1.2); opacity: 1; }
          }
        `}
      </style>
    </div>
  );
}

  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Kalender */}
      <Route path="/calendar" element={<Calendar />} />

      {/* CRUD Pegawai (admin & dev) */}
      <Route
        path="/manage-employees"
        element={
          <PrivateRoute allowedRoles={["admin", "dev"]}>
            <ManageEmployees />
          </PrivateRoute>
        }
      />

      {/* Dashboard Dev */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute allowedRoles={["dev"]}>
            <Dashboard />
          </PrivateRoute>
        }
      />

      {/* Default Route */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
