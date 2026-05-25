import { Link } from "react-router-dom";
import { Heart, DollarSign, Lock, Target, Users, Shield, MessageSquare } from "lucide-react";
import { ROLES } from "../services/onlyflansApi.js";
import { useAuth } from "../state/AuthContext.jsx";

export default function Home() {
  const { user } = useAuth();

  return (
    <section className="home-grid">
      <article className="hero card surface-hero">
        <div className="hero-copy">
          <p className="eyebrow"><Heart size={14} className="lucide-icon inline-icon" style={{ fill: 'currentColor' }} /> Plataforma OnlyFlans</p>
          <h1>La forma más dulce de apoyar a tus creadores favoritos.</h1>
          <p>
            Regístrate para comprar flanes simbólicos, desbloquear contenido exclusivo
            y conectar directamente con las mentes creativas que te inspiran.
          </p>
          <div className="actions">
            <Link className="button" to="/creators">Explorar creadores</Link>
            {!user && <Link className="button secondary" to="/register">Crear cuenta</Link>}
            {user?.role === ROLES.CREATOR && <Link className="button secondary" to="/creator/dashboard">Ir a mi panel</Link>}
            {user?.role === ROLES.FOLLOWER && <Link className="button secondary" to="/follower/dashboard">Ir a mi feed</Link>}
          </div>
        </div>

        <aside className="hero-panel" aria-label="Resumen de la plataforma">
          <div>
            <span className="metric"><DollarSign size={20} className="lucide-icon inline-icon" /> Bs. 10.00</span>
            <small>Valor fijo por flan. ¡La forma más dulce de donar!</small>
          </div>
          <div>
            <span className="metric"><Lock size={20} className="lucide-icon inline-icon" /> Exclusividad</span>
            <small>Desbloquea las publicaciones del creador apoyando con al menos 1 flan.</small>
          </div>
          <div>
            <span className="metric"><Target size={20} className="lucide-icon inline-icon" /> Metas Reales</span>
            <small>Los creadores proponen metas específicas para incentivar a sus seguidores.</small>
          </div>
        </aside>
      </article>

      <div className="feature-grid">
        <article className="feature-card">
          <span>01</span>
          <h3><Users size={18} className="lucide-icon inline-icon" /> Creadores</h3>
          <p>Sube tu foto de perfil, personaliza tu banner, define tu meta de apoyo y comparte tus ideas.</p>
        </article>
        <article className="feature-card">
          <span>02</span>
          <h3><Shield size={18} className="lucide-icon inline-icon" /> Contenido</h3>
          <p>Publica posts interactivos con texto e imágenes que solo tus donadores podrán ver.</p>
        </article>
        <article className="feature-card">
          <span>03</span>
          <h3><MessageSquare size={18} className="lucide-icon inline-icon" /> Apoyo Directo</h3>
          <p>Deja comentarios privados en sus posts que solo los creadores pueden leer en su panel.</p>
        </article>
      </div>
    </section>
  );
}
