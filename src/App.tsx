import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import Login from "./Login";
import Register from "./Register";
import Calendar from "./calendar";
import Dashboard from "./Dashboard";
import ManageEmployees from "./ManageEmployees";
import { auth, db } from "./firebaseConfig";
import { onSnapshot, doc } from "firebase/firestore";

// ✅ Komponen PrivateRoute
function PrivateRoute({ children, allowedRoles }: { children: React.ReactElement; allowedRoles: string[] }) {
  const role = localStorage.getItem("role");
  if (!role) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(role)) return <Navigate to="/calendar" replace />;
  return children;
}

// ✅ Komponen Wrapper untuk handle auth/role logic
function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [_role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const unsubscribeAuth = auth.onAuthStateChanged((user) => {
    if (!user) {
      setRole(null);
      localStorage.removeItem("role");
      setLoading(false);

      // ✅ Izinkan akses login & register tanpa redirect
      if (location.pathname !== "/login" && location.pathname !== "/register") {
        navigate("/login", { replace: true });
      }
      return;
    }

    const roleRef = doc(db, "roles", user.uid);
    const unsubscribeRole = onSnapshot(roleRef, (docSnap) => {
      if (docSnap.exists()) {
        const newRole = docSnap.data().role;
        const oldRole = localStorage.getItem("role");

        if (newRole !== oldRole) {
          console.log(`🔄 Role berubah: ${oldRole || "none"} → ${newRole}`);
          localStorage.setItem("role", newRole);
          setRole(newRole);
        } else if (!oldRole) {
          localStorage.setItem("role", newRole);
          setRole(newRole);
        }

        // ✅ Arahkan otomatis hanya jika di login/register
        if (location.pathname === "/login" || location.pathname === "/register") {
          if (newRole === "dev") navigate("/dashboard", { replace: true });
          else navigate("/calendar", { replace: true });
        }
      } else {
        console.warn("⚠️ Role tidak ditemukan di Firestore, menetapkan viewer...");
        localStorage.setItem("role", "viewer");
        setRole("viewer");

        if (location.pathname === "/login" || location.pathname === "/register") {
          navigate("/calendar", { replace: true });
        }
      }

      setLoading(false);
    });

    return () => unsubscribeRole();
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
        }}
      >
        ⏳ Memuat aplikasi...
      </div>
    );
  }

  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

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

      {/* Default route */}
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
