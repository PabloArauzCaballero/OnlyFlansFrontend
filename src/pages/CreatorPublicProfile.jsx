import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EmptyState, ErrorMessage, SuccessMessage } from "../components/Status.jsx";
import { onlyflansApi, ROLES } from "../services/onlyflansApi.js";
import { useAuth } from "../state/AuthContext.jsx";

export default function CreatorPublicProfile() {
  const { creatorId } = useParams();
  const { user, isAuthenticated } = useAuth();
  const [creator, setCreator] = useState(null);
  const [posts, setPosts] = useState([]);
  const [favorite, setFavorite] = useState(null);
  const [hasDonated, setHasDonated] = useState(false);
  const [flans, setFlans] = useState(1);
  const [message, setMessage] = useState("");
  const [comments, setComments] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const canInteract = user?.role === ROLES.FOLLOWER;
  const canSeePosts = canInteract && hasDonated;

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const profile = await onlyflansApi.creators.getProfile(creatorId);
      setCreator(profile);

      if (user?.id && canInteract) {
        const [favorites, donations] = await Promise.all([
          onlyflansApi.favorites.list({ id_seguidor: user.id, id_creador: creatorId }),
          onlyflansApi.donations.list({ id_seguidor: user.id, id_creador: creatorId, estado_pago: "SIMULADO_APROBADO" }),
        ]);
        setFavorite(favorites[0] || null);
        setHasDonated(donations.length > 0);
        setPosts(donations.length > 0 ? await onlyflansApi.creators.listPosts(creatorId, false) : []);
      } else {
        setFavorite(null);
        setHasDonated(false);
        setPosts([]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [creatorId, user?.id, user?.role]);

  const toggleFavorite = async () => {
    setError(""); setSuccess("");
    try {
      if (favorite) {
        await onlyflansApi.favorites.deactivate(favorite);
        setSuccess("Creador quitado de favoritos.");
      } else {
        await onlyflansApi.favorites.add({ followerId: user.id, creatorId });
        setSuccess("Creador agregado a favoritos.");
      }
      await load();
    } catch (err) { setError(err.message); }
  };

  const donate = async (event) => {
    event.preventDefault();
    setError(""); setSuccess("");
    try {
      await onlyflansApi.donations.create({ followerId: user.id, creatorId, quantity: flans, message });
      setMessage("");
      setSuccess("Apoyo registrado. Ya puedes ver las publicaciones disponibles del creador.");
      await load();
    } catch (err) { setError(err.message); }
  };

  const comment = async (postId) => {
    const content = comments[postId] || "";
    if (!content.trim()) return setError("Escribe un comentario antes de enviarlo.");
    setError(""); setSuccess("");
    try {
      await onlyflansApi.posts.comment({ postId, followerId: user.id, content });
      setComments({ ...comments, [postId]: "" });
      setSuccess("Comentario enviado correctamente.");
    } catch (err) { setError(err.message); }
  };

  if (loading) return <section className="card"><p>Cargando perfil...</p></section>;
  if (!creator) return <section><ErrorMessage message={error || "No se pudo cargar el creador."} /></section>;

  return (
    <section>
      <ErrorMessage message={error} />
      <SuccessMessage message={success} />

      <article className="profile card">
        <div className="profile-banner fallback-gradient">
          {creator.bannerImageUrl && <img src={creator.bannerImageUrl} alt="Banner" />}
        </div>
        <div className="profile-content">
          {creator.profileImageUrl ? <img className="avatar large" src={creator.profileImageUrl} alt={creator.publicName} /> : <span className="avatar large initials">{creator.publicName.slice(0, 2).toUpperCase()}</span>}
          <p className="eyebrow">Perfil público</p>
          <h1>{creator.publicName}</h1>
          <p>{creator.bio || "Este creador todavía no agregó una biografía."}</p>

          {creator.goal ? (
            <div className="goal-box"><strong>{creator.goal.title}</strong><p>{creator.goal.description}</p></div>
          ) : <p className="muted">Este creador todavía no definió una meta.</p>}

          <div className="badge-row">
            {favorite && <span className="badge">Favorito</span>}
            {hasDonated && <span className="badge success">Publicaciones desbloqueadas</span>}
          </div>
        </div>
      </article>

      {canInteract ? (
        <div className="two-column">
          <form className="card form-grid" onSubmit={donate}>
            <h2>Apoyar con flanes</h2>
            <p>Equivalente estimado: <strong>Bs. {Number(flans || 0) * 10}</strong></p>
            <label>Cantidad de flanes<input type="number" min="1" value={flans} onChange={(e) => setFlans(e.target.value)} /></label>
            <label>Mensaje opcional<textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={300} placeholder="Escribe un mensaje para el creador" /></label>
            <button className="button">Donar</button>
          </form>

          <div className="card form-grid">
            <h2>Favorito</h2>
            <p>Guardar como favorito ayuda a encontrar rápido a este creador. Para ver publicaciones, registra un apoyo.</p>
            <button className="button secondary" onClick={toggleFavorite}>{favorite ? "Quitar favorito" : "Agregar favorito"}</button>
          </div>
        </div>
      ) : !isAuthenticated ? (
        <div className="card action-card"><p>Inicia sesión como seguidor para donar, marcar favoritos y comentar.</p><Link className="button" to="/login">Entrar</Link></div>
      ) : null}

      <div className="section-header"><h2>Publicaciones</h2></div>
      {!canInteract && <EmptyState>Las publicaciones se muestran a seguidores que registraron al menos un apoyo.</EmptyState>}
      {canInteract && !hasDonated && <EmptyState>Debes donar al menos 1 flan para ver las publicaciones.</EmptyState>}
      {canSeePosts && posts.length === 0 && <EmptyState>No hay publicaciones todavía.</EmptyState>}

      <div className="post-list">
        {posts.map((post) => (
          <article className="post card" key={post.postId}>
            <p>{post.text}</p>
            {post.imageUrl && <img className="post-image" src={post.imageUrl} alt="Publicación" />}
            <time>{post.createdAt ? new Date(post.createdAt).toLocaleString() : "Sin fecha"}</time>
            <div className="comment-box">
              <textarea placeholder="Comenta esta publicación" value={comments[post.postId] || ""} onChange={(e) => setComments({ ...comments, [post.postId]: e.target.value })} maxLength={500} />
              <button className="button small" onClick={() => comment(post.postId)}>Enviar comentario</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
