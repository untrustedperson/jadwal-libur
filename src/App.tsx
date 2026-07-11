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
import Calendar from "./calendar";
import Dashboard from "./Dashboard";
import ManageEmployees from "./ManageEmployees";
import ResetPassword from "./ResetPassword";
import { auth, db } from "./firebaseConfig";
import { onSnapshot, doc } from "firebase/firestore";

// ✅ Komponen PrivateRoute
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

// ✅ Komponen utama yang mengatur logika auth & navigasi
function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [_role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;


    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
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

        if (
          location.pathname !== "/login" &&
          location.pathname !== "/register" &&
          location.pathname !== "/reset-password"
        ) {
          navigate("/login", { replace: true });
        }
        return;
      }

      if (!user) {
        setLoading(false);
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

          // Navigasi otomatis setelah login/register
          if (newRole === "admin" || newRole === "viewer") {
            if (
              location.pathname === "/login" ||
              location.pathname === "/register" ||
              location.pathname === "/reset-password"
            ) {
              navigate("/calendar", { replace: true });
            }
          } else if (newRole === "dev") {
            if (
              location.pathname === "/login" ||
              location.pathname === "/register" ||
              location.pathname === "/reset-password"
            ) {
              navigate("/dashboard", { replace: true });
            }
          }
        } else {
          console.warn("⚠️ Role tidak ditemukan di Firestore, menetapkan viewer...");
          localStorage.setItem("role", "viewer");
          setRole("viewer");
          if (
            location.pathname === "/login" ||
            location.pathname === "/register" ||
            location.pathname === "/reset-password"
          ) {
            navigate("/calendar", { replace: true });
          }
        }

        setLoading(false);
      });

      return () => unsubscribeRole();
    });

    // ✅ Fallback agar mobile tidak stuck di "memuat aplikasi"
    timeoutId = setTimeout(() => {
      console.warn("⏳ Timeout: auth state lambat, keluar dari loading.");
      setLoading(false);
    }, 10000); // 10 detik timeout

    return () => {
      unsubscribeAuth();
      clearTimeout(timeoutId);
    };
  }, [navigate, location.pathname]);

  if (loading) {
    return (
      <div
        style={{
          height: "100dvh",
          minHeight: "100svh",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          fontSize: 18,
          color: "#2563eb",
          fontWeight: 600,
          background: "linear-gradient(135deg, #2563eb, #60a5fa)",
          textAlign: "center",
          overflow: "hidden",
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
