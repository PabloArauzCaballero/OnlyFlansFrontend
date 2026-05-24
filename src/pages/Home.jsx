import { Link } from "react-router-dom";
import { ROLES } from "../services/onlyflansApi.js";
import { useAuth } from "../state/AuthContext.jsx";

export default function Home() {
  const { user } = useAuth();

  return (
    <section className="home-grid">
      <article className="hero card surface-hero">
        <div className="hero-copy">
          <p className="eyebrow">Frontend ajustado al backend real</p>
          <h1>Apoyos simbólicos, perfiles públicos y comunidad en una interfaz simple.</h1>
          <p>
            Esta versión consume las rutas reales del backend Express: autenticación por rol, perfiles de creadores,
            publicaciones, imágenes, comentarios, favoritos, seguidos y apoyos.
          </p>
          <div className="actions">
            <Link className="button" to="/creators">Explorar creadores</Link>
            {!user && <Link className="button secondary" to="/register">Crear cuenta</Link>}
            {user?.role === ROLES.CREATOR && <Link className="button secondary" to="/creator/dashboard">Ir a mi panel</Link>}
            {user?.role === ROLES.FOLLOWER && <Link className="button secondary" to="/follower/dashboard">Ir a mi feed</Link>}
          </div>
        </div>

        <aside className="hero-panel" aria-label="Resumen de la plataforma">
          <div><span className="metric">/api/auth</span><small>Login, registro por rol, logout y sesión actual</small></div>
          <div><span className="metric">2 roles</span><small>Creador y seguidor</small></div>
          <div><span className="metric">FLAN</span><small>Tipo de apoyo simbólico desde el catálogo del backend</small></div>
        </aside>
      </article>

      <div className="feature-grid">
        <article className="feature-card">
          <span>01</span>
          <h3>Creadores</h3>
          <p>Listado público desde <code>/api/usuarios/perfiles-creadores</code>.</p>
        </article>
        <article className="feature-card">
          <span>02</span>
          <h3>Publicaciones</h3>
          <p>Texto e imágenes usando <code>/api/publicaciones</code> y <code>/api/publicaciones/imagenes</code>.</p>
        </article>
        <article className="feature-card">
          <span>03</span>
          <h3>Apoyos</h3>
          <p>Donaciones simbólicas contra <code>/api/apoyos</code>.</p>
        </article>
      </div>
    </section>
  );
}
