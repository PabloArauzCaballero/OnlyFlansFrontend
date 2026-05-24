import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { ROLES } from "../services/onlyflansApi.js";
import { useAuth } from "../state/AuthContext.jsx";

function initials(name = "OF") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function Layout() {
  const { user, isAuthenticated, isBootstrapping, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand" aria-label="Ir al inicio de OnlyFlans">
          <span className="brand-mark">OF</span>
          <span>
            <strong>OnlyFlans</strong>
            <small>Creator support</small>
          </span>
        </Link>

        <nav className="nav-links" aria-label="Navegación principal">
          <NavLink to="/creators">Explorar</NavLink>
          {user?.role === ROLES.CREATOR && <NavLink to="/creator/dashboard">Panel creador</NavLink>}
          {user?.role === ROLES.FOLLOWER && <NavLink to="/follower/dashboard">Panel seguidor</NavLink>}

          {isBootstrapping ? (
            <span className="nav-status">Validando sesión...</span>
          ) : isAuthenticated ? (
            <button className="user-chip" onClick={handleLogout} title="Cerrar sesión">
              <span>{initials(user?.name || user?.nombre)}</span>
              <strong>{user?.name || user?.nombre}</strong>
              <small>Salir</small>
            </button>
          ) : (
            <>
              <NavLink to="/login">Entrar</NavLink>
              <NavLink to="/register" className="nav-cta">Crear cuenta</NavLink>
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
