import { Navigate, useLocation } from "react-router-dom";
import { LoadingCard } from "../components/Status.jsx";
import { useAuth } from "../state/AuthContext.jsx";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const location = useLocation();

  if (isBootstrapping) return <LoadingCard>Validando sesión con el backend...</LoadingCard>;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}
