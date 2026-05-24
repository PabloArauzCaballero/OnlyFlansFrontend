import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorMessage, LoadingCard, StatCard, SuccessMessage } from "../components/Status.jsx";
import { onlyflansApi } from "../services/onlyflansApi.js";
import { useAuth } from "../state/AuthContext.jsx";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function isInsideDateRange(dateValue, startDate, endDate) {
  if (!dateValue) return true;
  const date = new Date(dateValue).toISOString().slice(0, 10);
  if (startDate && date < startDate) return false;
  if (endDate && date > endDate) return false;
  return true;
}

const initialPostForm = { text: "", imageUrls: "" };

export default function CreatorDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [donations, setDonations] = useState([]);
  const [profileForm, setProfileForm] = useState({ nombre_publico: "", biografia: "", foto_perfil_url: "", banner_url: "" });
  const [goalForm, setGoalForm] = useState({ title: "", description: "" });
  const [postForm, setPostForm] = useState(initialPostForm);
  const [reportDates, setReportDates] = useState({ startDate: "", endDate: today() });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const filteredDonations = useMemo(() => donations.filter((donation) => isInsideDateRange(donation.createdAt, reportDates.startDate, reportDates.endDate)), [donations, reportDates]);
  const report = useMemo(() => onlyflansApi.donations.summarize(filteredDonations), [filteredDonations]);
  const totalReport = useMemo(() => onlyflansApi.donations.summarize(donations), [donations]);

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const profileData = await onlyflansApi.creators.getProfile(user.id);
      const [postsData, donationsData] = await Promise.all([
        onlyflansApi.creators.listPosts(user.id, true),
        onlyflansApi.donations.list({ id_creador: user.id, estado_pago: "SIMULADO_APROBADO", limit: 100 }),
      ]);

      setProfile(profileData);
      setPosts(postsData);
      setDonations(donationsData);
      setProfileForm({
        nombre_publico: profileData.publicName || "",
        biografia: profileData.bio || "",
        foto_perfil_url: profileData.profileImageUrl || "",
        banner_url: profileData.bannerImageUrl || "",
      });
      setGoalForm({
        title: profileData.goal?.title || "",
        description: profileData.goal?.description || "",
      });
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

  const saveProfile = (event) => {
    event.preventDefault();
    run(() => onlyflansApi.creators.updateProfile(user.id, profileForm), "Perfil actualizado correctamente.");
  };

  const saveGoal = (event) => {
    event.preventDefault();
    run(() => onlyflansApi.goals.save(profile?.goal, user.id, goalForm), "Meta guardada correctamente.");
  };

  const deactivateGoal = () => run(() => onlyflansApi.goals.deactivate(profile?.goal), "Meta desactivada correctamente.");

  const createPost = (event) => {
    event.preventDefault();
    const imageUrls = postForm.imageUrls.split("\n").map((url) => url.trim()).filter(Boolean);

    run(async () => {
      await onlyflansApi.posts.create({ creatorId: user.id, text: postForm.text, imageUrls });
      setPostForm(initialPostForm);
    }, "Publicación creada correctamente.");
  };

  const deactivatePost = (post) => run(() => onlyflansApi.posts.deactivate(post), "Publicación desactivada correctamente.");

  if (loading) return <LoadingCard>Cargando panel de creador...</LoadingCard>;

  return (
    <section>
      <div className="section-header">
        <div>
          <p className="eyebrow">Creador</p>
          <h1>Panel de creador</h1>
          <p className="muted">Gestiona perfil, meta, publicaciones y reporte de apoyos usando únicamente rutas existentes del backend.</p>
        </div>
      </div>

      <ErrorMessage message={error} />
      <SuccessMessage message={success} />

      <div className="stats-grid">
        <StatCard label="Publicaciones activas" value={posts.length} helper="Desde /api/publicaciones" />
        <StatCard label="Apoyos recibidos" value={totalReport.donationCount} helper={`${totalReport.totalFlans} flanes`} />
        <StatCard label="Ingresos simulados" value={`Bs. ${totalReport.totalBs}`} helper="Estado SIMULADO_APROBADO" />
      </div>

      <div className="two-column">
        <form className="card form-grid" onSubmit={saveProfile}>
          <h2>Perfil público</h2>
          <label>Nombre público<input value={profileForm.nombre_publico} onChange={(e) => setProfileForm({ ...profileForm, nombre_publico: e.target.value })} maxLength={120} required /></label>
          <label>Biografía<textarea value={profileForm.biografia} onChange={(e) => setProfileForm({ ...profileForm, biografia: e.target.value })} /></label>
          <label>URL foto de perfil<input value={profileForm.foto_perfil_url} onChange={(e) => setProfileForm({ ...profileForm, foto_perfil_url: e.target.value })} placeholder="https://..." /></label>
          <label>URL banner<input value={profileForm.banner_url} onChange={(e) => setProfileForm({ ...profileForm, banner_url: e.target.value })} placeholder="https://..." /></label>
          <button className="button" disabled={actionLoading}>{actionLoading ? "Guardando..." : "Guardar perfil"}</button>
        </form>

        <form className="card form-grid" onSubmit={saveGoal}>
          <h2>Meta de apoyo</h2>
          <label>Título<input value={goalForm.title} onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })} maxLength={160} required /></label>
          <label>Descripción<textarea value={goalForm.description} onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })} required /></label>
          <div className="actions">
            <button className="button" disabled={actionLoading}>{profile?.goal ? "Actualizar meta" : "Crear meta"}</button>
            <button type="button" className="button danger" onClick={deactivateGoal} disabled={!profile?.goal || actionLoading}>Desactivar</button>
          </div>
        </form>
      </div>

      <div className="two-column">
        <form className="card form-grid" onSubmit={createPost}>
          <h2>Nueva publicación</h2>
          <label>Texto<textarea value={postForm.text} onChange={(e) => setPostForm({ ...postForm, text: e.target.value })} placeholder="Escribe contenido para tus seguidores" /></label>
          <label>URLs de imágenes, una por línea<textarea value={postForm.imageUrls} onChange={(e) => setPostForm({ ...postForm, imageUrls: e.target.value })} placeholder="https://imagen-1...\nhttps://imagen-2..." /></label>
          <button className="button" disabled={actionLoading || (!postForm.text.trim() && !postForm.imageUrls.trim())}>Publicar</button>
        </form>

        <section className="card form-grid">
          <h2>Reporte de ingresos</h2>
          <div className="inline-form wrap">
            <label>Inicio<input type="date" value={reportDates.startDate} onChange={(e) => setReportDates({ ...reportDates, startDate: e.target.value })} /></label>
            <label>Fin<input type="date" value={reportDates.endDate} onChange={(e) => setReportDates({ ...reportDates, endDate: e.target.value })} /></label>
          </div>
          <div className="report-summary">
            <strong>{report.totalFlans} flanes</strong>
            <span>Bs. {report.totalBs}</span>
            <span>{report.donationCount} apoyos</span>
          </div>
          <div className="mini-list scroll-list">
            {filteredDonations.map((donation) => <p key={donation.donationId} className="list-row">Seguidor #{donation.followerId} apoyó {donation.flanQuantity} flanes — Bs. {donation.amountBs}</p>)}
            {filteredDonations.length === 0 && <p className="muted">No hay apoyos en ese rango.</p>}
          </div>
        </section>
      </div>

      <section>
        <div className="section-header"><h2>Mis publicaciones y comentarios</h2></div>
        {posts.length === 0 && <EmptyState title="Sin publicaciones">Crea tu primera publicación para tus seguidores.</EmptyState>}
        <div className="post-list">
          {posts.map((post) => (
            <article className="post card" key={post.postId}>
              <div className="post-header">
                <time>{post.createdAt ? new Date(post.createdAt).toLocaleString() : "Sin fecha"}</time>
                <button className="button danger small" onClick={() => deactivatePost(post)} disabled={actionLoading}>Desactivar</button>
              </div>
              {post.text && <p>{post.text}</p>}
              {post.images?.length > 0 && (
                <div className="image-grid">
                  {post.images.map((image) => <img className="post-image" src={image.imageUrl} alt="Publicación" key={image.imageId} loading="lazy" />)}
                </div>
              )}
              <div className="comment-box">
                <h4>Comentarios recibidos</h4>
                {post.comments?.length ? post.comments.map((comment) => (
                  <p className="comment" key={comment.commentId}><strong>Seguidor #{comment.followerId}:</strong> {comment.content}</p>
                )) : <p className="muted">Sin comentarios.</p>}
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
