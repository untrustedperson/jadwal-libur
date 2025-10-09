import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import Register from "./Register";
import Calendar from "./calendar";
import Dashboard from "./Dashboard";

interface PrivateRouteProps {
  children: React.ReactElement;
  allowedRoles: string[];
}

function PrivateRoute({ children, allowedRoles }: PrivateRouteProps) {
  const role = localStorage.getItem("role");

  if (!role) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(role)) return <Navigate to="/calendar" replace />;

  return children;
}

export default function App() {
  const [role, setRole] = useState<string | null>(localStorage.getItem("role"));

  // 🔁 Sinkronisasi role dengan localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      setRole(localStorage.getItem("role"));
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Calendar: hanya admin & dev bisa CRUD */}
        <Route
          path="/calendar"
          element={<Calendar canEdit={role === "admin" || role === "dev"} />}
        />

        {/* Dashboard: hanya dev */}
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
