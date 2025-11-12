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
  const unsubscribeAuth = auth.onAuthStateChanged((user) => {
    const isDeletingUser = localStorage.getItem("deleting_user") === "true";

    if (!user && !isDeletingUser) {
      const localRole = localStorage.getItem("role");
      if (localRole === "dev") {
        console.log("⚠️ Auth token invalid tapi role dev tetap dipertahankan.");
        setLoading(false); // ✅ FIX: pastikan tetap hilang loading
        return;
      }

      setRole(null);
      localStorage.removeItem("role");

      // ✅ Pastikan loading di-set ke false walau user tidak ada
      setLoading(false);

      const PUBLIC_PATHS = ["/login", "/register", "/reset-password"];
      if (!PUBLIC_PATHS.includes(location.pathname)) {
        navigate("/login", { replace: true });
      }
      return;
    }

    // ✅ FIX: Tambahkan guard agar tidak menggantung
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

    // ✅ Pastikan unsubscribeRole tidak menyebabkan race
    return () => {
      try {
        unsubscribeRole();
      } catch (e) {
        console.warn("unsubscribeRole gagal (bisa diabaikan):", e);
      }
    };
  });

  return () => unsubscribeAuth();
}, [navigate, location.pathname]);

  if (loading) {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontSize: 18,
        color: "#2563eb",
        fontWeight: 600,
        padding: 20,
        textAlign: "center",
      }}
    >
      ⏳ Memuat aplikasi...<br />
      Mohon tunggu sebentar, koneksi Anda sedang diperiksa.
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
