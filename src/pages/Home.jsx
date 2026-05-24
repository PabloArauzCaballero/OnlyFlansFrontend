import { Link } from "react-router-dom";
import { ROLES } from "../services/onlyflansApi.js";
import { useAuth } from "../state/AuthContext.jsx";

export default function Home() {
  const { user } = useAuth();

  return (
    <section className="hero card surface-hero">
      <div className="hero-copy">
        <p className="eyebrow">Apoyo simbólico para creadores</p>
        <h1>Una plataforma simple para apoyar, publicar y construir comunidad.</h1>
        <p>
          OnlyFlans conecta creadores y seguidores mediante apoyos simbólicos. El frontend se organiza alrededor de rutas públicas,
          rutas protegidas por sesión y paneles separados por rol para mantener la experiencia clara.
        </p>
        <div className="actions">
          <Link className="button" to="/creators">Explorar creadores</Link>
          {!user && <Link className="button secondary" to="/register">Crear cuenta</Link>}
          {user?.role === ROLES.CREATOR && <Link className="button secondary" to="/creator/dashboard">Ir al panel</Link>}
          {user?.role === ROLES.FOLLOWER && <Link className="button secondary" to="/follower/dashboard">Ir al feed</Link>}
        </div>
      </div>

      <aside className="hero-panel" aria-label="Resumen de funcionamiento">
        <div>
          <span className="metric">Bs. 10</span>
          <small>Valor base de 1 flan</small>
        </div>
        <div>
          <span className="metric">2 roles</span>
          <small>Creador y seguidor</small>
        </div>
        <div>
          <span className="metric">CRUD</span>
          <small>Conectado a módulos documentados</small>
        </div>
      </aside>
    </section>
  );
}
