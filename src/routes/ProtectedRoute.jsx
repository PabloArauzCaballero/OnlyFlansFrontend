import { Navigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isBootstrapping } = useAuth();

  if (isBootstrapping) return <section className="card"><p>Validando sesión...</p></section>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}
