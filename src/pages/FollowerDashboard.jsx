import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorMessage, LoadingCard, StatCard, SuccessMessage } from "../components/Status.jsx";
import { onlyflansApi } from "../services/onlyflansApi.js";
import { useAuth } from "../state/AuthContext.jsx";
import { Heart, Star, Users, Calendar, BarChart, User, Rss, History, ArrowRight, Search } from "lucide-react";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function filterByDate(dateValue, startDate, endDate) {
  if (!dateValue) return true;
  const date = new Date(dateValue).toISOString().slice(0, 10);
  if (startDate && date < startDate) return false;
  if (endDate && date > endDate) return false;
  return true;
}

async function safeCreatorProfile(creatorId) {
  try {
    return await onlyflansApi.creators.getProfile(creatorId);
  } catch {
    return null;
  }
}

export default function FollowerDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("feed");
  const [feed, setFeed] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [follows, setFollows] = useState([]);
  const [donations, setDonations] = useState([]);
  const [filters, setFilters] = useState({ startDate: "", endDate: today(), creatorName: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const history = useMemo(() => {
    const filtered = donations.filter((donation) => {
      const dateOk = filterByDate(donation.createdAt, filters.startDate, filters.endDate);
      const nameOk = !filters.creatorName || donation.creatorName?.toLowerCase().includes(filters.creatorName.toLowerCase());
      return dateOk && nameOk;
    });

    return { data: filtered, meta: onlyflansApi.donations.summarize(filtered) };
  }, [donations, filters]);

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const [rawFavorites, rawFollows, rawDonations] = await Promise.all([
        onlyflansApi.favorites.list({ id_seguidor: user.id, limit: 100 }),
        onlyflansApi.follows.list({ id_seguidor: user.id, limit: 100 }),
        onlyflansApi.donations.list({ id_seguidor: user.id, estado_pago: "SIMULADO_APROBADO", limit: 100 }),
      ]);

      const creatorIds = [...new Set([
        ...rawFavorites.map((item) => item.creatorId),
        ...rawFollows.map((item) => item.creatorId),
        ...rawDonations.map((item) => item.creatorId),
      ].filter(Boolean).map(String))];

      const creatorPairs = await Promise.all(creatorIds.map(async (creatorId) => [creatorId, await safeCreatorProfile(creatorId)]));
      const creatorMap = new Map(creatorPairs.filter(([, creator]) => creator).map(([id, creator]) => [String(id), creator]));

      const favoriteCards = rawFavorites
        .map((favorite) => {
          const creator = creatorMap.get(String(favorite.creatorId));
          return creator ? { ...creator, favoriteId: favorite.favoriteId } : null;
        })
        .filter(Boolean);

      const followCards = rawFollows
        .map((follow) => {
          const creator = creatorMap.get(String(follow.creatorId));
          return creator ? { ...creator, followId: follow.followId } : null;
        })
        .filter(Boolean);

      const feedItems = [];
      const uniqueDonationCreatorIds = [...new Set(rawDonations.map((donation) => donation.creatorId).filter(Boolean).map(String))];

      for (const creatorId of uniqueDonationCreatorIds) {
        const creator = creatorMap.get(String(creatorId));
        if (!creator) continue;
        const posts = await onlyflansApi.creators.listPosts(creatorId, false);
        feedItems.push(...posts.map((post) => ({ ...post, creatorName: creator.publicName })));
      }

      const donationsWithCreatorName = rawDonations.map((donation) => ({
        ...donation,
        creatorName: creatorMap.get(String(donation.creatorId))?.publicName || `Creador #${donation.creatorId}`,
      }));

      setFavorites(favoriteCards);
      setFollows(followCards);
      setDonations(donationsWithCreatorName);
      setFeed(feedItems.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user.id]);

  const run = async (fn, message) => {
    setError("");
    setSuccess("");
    setActionLoading(true);

    try {
      await fn();
      setSuccess(message);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const removeFavorite = (creator) => run(
    () => onlyflansApi.favorites.deactivate({ favoriteId: creator.favoriteId }),
    "Favorito desactivado correctamente."
  );

  const removeFollow = (creator) => run(
    () => onlyflansApi.follows.deactivate({ followId: creator.followId }),
    "Creador quitado de seguidos correctamente."
  );

  const totals = onlyflansApi.donations.summarize(donations);

  if (loading) return <LoadingCard>Cargando panel de seguidor...</LoadingCard>;

  return (
    <section>
      <div className="section-header">
        <div>
          <p className="eyebrow">Seguidor</p>
          <h1>Panel de seguidor</h1>
          <p className="muted">Tu feed exclusivo, creadores favoritos e historial de apoyos.</p>
        </div>
        <Link className="button" to="/creators">Buscar creadores</Link>
      </div>

      <ErrorMessage message={error} />
      <SuccessMessage message={success} />

      <div className="stats-grid" style={{ marginBottom: "2rem" }}>
        <StatCard label="Apoyos realizados" value={totals.donationCount} helper={`${totals.totalFlans} flanes`} />
        <StatCard label="Total invertido" value={`Bs. ${totals.totalBs}`} helper="Desde /api/apoyos" />
        <StatCard label="Creadores seguidos" value={follows.length} helper="Desde /api/usuarios/creadores-seguidos" />
      </div>

      {/* Tabs navigation */}
      <nav className="dashboard-tabs">
        <button className={`tab-btn ${activeTab === "feed" ? "active" : ""}`} onClick={() => setActiveTab("feed")}>
          <Rss size={16} className="lucide-icon inline-icon" /> Mi Feed Exclusivo
        </button>
        <button className={`tab-btn ${activeTab === "creators" ? "active" : ""}`} onClick={() => setActiveTab("creators")}>
          <Users size={16} className="lucide-icon inline-icon" /> Creadores Apoyados
        </button>
        <button className={`tab-btn ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>
          <History size={16} className="lucide-icon inline-icon" /> Historial de Apoyos
        </button>
      </nav>

      {/* Tab: Feed */}
      {activeTab === "feed" && (
        <section>
          <div className="section-header compact-header" style={{ marginBottom: "1.25rem" }}>
            <div>
              <h2>Publicaciones exclusivas</h2>
              <p className="muted" style={{ margin: 0 }}>Contenido de los creadores que has apoyado.</p>
            </div>
          </div>
          {feed.length === 0 && (
            <EmptyState title="Feed vacío">
              Apoya a un creador con al menos 1 flan para desbloquear sus publicaciones activas.
            </EmptyState>
          )}
          <div className="post-list">
            {feed.map((post) => (
              <article className="post card" key={`${post.creatorId}-${post.postId}`} style={{ background: "rgba(255, 255, 255, 0.4)" }}>
                <div className="post-header">
                  <div>
                    <strong style={{ fontSize: "1.05rem", color: "var(--brand-dark)" }}>{post.creatorName}</strong>
                    <time style={{ display: "block", fontSize: "0.8rem", marginTop: "0.15rem" }}>
                      {post.createdAt ? new Date(post.createdAt).toLocaleString() : "Sin fecha"}
                    </time>
                  </div>
                  <Link className="button secondary small" to={`/creators/${post.creatorId}`}>
                    Ver perfil <ArrowRight size={14} className="lucide-icon btn-icon" style={{ marginLeft: "0.25rem", marginRight: 0 }} />
                  </Link>
                </div>
                {post.text && <p style={{ fontSize: "0.98rem", lineHeight: "1.55" }}>{post.text}</p>}
                {post.images?.length > 0 && (
                  <div className="image-grid">
                    {post.images.map((image) => (
                      <img className="post-image" src={image.imageUrl} alt="Publicación" key={image.imageId} loading="lazy" />
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Tab: Creators */}
      {activeTab === "creators" && (
        <div className="two-column" style={{ alignItems: "start" }}>
          <section className="card spaced-section" style={{ marginTop: 0 }}>
            <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Star size={20} className="lucide-icon" style={{ fill: 'var(--brand)', color: 'var(--brand)' }} /> Favoritos
            </h2>
            <p className="muted" style={{ marginBottom: "1.25rem" }}>Creadores destacados para un acceso rápido.</p>
            {favorites.length === 0 && <EmptyState title="Sin favoritos">Marca creadores como favoritos desde su perfil.</EmptyState>}
            <div className="mini-list">
              {favorites.map((creator) => (
                <div className="list-row" key={creator.creatorId}>
                  <div className="list-row-avatar-container">
                    {creator.profileImageUrl ? (
                      <img className="mini-creator-avatar" src={creator.profileImageUrl} alt={creator.publicName} />
                    ) : (
                      <span className="mini-creator-avatar" style={{ display: 'inline-grid', placeItems: 'center', background: 'var(--brand-soft)', color: 'var(--brand-dark)', fontWeight: 'bold', fontSize: '0.75rem' }}>
                        {creator.publicName.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <div>
                      <strong>{creator.publicName}</strong>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {creator.bio || "Sin biografía."}
                      </p>
                    </div>
                  </div>
                  <div className="actions">
                    <Link className="button small" to={`/creators/${creator.creatorId}`}>Ver</Link>
                    <button className="button danger small" onClick={() => removeFavorite(creator)} disabled={actionLoading}>Quitar</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card spaced-section" style={{ marginTop: 0 }}>
            <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Users size={20} className="lucide-icon" /> Siguiendo
            </h2>
            <p className="muted" style={{ marginBottom: "1.25rem" }}>Creadores a los que sigues activamente.</p>
            {follows.length === 0 && <EmptyState title="Sin seguidos">Sigue creadores para enterarte de sus novedades.</EmptyState>}
            <div className="mini-list">
              {follows.map((creator) => (
                <div className="list-row" key={creator.creatorId}>
                  <div className="list-row-avatar-container">
                    {creator.profileImageUrl ? (
                      <img className="mini-creator-avatar" src={creator.profileImageUrl} alt={creator.publicName} />
                    ) : (
                      <span className="mini-creator-avatar" style={{ display: 'inline-grid', placeItems: 'center', background: 'var(--brand-soft)', color: 'var(--brand-dark)', fontWeight: 'bold', fontSize: '0.75rem' }}>
                        {creator.publicName.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <div>
                      <strong>{creator.publicName}</strong>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {creator.bio || "Sin biografía."}
                      </p>
                    </div>
                  </div>
                  <div className="actions">
                    <Link className="button small" to={`/creators/${creator.creatorId}`}>Ver</Link>
                    <button className="button danger small" onClick={() => removeFollow(creator)} disabled={actionLoading}>Quitar</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Tab: History */}
      {activeTab === "history" && (
        <section className="card spaced-section" style={{ marginTop: 0 }}>
          <h2>Historial de apoyos <BarChart size={20} className="lucide-icon inline-icon" /></h2>
          <p className="muted" style={{ marginBottom: "1.25rem" }}>Listado completo de tus transacciones y flanes donados.</p>
          
          <div className="inline-form wrap" style={{ marginBottom: "1.5rem" }}>
            <label>Desde<input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} /></label>
            <label>Hasta<input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} /></label>
            <label>Buscar Creador
              <div style={{ position: 'relative', width: '100%' }}>
                <input value={filters.creatorName} onChange={(e) => setFilters({ ...filters, creatorName: e.target.value })} placeholder="Nombre público..." style={{ paddingLeft: '2.5rem' }} />
                <Search size={14} className="lucide-icon" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              </div>
            </label>
          </div>

          <div className="report-summary" style={{ background: "var(--brand-soft)", padding: "1rem", borderRadius: "16px", border: "1px solid rgba(184,95,45,0.12)", justifyContent: "space-around", marginBottom: "1.5rem" }}>
            <div style={{ textAlign: "center" }}><small style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem", marginBottom: "0.2rem" }}>Total Flanes Donados</small><strong style={{ fontSize: "1.35rem", color: "var(--brand)" }}>{history.meta.totalFlans} <Heart size={14} className="lucide-icon inline-icon" style={{ fill: 'var(--brand)', color: 'var(--brand)' }} /></strong></div>
            <div style={{ textAlign: "center" }}><small style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem", marginBottom: "0.2rem" }}>Total Invertido</small><strong style={{ fontSize: "1.35rem", color: "var(--success)" }}>Bs. {history.meta.totalBs}</strong></div>
            <div style={{ textAlign: "center" }}><small style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem", marginBottom: "0.2rem" }}>Apoyos Realizados</small><strong style={{ fontSize: "1.35rem", color: "var(--text)" }}>{history.meta.donationCount}</strong></div>
          </div>

          <div className="table-responsive">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Creador apoyado</th>
                  <th>Fecha de registro</th>
                  <th>Flanes</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                {history.data.map((donation) => (
                  <tr key={donation.donationId}>
                    <td><strong><User size={14} className="lucide-icon inline-icon" /> {donation.creatorName}</strong></td>
                    <td><Calendar size={14} className="lucide-icon inline-icon" /> {donation.createdAt ? new Date(donation.createdAt).toLocaleDateString() : "Sin fecha"}</td>
                    <td>{donation.flanQuantity} <Heart size={14} className="lucide-icon inline-icon" style={{ fill: 'var(--brand)', color: 'var(--brand)' }} /></td>
                    <td><span className="badge-amount">Bs. {donation.amountBs}</span></td>
                  </tr>
                ))}
                {history.data.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center", color: "var(--muted)", padding: "1.5rem" }}>
                      No hay apoyos registrados con los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </section>
  );
}
