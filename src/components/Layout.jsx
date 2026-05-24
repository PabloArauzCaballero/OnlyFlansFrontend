import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { ROLES } from "../services/onlyflansApi.js";
import { useAuth } from "../state/AuthContext.jsx";

export default function Layout() {
  const { user, isAuthenticated, isBootstrapping, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand" aria-label="Ir al inicio de OnlyFlans">
          <span className="brand-mark">OF</span>
          <span>OnlyFlans</span>
        </Link>

        <nav className="nav-links" aria-label="Navegación principal">
          <NavLink to="/creators">Creadores</NavLink>
          {user?.role === ROLES.CREATOR && <NavLink to="/creator/dashboard">Panel creador</NavLink>}
          {user?.role === ROLES.FOLLOWER && <NavLink to="/follower/dashboard">Panel seguidor</NavLink>}
          {isBootstrapping ? (
            <span className="nav-status">Validando sesión...</span>
          ) : isAuthenticated ? (
            <button className="link-button" onClick={handleLogout}>Salir ({user.name})</button>
          ) : (
            <>
              <NavLink to="/login">Entrar</NavLink>
              <NavLink to="/register" className="nav-cta">Registro</NavLink>
            </>
          )}
        </nav>
      </header>

      <main className="container">
        <Outlet />
      </main>
    </div>
  );
}
