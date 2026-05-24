import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorMessage, LoadingCard } from "../components/Status.jsx";
import { onlyflansApi } from "../services/onlyflansApi.js";

function CreatorCard({ creator }) {
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
        <Link className="button small" to={`/creators/${creator.creatorId}`}>Ver perfil</Link>
      </div>
    </article>
  );
}

export default function Creators() {
  const [search, setSearch] = useState("");
  const [creators, setCreators] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async (nextSearch = search) => {
    setLoading(true);
    setError("");
    try {
      setCreators(await onlyflansApi.creators.list({ search: nextSearch }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(""); }, []);

  const submit = (event) => {
    event.preventDefault();
    load(search);
  };

  return (
    <section>
      <div className="section-header">
        <div>
          <p className="eyebrow">Explorar</p>
          <h1>Creadores</h1>
          <p className="muted">Búsqueda por texto usando el query <code>search</code> del CRUD genérico del backend.</p>
        </div>
        <form className="search-box" onSubmit={submit}>
          <input placeholder="Buscar por nombre o biografía" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="button small">Buscar</button>
        </form>
      </div>

      <ErrorMessage message={error} />
      {loading ? <LoadingCard>Cargando creadores...</LoadingCard> : null}
      {!loading && creators.length === 0 && <EmptyState title="No hay creadores activos">Prueba con otra búsqueda o registra una cuenta de creador.</EmptyState>}
      <div className="grid cards-grid">
        {creators.map((creator) => <CreatorCard key={creator.creatorId} creator={creator} />)}
      </div>
    </section>
  );
}
