import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
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

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const profile = await onlyflansApi.creators.getProfile(creatorId);
      setCreator(profile);

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
            <div className="goal-box"><strong>{creator.goal.title}</strong><p>{creator.goal.description}</p></div>
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
            <h2>Apoyar con flanes</h2>
            <div className="support-preview"><strong>{flans || 0}</strong><span>flanes seleccionados</span></div>
            <label>Cantidad de flanes<input type="number" min="1" value={flans} onChange={(e) => setFlans(e.target.value)} required /></label>
            <label>Mensaje opcional<textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Escribe un mensaje para el creador" /></label>
            <button className="button" disabled={actionLoading}>{actionLoading ? "Procesando..." : "Registrar apoyo"}</button>
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
            <div className="post-header"><strong>Publicación</strong><time>{post.createdAt ? new Date(post.createdAt).toLocaleString() : "Sin fecha"}</time></div>
            {post.text && <p>{post.text}</p>}
            {post.images?.length > 0 && (
              <div className="image-grid">
                {post.images.map((image) => <img key={image.imageId} className="post-image" src={image.imageUrl} alt="Publicación" loading="lazy" />)}
              </div>
            )}
            <div className="comment-box">
              <textarea placeholder="Comenta esta publicación" value={comments[post.postId] || ""} onChange={(e) => setComments({ ...comments, [post.postId]: e.target.value })} />
              <button className="button small" onClick={() => comment(post.postId)} disabled={actionLoading}>Enviar comentario</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
