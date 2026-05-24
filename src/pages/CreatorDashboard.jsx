import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorMessage, SuccessMessage } from "../components/Status.jsx";
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

export default function CreatorDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [donations, setDonations] = useState([]);
  const [profileForm, setProfileForm] = useState({ nombre_publico: "", biografia: "", foto_perfil_url: "", banner_url: "" });
  const [goalForm, setGoalForm] = useState({ title: "", description: "" });
  const [postForm, setPostForm] = useState({ text: "", imageUrl: "" });
  const [reportDates, setReportDates] = useState({ startDate: today(), endDate: today() });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const filteredDonations = useMemo(() => donations.filter((donation) => isInsideDateRange(donation.createdAt, reportDates.startDate, reportDates.endDate)), [donations, reportDates]);
  const report = useMemo(() => onlyflansApi.donations.summarize(filteredDonations), [filteredDonations]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const profileData = await onlyflansApi.creators.getProfile(user.id);
      const [postsData, donationsData] = await Promise.all([
        onlyflansApi.creators.listPosts(user.id, true),
        onlyflansApi.donations.list({ id_creador: user.id, estado_pago: "SIMULADO_APROBADO" }),
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
    try {
      await fn();
      setSuccess(message);
      await load();
    } catch (err) {
      setError(err.message);
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
    run(async () => {
      await onlyflansApi.posts.create({ creatorId: user.id, text: postForm.text, imageUrl: postForm.imageUrl });
      setPostForm({ text: "", imageUrl: "" });
    }, "Publicación creada correctamente.");
  };

  const deactivatePost = (post) => run(() => onlyflansApi.posts.deactivate(post), "Publicación desactivada correctamente.");

  if (loading) return <section className="card"><p>Cargando panel de creador...</p></section>;

  return (
    <section>
      <div className="section-header">
        <div>
          <p className="eyebrow">Creador</p>
          <h1>Panel de creador</h1>
          <p className="muted">Gestiona perfil, meta, publicaciones y reporte de apoyos desde los módulos del backend.</p>
        </div>
      </div>

      <ErrorMessage message={error} />
      <SuccessMessage message={success} />

      <div className="two-column">
        <form className="card form-grid" onSubmit={saveProfile}>
          <h2>Perfil público</h2>
          <label>Nombre público<input value={profileForm.nombre_publico} onChange={(e) => setProfileForm({ ...profileForm, nombre_publico: e.target.value })} required /></label>
          <label>Biografía<textarea value={profileForm.biografia} onChange={(e) => setProfileForm({ ...profileForm, biografia: e.target.value })} maxLength={500} /></label>
          <label>URL foto de perfil<input value={profileForm.foto_perfil_url} onChange={(e) => setProfileForm({ ...profileForm, foto_perfil_url: e.target.value })} placeholder="https://..." /></label>
          <label>URL banner<input value={profileForm.banner_url} onChange={(e) => setProfileForm({ ...profileForm, banner_url: e.target.value })} placeholder="https://..." /></label>
          <button className="button">Guardar perfil</button>
        </form>

        <form className="card form-grid" onSubmit={saveGoal}>
          <h2>Meta de apoyo</h2>
          <label>Título<input value={goalForm.title} onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })} minLength={3} maxLength={160} required /></label>
          <label>Descripción<textarea value={goalForm.description} onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })} minLength={10} maxLength={500} required /></label>
          <div className="actions"><button className="button">Guardar meta</button><button type="button" className="button danger" onClick={deactivateGoal}>Desactivar meta</button></div>
        </form>
      </div>

      <div className="two-column">
        <form className="card form-grid" onSubmit={createPost}>
          <h2>Nueva publicación</h2>
          <label>Texto<textarea value={postForm.text} onChange={(e) => setPostForm({ ...postForm, text: e.target.value })} minLength={1} maxLength={2000} required /></label>
          <label>URL de imagen opcional<input value={postForm.imageUrl} onChange={(e) => setPostForm({ ...postForm, imageUrl: e.target.value })} placeholder="https://..." /></label>
          <button className="button">Publicar</button>
        </form>

        <section className="card">
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
          {filteredDonations.map((donation) => <p key={donation.donationId} className="list-row">Seguidor #{donation.followerId} apoyó {donation.flanQuantity} flanes — Bs. {donation.amountBs}</p>)}
        </section>
      </div>

      <section>
        <div className="section-header"><h2>Mis publicaciones y comentarios</h2></div>
        {posts.length === 0 && <EmptyState>No hay publicaciones todavía.</EmptyState>}
        <div className="post-list">
          {posts.map((post) => (
            <article className="post card" key={post.postId}>
              <div className="post-header"><time>{post.createdAt ? new Date(post.createdAt).toLocaleString() : "Sin fecha"}</time><button className="button danger small" onClick={() => deactivatePost(post)}>Desactivar</button></div>
              <p>{post.text}</p>
              {post.imageUrl && <img className="post-image" src={post.imageUrl} alt="Publicación" />}
              <h4>Comentarios recibidos</h4>
              {post.comments?.length ? post.comments.map((comment) => <p className="comment" key={comment.commentId}><strong>Seguidor #{comment.followerId}:</strong> {comment.content}</p>) : <p className="muted">Sin comentarios.</p>}
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
