import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorMessage, SuccessMessage } from "../components/Status.jsx";
import { onlyflansApi } from "../services/onlyflansApi.js";
import { useAuth } from "../state/AuthContext.jsx";

function today() { return new Date().toISOString().slice(0, 10); }

function filterByDate(dateValue, startDate, endDate) {
  if (!dateValue) return true;
  const date = new Date(dateValue).toISOString().slice(0, 10);
  if (startDate && date < startDate) return false;
  if (endDate && date > endDate) return false;
  return true;
}

export default function FollowerDashboard() {
  const { user } = useAuth();
  const [feed, setFeed] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [donations, setDonations] = useState([]);
  const [filters, setFilters] = useState({ startDate: "", endDate: today(), creatorName: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

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
      const [rawFavorites, rawDonations] = await Promise.all([
        onlyflansApi.favorites.list({ id_seguidor: user.id }),
        onlyflansApi.donations.list({ id_seguidor: user.id, estado_pago: "SIMULADO_APROBADO" }),
      ]);

      const favoriteCards = await Promise.all(rawFavorites.map(async (favorite) => {
        try {
          const creator = await onlyflansApi.creators.getProfile(favorite.creatorId);
          return { ...creator, favoriteId: favorite.favoriteId };
        } catch {
          return null;
        }
      }));

      const uniqueCreatorIds = [...new Set(rawDonations.map((donation) => donation.creatorId).filter(Boolean))];
      const creatorMap = new Map();
      const feedItems = [];

      for (const creatorId of uniqueCreatorIds) {
        try {
          const creator = await onlyflansApi.creators.getProfile(creatorId);
          creatorMap.set(Number(creatorId), creator);
          const posts = await onlyflansApi.creators.listPosts(creatorId, false);
          feedItems.push(...posts.map((post) => ({ ...post, creatorName: creator.publicName })));
        } catch {
          // Si un creador fue desactivado, el feed simplemente omite sus datos.
        }
      }

      const donationsWithCreatorName = rawDonations.map((donation) => ({
        ...donation,
        creatorName: creatorMap.get(Number(donation.creatorId))?.publicName || `Creador #${donation.creatorId}`,
      }));

      setFavorites(favoriteCards.filter(Boolean));
      setDonations(donationsWithCreatorName);
      setFeed(feedItems.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user.id]);

  const removeFavorite = async (creator) => {
    setError(""); setSuccess("");
    try {
      await onlyflansApi.favorites.deactivate({ favoriteId: creator.favoriteId });
      setSuccess("Favorito desactivado correctamente.");
      await load();
    } catch (err) { setError(err.message); }
  };

  return (
    <section>
      <div className="section-header">
        <div>
          <p className="eyebrow">Seguidor</p>
          <h1>Panel de seguidor</h1>
          <p className="muted">Consulta el feed desbloqueado, favoritos e historial de apoyos.</p>
        </div>
        <Link className="button" to="/creators">Buscar creadores</Link>
      </div>

      <ErrorMessage message={error} />
      <SuccessMessage message={success} />
      {loading && <p className="loading">Cargando información...</p>}

      <section>
        <h2>Feed desbloqueado</h2>
        {!loading && feed.length === 0 && <EmptyState>Tu feed está vacío. Apoya a un creador para desbloquear sus publicaciones.</EmptyState>}
        <div className="post-list">
          {feed.map((post) => (
            <article className="post card" key={`${post.creatorId}-${post.postId}`}>
              <div className="post-header"><strong>{post.creatorName}</strong><time>{post.createdAt ? new Date(post.createdAt).toLocaleString() : "Sin fecha"}</time></div>
              <p>{post.text}</p>
              {post.imageUrl && <img className="post-image" src={post.imageUrl} alt="Publicación" />}
              <Link to={`/creators/${post.creatorId}`}>Ir al perfil</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="card spaced-section">
        <h2>Favoritos</h2>
        {!loading && favorites.length === 0 && <EmptyState>No tienes favoritos.</EmptyState>}
        <div className="mini-list">
          {favorites.map((creator) => (
            <div className="list-row" key={creator.creatorId}>
              <div><strong>{creator.publicName}</strong><p>{creator.bio || "Sin biografía."}</p></div>
              <div className="actions"><Link className="button small" to={`/creators/${creator.creatorId}`}>Ver</Link><button className="button danger small" onClick={() => removeFavorite(creator)}>Quitar</button></div>
            </div>
          ))}
        </div>
      </section>

      <section className="card spaced-section">
        <h2>Historial de apoyos</h2>
        <div className="inline-form wrap">
          <label>Inicio<input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} /></label>
          <label>Fin<input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} /></label>
          <label>Creador<input value={filters.creatorName} onChange={(e) => setFilters({ ...filters, creatorName: e.target.value })} placeholder="Nombre público" /></label>
        </div>
        <div className="report-summary"><strong>{history.meta.totalFlans} flanes</strong><span>Bs. {history.meta.totalBs}</span><span>{history.meta.donationCount} apoyos</span></div>
        {history.data.map((donation) => <p key={donation.donationId} className="list-row">{donation.creatorName}: {donation.flanQuantity} flanes — Bs. {donation.amountBs}</p>)}
      </section>
    </section>
  );
}
