import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Heart, Lock, Star, Target, DollarSign } from "lucide-react";
import { EmptyState, ErrorMessage, LoadingCard, SuccessMessage } from "../components/Status.jsx";
import { onlyflansApi, ROLES } from "../services/onlyflansApi.js";
import { useAuth } from "../state/AuthContext.jsx";

export default function CreatorPublicProfile() {
  const { creatorId } = useParams();
  const { user, isAuthenticated } = useAuth();
  const [creator, setCreator] = useState(null);
  const [posts, setPosts] = useState([]);
  const [favorite, setFavorite] = useState(null);
  const [follow, setFollow] = useState(null);
  const [donations, setDonations] = useState([]);
  const [allCreatorDonations, setAllCreatorDonations] = useState([]);
  const [flans, setFlans] = useState(1);
  const [message, setMessage] = useState("");
  const [comments, setComments] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const canInteract = user?.role === ROLES.FOLLOWER;
  const hasDonated = donations.length > 0;
  const canSeePosts = canInteract && hasDonated;
  const totalSupport = useMemo(() => onlyflansApi.donations.summarize(donations), [donations]);
  const allCreatorSummary = useMemo(() => onlyflansApi.donations.summarize(allCreatorDonations), [allCreatorDonations]);

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const profile = await onlyflansApi.creators.getProfile(creatorId);
      setCreator(profile);

      const allDonations = await onlyflansApi.donations.list({ id_creador: creatorId, estado_pago: "SIMULADO_APROBADO", limit: 100 });
      setAllCreatorDonations(allDonations);

      if (user?.id && canInteract) {
        const [favorites, follows, supportList] = await Promise.all([
          onlyflansApi.favorites.list({ id_seguidor: user.id, id_creador: creatorId, limit: 1 }),
          onlyflansApi.follows.list({ id_seguidor: user.id, id_creador: creatorId, limit: 1 }),
          onlyflansApi.donations.list({ id_seguidor: user.id, id_creador: creatorId, estado_pago: "SIMULADO_APROBADO", limit: 100 }),
        ]);

        setFavorite(favorites[0] || null);
        setFollow(follows[0] || null);
        setDonations(supportList);
        setPosts(supportList.length > 0 ? await onlyflansApi.creators.listPosts(creatorId, false) : []);
      } else {
        setFavorite(null);
        setFollow(null);
        setDonations([]);
        setPosts([]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    load(); 
  }, [creatorId, user?.id, user?.role]);

  const runAction = async (fn, messageText) => {
    setError("");
    setSuccess("");
    setActionLoading(true);

    try {
      await fn();
      setSuccess(messageText);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleFavorite = () => runAction(async () => {
    if (favorite){ 
      await onlyflansApi.favorites.deactivate(favorite);
    }else {
      await onlyflansApi.favorites.add({ followerId: user.id, creatorId });
    }
  }, favorite ? "Creador quitado de favoritos." : "Creador agregado a favoritos.");

  const toggleFollow = () => runAction(async () => {
    if (follow) await onlyflansApi.follows.deactivate(follow);
    else await onlyflansApi.follows.add({ followerId: user.id, creatorId });
  }, follow ? "Dejaste de seguir a este creador." : "Ahora sigues a este creador.");

  const donate = (event) => {
    event.preventDefault();
    runAction(async () => {
      await onlyflansApi.donations.create({ followerId: user.id, creatorId, quantity: flans, message });
      setMessage("");
    }, "Apoyo registrado. Ya puedes ver las publicaciones del creador.");
  };

  const comment = (postId) => {
    const content = comments[postId] || "";
    if (!content.trim()) {
      setError("Escribe un comentario antes de enviarlo.");
      return;
    }

    runAction(async () => {
      await onlyflansApi.posts.comment({ postId, followerId: user.id, content });
      setComments((current) => ({ ...current, [postId]: "" }));
    }, "Comentario enviado correctamente.");
  };

  if (loading) return <LoadingCard>Cargando perfil del creador...</LoadingCard>;
  if (!creator) return <section><ErrorMessage message={error || "No se pudo cargar el creador."} /></section>;

  return (
    <section>
      <ErrorMessage message={error} />
      <SuccessMessage message={success} />

      <article className="profile card">
        <div className="profile-banner fallback-gradient">
          {creator.bannerImageUrl && <img src={creator.bannerImageUrl} alt={`Banner de ${creator.publicName}`} />}
        </div>
        <div className="profile-content">
          {creator.profileImageUrl ? (
            <img className="avatar large" src={creator.profileImageUrl} alt={creator.publicName} />
          ) : (
            <span className="avatar large initials">{creator.publicName.slice(0, 2).toUpperCase()}</span>
          )}
          <p className="eyebrow">Perfil público</p>
          <h1>{creator.publicName}</h1>
          <p>{creator.bio || "Este creador todavía no agregó una biografía."}</p>

          {creator.goal ? (
            <div className="goal-box" style={{ borderLeft: "4px solid var(--brand)", padding: "1.25rem" }}>
              <div className="eyebrow" style={{ marginBottom: "0.25rem", color: "var(--brand-dark)" }}><Target size={14} className="lucide-icon inline-icon" /> Meta de Apoyo</div>
              <strong style={{ fontSize: "1.1rem", color: "var(--text)" }}>{creator.goal.title}</strong>
              <p style={{ margin: "0.5rem 0 0", color: "var(--text-soft)", fontSize: "0.95rem" }}>{creator.goal.description}</p>
              <div style={{ marginTop: "0.75rem", fontSize: "0.9rem", color: "var(--muted-strong)", display: "flex", alignItems: "center" }}>
                <Heart size={14} className="lucide-icon inline-icon" style={{ fill: 'var(--brand)', color: 'var(--brand)' }} />
                <span>Apoyos recibidos: <strong>{allCreatorSummary.totalFlans} {allCreatorSummary.totalFlans === 1 ? 'flan' : 'flanes'}</strong></span>
              </div>
            </div>
          ) : <p className="muted">Este creador todavía no definió una meta de apoyo.</p>}

          <div className="badge-row">
            {favorite && <span className="badge">Favorito</span>}
            {follow && <span className="badge">Siguiendo</span>}
            {hasDonated && <span className="badge success">Publicaciones desbloqueadas</span>}
          </div>
        </div>
      </article>

      {canInteract ? (
        <div className="two-column">
          <form className="card form-grid" onSubmit={donate}>
            <h2>Apoyar con flanes <Heart size={22} className="lucide-icon" style={{ fill: 'var(--brand)', color: 'var(--brand)' }} /></h2>
            <div className="support-preview">
              <strong>{flans || 0}</strong>
              <span>{Number(flans) === 1 ? "flan seleccionado" : "flanes seleccionados"} — Bs. {(Number(flans) * 10).toFixed(2)}</span>
            </div>

            <label>Selección rápida</label>
            <div className="flan-presets">
              {[1, 3, 5, 10].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`flan-preset-btn ${Number(flans) === preset ? "active" : ""}`}
                  onClick={() => setFlans(preset)}
                >
                  <Heart size={20} className="lucide-icon" style={{ marginBottom: "0.25rem", fill: Number(flans) === preset ? "var(--brand)" : "none", color: "var(--brand)" }} />
                  <span className="flan-preset-label">+{preset} {preset === 1 ? "Flan" : "Flanes"}</span>
                  <span className="flan-preset-cost">Bs. {preset * 10}</span>
                </button>
              ))}
            </div>

            <label>Cantidad personalizada
              <input type="number" min="1" value={flans} onChange={(e) => setFlans(Math.max(1, parseInt(e.target.value) || 1))} required />
            </label>
            <label>Mensaje opcional (visible para el creador)
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Escribe un mensaje de aliento para el creador..." />
            </label>
            <button className="button" disabled={actionLoading}>{actionLoading ? "Procesando..." : "Registrar apoyo simbólico"}</button>
          </form>

          <div className="card form-grid">
            <h2>Relación con el creador</h2>
            <div className="actions">
              <button className="button secondary" onClick={toggleFavorite} disabled={actionLoading}>{favorite ? "Quitar favorito" : "Agregar favorito"}</button>
              <button className="button secondary" onClick={toggleFollow} disabled={actionLoading}>{follow ? "Dejar de seguir" : "Seguir"}</button>
            </div>
            {hasDonated && <div className="mini-summary"><strong>{totalSupport.totalFlans}</strong><span>flanes apoyados · Bs. {totalSupport.totalBs}</span></div>}
          </div>
        </div>
      ) : !isAuthenticated ? (
        <div className="card action-card"><p>Inicia sesión como seguidor para apoyar, marcar favoritos, seguir y comentar.</p><Link className="button" to="/login">Entrar</Link></div>
      ) : null}

      <div className="section-header"><h2>Publicaciones</h2></div>
      {!canInteract && <EmptyState title="Contenido protegido">Las publicaciones se muestran a seguidores que registraron al menos un apoyo.</EmptyState>}
      {canInteract && !hasDonated && <EmptyState title="Apoyo requerido">Debes registrar al menos 1 flan para ver las publicaciones.</EmptyState>}
      {canSeePosts && posts.length === 0 && <EmptyState title="Sin publicaciones">Este creador todavía no publicó contenido activo.</EmptyState>}

      <div className="post-list">
        {posts.map((post) => (
          <article className="post card" key={post.postId}>
            <div className="post-header">
              <strong>Publicación</strong>
              <time>{post.createdAt ? new Date(post.createdAt).toLocaleString() : "Sin fecha"}</time>
            </div>
            {post.text && <p>{post.text}</p>}
            {post.images?.length > 0 && (
              <div className="image-grid">
                {post.images.map((image) => <img key={image.imageId} className="post-image" src={image.imageUrl} alt="Publicación" loading="lazy" />)}
              </div>
            )}
            <div className="comment-box">
              <div className="comment-info-note">
                <Lock size={14} className="lucide-icon inline-icon" />
                <span>Tu comentario es privado y solo visible para el creador.</span>
              </div>
              <textarea placeholder="Escribe un comentario privado para el creador..." value={comments[post.postId] || ""} onChange={(e) => setComments({ ...comments, [post.postId]: e.target.value })} />
              <button className="button small" onClick={() => comment(post.postId)} disabled={actionLoading}>
                {actionLoading ? "Enviando..." : "Enviar comentario privado"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
