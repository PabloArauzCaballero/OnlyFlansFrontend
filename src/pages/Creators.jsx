import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorMessage } from "../components/Status.jsx";
import { onlyflansApi } from "../services/onlyflansApi.js";

function CreatorCard({ creator }) {
  return (
    <article className="creator-card card">
      <div className="creator-banner fallback-gradient">
        {creator.bannerImageUrl && <img src={creator.bannerImageUrl} alt="Banner del creador" />}
      </div>
      <div className="creator-card-content">
        <div className="avatar-wrap">
          {creator.profileImageUrl ? <img className="avatar" src={creator.profileImageUrl} alt={creator.publicName} /> : <span className="avatar initials">{creator.publicName.slice(0, 2).toUpperCase()}</span>}
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
  const [publicName, setPublicName] = useState("");
  const [creators, setCreators] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setCreators(await onlyflansApi.creators.list({ publicName }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = (event) => {
    event.preventDefault();
    load();
  };

  return (
    <section>
      <div className="section-header">
        <div>
          <p className="eyebrow">Explorar</p>
          <h1>Creadores</h1>
          <p className="muted">Listado consumido desde <code>/api/usuarios/perfiles-creadores</code>.</p>
        </div>
        <form className="search-box" onSubmit={submit}>
          <input placeholder="Buscar por nombre público" value={publicName} onChange={(e) => setPublicName(e.target.value)} />
          <button className="button small">Buscar</button>
        </form>
      </div>

      <ErrorMessage message={error} />
      {loading && <p className="loading">Cargando creadores...</p>}
      {!loading && creators.length === 0 && <EmptyState>No hay creadores para mostrar.</EmptyState>}
      <div className="grid cards-grid">
        {creators.map((creator) => <CreatorCard key={creator.creatorId} creator={creator} />)}
      </div>
    </section>
  );
}
