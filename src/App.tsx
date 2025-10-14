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
    // ✅ Dengarkan perubahan autentikasi
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      const isDeletingUser = localStorage.getItem("deleting_user") === "true";

      // ⛔ Jika user belum login & bukan sedang hapus user
      if (!user && !isDeletingUser) {
        const localRole = localStorage.getItem("role");
        if (localRole === "dev") {
          console.log("⚠️ Auth token invalid tapi role dev dipertahankan.");
          return; // jangan logout otomatis
        }

        setRole(null);
        localStorage.removeItem("role");
        setLoading(false);

        // 🚫 Jangan redirect jika sudah di /login atau /register
        if (
          location.pathname !== "/login" &&
          location.pathname !== "/register"
        ) {
          navigate("/login", { replace: true });
        }
        return;
      }

      // ✅ Jika user login, dengarkan role di Firestore
      if (user) {
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

            // 🚀 Navigasi otomatis setelah login/register
            if (newRole === "admin" || newRole === "viewer") {
              if (
                location.pathname === "/login" ||
                location.pathname === "/register"
              ) {
                navigate("/calendar", { replace: true });
              }
            } else if (newRole === "dev") {
              if (
                location.pathname === "/login" ||
                location.pathname === "/register"
              ) {
                navigate("/dashboard", { replace: true });
              }
            }
          } else {
            console.warn(
              "⚠️ Role tidak ditemukan di Firestore, menetapkan viewer..."
            );
            localStorage.setItem("role", "viewer");
            setRole("viewer");

            if (
              location.pathname === "/login" ||
              location.pathname === "/register"
            ) {
              navigate("/calendar", { replace: true });
            }
          }

          setLoading(false);
        });

        // 🧹 Bersihkan listener Firestore jika auth berubah
        return () => unsubscribeRole();
      }

      setLoading(false);
    });

    // 🧹 Bersihkan listener auth saat unmount
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
