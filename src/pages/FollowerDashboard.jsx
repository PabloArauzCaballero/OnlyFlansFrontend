import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorMessage, LoadingCard, StatCard, SuccessMessage } from "../components/Status.jsx";
import { onlyflansApi } from "../services/onlyflansApi.js";
import { useAuth } from "../state/AuthContext.jsx";

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
          <p className="muted">Feed desbloqueado por apoyos, favoritos, seguidos e historial de donaciones.</p>
        </div>
        <Link className="button" to="/creators">Buscar creadores</Link>
      </div>

      <ErrorMessage message={error} />
      <SuccessMessage message={success} />

      <div className="stats-grid">
        <StatCard label="Apoyos realizados" value={totals.donationCount} helper={`${totals.totalFlans} flanes`} />
        <StatCard label="Total simulado" value={`Bs. ${totals.totalBs}`} helper="Desde /api/apoyos" />
        <StatCard label="Creadores seguidos" value={follows.length} helper="Desde /api/usuarios/creadores-seguidos" />
      </div>

      <section>
        <div className="section-header compact-header"><h2>Feed desbloqueado</h2></div>
        {feed.length === 0 && <EmptyState title="Feed vacío">Apoya a un creador para desbloquear sus publicaciones activas.</EmptyState>}
        <div className="post-list">
          {feed.map((post) => (
            <article className="post card" key={`${post.creatorId}-${post.postId}`}>
              <div className="post-header"><strong>{post.creatorName}</strong><time>{post.createdAt ? new Date(post.createdAt).toLocaleString() : "Sin fecha"}</time></div>
              {post.text && <p>{post.text}</p>}
              {post.images?.length > 0 && (
                <div className="image-grid">
                  {post.images.map((image) => <img className="post-image" src={image.imageUrl} alt="Publicación" key={image.imageId} loading="lazy" />)}
                </div>
              )}
              <Link to={`/creators/${post.creatorId}`}>Ir al perfil</Link>
            </article>
          ))}
        </div>
      </section>

      <div className="two-column">
        <section className="card spaced-section">
          <h2>Favoritos</h2>
          {favorites.length === 0 && <EmptyState title="Sin favoritos">Marca creadores como favoritos para encontrarlos rápido.</EmptyState>}
          <div className="mini-list">
            {favorites.map((creator) => (
              <div className="list-row" key={creator.creatorId}>
                <div><strong>{creator.publicName}</strong><p>{creator.bio || "Sin biografía."}</p></div>
                <div className="actions"><Link className="button small" to={`/creators/${creator.creatorId}`}>Ver</Link><button className="button danger small" onClick={() => removeFavorite(creator)} disabled={actionLoading}>Quitar</button></div>
              </div>
            ))}
          </div>
        </section>

        <section className="card spaced-section">
          <h2>Seguidos</h2>
          {follows.length === 0 && <EmptyState title="Sin seguidos">Sigue creadores para tenerlos en tu panel.</EmptyState>}
          <div className="mini-list">
            {follows.map((creator) => (
              <div className="list-row" key={creator.creatorId}>
                <div><strong>{creator.publicName}</strong><p>{creator.bio || "Sin biografía."}</p></div>
                <div className="actions"><Link className="button small" to={`/creators/${creator.creatorId}`}>Ver</Link><button className="button danger small" onClick={() => removeFollow(creator)} disabled={actionLoading}>Quitar</button></div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card spaced-section">
        <h2>Historial de apoyos</h2>
        <div className="inline-form wrap">
          <label>Inicio<input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} /></label>
          <label>Fin<input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} /></label>
          <label>Creador<input value={filters.creatorName} onChange={(e) => setFilters({ ...filters, creatorName: e.target.value })} placeholder="Nombre público" /></label>
        </div>
        <div className="report-summary"><strong>{history.meta.totalFlans} flanes</strong><span>Bs. {history.meta.totalBs}</span><span>{history.meta.donationCount} apoyos</span></div>
        <div className="mini-list">
          {history.data.map((donation) => <p key={donation.donationId} className="list-row">{donation.creatorName}: {donation.flanQuantity} flanes — Bs. {donation.amountBs}</p>)}
          {history.data.length === 0 && <p className="muted">No hay apoyos con esos filtros.</p>}
        </div>
      </section>
    </section>
  );
}
