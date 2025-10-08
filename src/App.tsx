import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Login from "./Login";
import Register from "./Register";
import Calendar from "./calendar";
import Dashboard from "./Dashboard";

/**
 * Komponen route khusus: hanya role tertentu yang bisa akses
 */
import type { ReactElement } from "react";

function PrivateRoute({
  children,
  allowedRoles,
}: {
  children: ReactElement;
  allowedRoles: string[];
}) {

  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    setRole(storedRole);
  }, []);

  if (role === null) {
    // Tunggu role terbaca dulu (hindari redirect flicker)
    return <div style={{ textAlign: "center", padding: "50px" }}>Memuat...</div>;
  }

  // Tidak login → arahkan ke login
  if (!role) return <Navigate to="/login" replace />;

  // Role tidak diizinkan → arahkan ke calendar (readonly)
  if (!allowedRoles.includes(role)) return <Navigate to="/calendar" replace />;

  return children;
}

export default function App() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    // Pastikan role dibaca sekali saat app start
    const storedRole = localStorage.getItem("role");
    setRole(storedRole);
  }, []);

  const canEdit = role === "admin" || role === "dev";

  return (
    <Router>
      <Routes>
        {/* 🔐 Auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* 📅 Calendar (editable hanya untuk admin/dev) */}
        <Route path="/calendar" element={<Calendar canEdit={canEdit} />} />

        {/* 👑 Dashboard (khusus dev) */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute allowedRoles={["dev"]}>
              <Dashboard />
            </PrivateRoute>
          }
        />

        {/* 🔁 Default redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
