import { Navigate } from "react-router-dom";

export default function PrivateRoute({ children, role, allowed }: { children: any, role: string, allowed: string[] }) {
  if (!allowed.includes(role)) {
    return <Navigate to="/calendar" />;
  }
  return children;
}
