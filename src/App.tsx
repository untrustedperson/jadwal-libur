import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import Register from "./Register";
import Calendar from "./calendar";
import Dashboard from "./Dashboard";
import { onSnapshot, doc } from "firebase/firestore";
import { auth, db } from "./firebaseConfig";

function PrivateRoute({ children, allowedRoles }: { children: React.ReactElement; allowedRoles: string[] }) {
  const role = localStorage.getItem("role");
  if (!role) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(role)) return <Navigate to="/calendar" replace />;
  return children;
}
export default function App() {
  const [role, setRole] = useState<string | null>(localStorage.getItem("role"));

  // 🔁 Listen for Firestore role changes
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsub = onSnapshot(doc(db, "roles", user.uid), (snap) => {
      if (snap.exists()) {
        const newRole = snap.data().role;
        if (newRole !== localStorage.getItem("role")) {
          localStorage.setItem("role", newRole);
          setRole(newRole);
        }
      }
    });

    return () => unsub();
  }, [auth.currentUser]);

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
