import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import Login from "./Login";
import Calendar from "./calendar";

function AppRoutes() {
  const { hasToken, role } = useAuth();

  return (
    <Routes>
      {/* default masuk ke login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<Login />} />

      {/* butuh login; kalau belum login -> ke /login */}
      <Route
        path="/app"
        element={
          hasToken && role ? (
            <Calendar canEdit={role === "admin"} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
