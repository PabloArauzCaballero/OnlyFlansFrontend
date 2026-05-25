import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorMessage, LoadingCard, SuccessMessage } from "../components/Status.jsx";
import { onlyflansApi, ROLES } from "../services/onlyflansApi.js";
import { useAuth } from "../state/AuthContext.jsx";

function CreatorCard({ creator, canFollow, isAuthenticated, isFollowing, actionLoading, onFollow }) {
  const initials = creator.publicName.slice(0, 2).toUpperCase();

  return (
    <article className="creator-card card">
      <div className="creator-banner fallback-gradient">
        {creator.bannerImageUrl && <img src={creator.bannerImageUrl} alt={`Banner de ${creator.publicName}`} loading="lazy" />}
      </div>
      <div className="creator-card-content">
        <div className="avatar-wrap">
          {creator.profileImageUrl ? (
            <img className="avatar" src={creator.profileImageUrl} alt={creator.publicName} loading="lazy" />
          ) : (
            <span className="avatar initials">{initials}</span>
          )}
        </div>
        <div>
          <h3>{creator.publicName}</h3>
          <p>{creator.bio || "Este creador todavía no agregó una biografía."}</p>
        </div>
        <div className="creator-card-actions">
          <Link className="button small" to={`/creators/${creator.creatorId}`}>Ver perfil</Link>
          {canFollow ? (
            <button
              type="button"
              className="button secondary small"
              onClick={() => onFollow(creator)}
              disabled={actionLoading || isFollowing}
            >
              {actionLoading ? "Guardando..." : isFollowing ? "Siguiendo" : "Seguir"}
            </button>
          ) : !isAuthenticated ? (
            <Link className="button secondary small" to="/login">Seguir</Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function Creators() {
  const { user, isAuthenticated } = useAuth();
  const [search, setSearch] = useState("");
  const [creators, setCreators] = useState([]);
  const [followByCreatorId, setFollowByCreatorId] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoadingByCreatorId, setActionLoadingByCreatorId] = useState({});

  const canFollow = user?.role === ROLES.FOLLOWER;

  const load = async (nextSearch = search) => {
    setLoading(true);
    setError("");
    try {
      const [creatorList, followList] = await Promise.all([
        onlyflansApi.creators.list({ search: nextSearch }),
        canFollow && user?.id
          ? onlyflansApi.follows.list({ id_seguidor: user.id, limit: 100 })
          : Promise.resolve([]),
      ]);

      const nextFollowByCreatorId = followList.reduce((acc, follow) => {
        if (follow.creatorId) acc[String(follow.creatorId)] = follow;
        return acc;
      }, {});

      setCreators(creatorList);
      setFollowByCreatorId(nextFollowByCreatorId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(""); }, [user?.id, user?.role]);

  const submit = (event) => {
    event.preventDefault();
    setSuccess("");
    load(search);
  };

  const followCreator = async (creator) => {
    const creatorId = creator.creatorId;

    if (!user?.id) {
      setError("Inicia sesión como seguidor para seguir creadores.");
      return;
    }

    setError("");
    setSuccess("");
    setActionLoadingByCreatorId((current) => ({ ...current, [creatorId]: true }));

    try {
      const follow = await onlyflansApi.follows.add({ followerId: user.id, creatorId });
      setFollowByCreatorId((current) => ({ ...current, [String(creatorId)]: follow }));
      setSuccess(`Ahora sigues a ${creator.publicName}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoadingByCreatorId((current) => ({ ...current, [creatorId]: false }));
    }
  };

  return (
    <section>
      <div className="section-header">
        <div>
          <p className="eyebrow">Explorar</p>
          <h1>Creadores</h1>
        </div>
        <form className="search-box" onSubmit={submit}>
          <input placeholder="Buscar por nombre o biografía" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="button small">Buscar</button>
        </form>
      </div>

      <ErrorMessage message={error} />
      <SuccessMessage message={success} />
      {loading ? <LoadingCard>Cargando creadores...</LoadingCard> : null}
      {!loading && creators.length === 0 && <EmptyState title="No hay creadores activos">Prueba con otra búsqueda</EmptyState>}
      <div className="grid cards-grid">
        {creators.map((creator) => {
          const follow = followByCreatorId[String(creator.creatorId)];

          return (
            <CreatorCard
              key={creator.creatorId}
              creator={creator}
              canFollow={canFollow}
              isAuthenticated={isAuthenticated}
              isFollowing={Boolean(follow)}
              actionLoading={Boolean(actionLoadingByCreatorId[creator.creatorId])}
              onFollow={followCreator}
            />
          );
        })}
      </div>
    </section>
  );
}
