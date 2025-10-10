import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import Register from "./Register";
import Calendar from "./calendar";
import Dashboard from "./Dashboard";
import { auth, db } from "./firebaseConfig";
import { onSnapshot, doc } from "firebase/firestore";
import ManageEmployees from "./ManageEmployees";

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

export default function App() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      const roleRef = doc(db, "roles", user.uid);
      const unsubRole = onSnapshot(roleRef, (docSnap) => {
        if (docSnap.exists()) {
          const newRole = docSnap.data().role;
          const oldRole = localStorage.getItem("role");

          if (newRole !== oldRole) {
            console.log("🔄 Role berubah:", oldRole, "→", newRole);
            localStorage.setItem("role", newRole);
            setRole(newRole);
          } else if (!oldRole) {
            // Jika localStorage belum sempat diisi oleh Login
            localStorage.setItem("role", newRole);
            setRole(newRole);
          }
        }
        setLoading(false);
      });

      return () => unsubRole();
    });

    return () => unsubscribeAuth();
  }, []);

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
        }}
      >
        ⏳ Memuat aplikasi...
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/calendar"
          element={<Calendar canEdit={role === "admin" || role === "dev"} />}
        />
        <Route
  path="/manage-employees"
  element={
    <PrivateRoute allowedRoles={["admin", "dev"]}>
      <ManageEmployees />
    </PrivateRoute>
  }
/>

        <Route
          path="/dashboard"
          element={
            <PrivateRoute allowedRoles={["dev"]}>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
