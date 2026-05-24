import { Navigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";

export default function RoleRoute({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to="/" replace />;
  return children;
}
