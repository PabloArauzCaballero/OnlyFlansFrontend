import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorMessage, LoadingCard, StatCard, SuccessMessage } from "../components/Status.jsx";
import { onlyflansApi } from "../services/onlyflansApi.js";
import { uploadMultipleImages, uploadSingleImage } from "../services/cloudinary.js";
import { useAuth } from "../state/AuthContext.jsx";
import { Heart, Lock, Target, DollarSign, Users, Shield, MessageSquare, BarChart, Settings, FileText, Calendar, User, LayoutDashboard, PlusCircle, Trash2 } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState("overview");
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [donations, setDonations] = useState([]);
  const [profileForm, setProfileForm] = useState({ nombre_publico: "", biografia: "", foto_perfil_url: "", banner_url: "" });
  const [goalForm, setGoalForm] = useState({ title: "", description: "" });
  const [postForm, setPostForm] = useState(initialPostForm);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [postImageFiles, setPostImageFiles] = useState([]);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [uploadingBannerImage, setUploadingBannerImage] = useState(false);
  const [uploadingPostImages, setUploadingPostImages] = useState(false);
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

  const isValidImageFile = (file) => {
    if (!file) return false;
    return file.type.startsWith("image/");
  };

  const uploadProfileImage = async () => {
    if (!profileImageFile) {
      setError("Selecciona una imagen de perfil antes de subirla.");
      return;
    }

    if (!isValidImageFile(profileImageFile)) {
      setError("El archivo de perfil debe ser una imagen válida.");
      return;
    }

    setError("");
    setSuccess("");
    setUploadingProfileImage(true);

    try {
      const uploaded = await uploadSingleImage(profileImageFile, { folder: "onlyflans/profile" });
      setProfileForm((current) => ({ ...current, foto_perfil_url: uploaded.url }));
      setProfileImageFile(null);
      setSuccess("Imagen de perfil subida correctamente.");
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingProfileImage(false);
    }
  };

  const uploadBannerImage = async () => {
    if (!bannerFile) {
      setError("Selecciona una imagen de banner antes de subirla.");
      return;
    }

    if (!isValidImageFile(bannerFile)) {
      setError("El archivo de banner debe ser una imagen válida.");
      return;
    }

    setError("");
    setSuccess("");
    setUploadingBannerImage(true);

    try {
      const uploaded = await uploadSingleImage(bannerFile, { folder: "onlyflans/banner" });
      setProfileForm((current) => ({ ...current, banner_url: uploaded.url }));
      setBannerFile(null);
      setSuccess("Banner subido correctamente.");
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingBannerImage(false);
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
    const manualImageUrls = postForm.imageUrls.split("\n").map((url) => url.trim()).filter(Boolean);

    run(async () => {
      let uploadedImageUrls = [];

      if (postImageFiles.length > 0) {
        const invalidFile = postImageFiles.find((file) => !isValidImageFile(file));
        if (invalidFile) {
          throw new Error("Todos los archivos de la publicación deben ser imágenes válidas.");
        }

        setUploadingPostImages(true);
        uploadedImageUrls = await uploadMultipleImages(postImageFiles, { folder: "onlyflans/posts" });
      }

      const imageUrls = [...manualImageUrls, ...uploadedImageUrls];
      await onlyflansApi.posts.create({ creatorId: user.id, text: postForm.text, imageUrls });
      setPostForm(initialPostForm);
      setPostImageFiles([]);
    }, "Publicación creada correctamente.");
  };

  const deactivatePost = (post) => run(() => onlyflansApi.posts.deactivate(post), "Publicación desactivada correctamente.");

  if (loading) return <LoadingCard>Cargando panel de creador...</LoadingCard>;

  const totalFlans = totalReport.totalFlans;

  return (
    <section>
      <div className="section-header" style={{ marginBottom: "1.5rem" }}>
        <div>
          <p className="eyebrow">Panel de Administración</p>
          <h1>Panel de creador <LayoutDashboard size={28} className="lucide-icon inline-icon" /></h1>
        </div>
      </div>

      <ErrorMessage message={error} />
      <SuccessMessage message={success} />

      {/* Tabs navigation */}
      <nav className="dashboard-tabs">
        <button className={`tab-btn ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>
          <BarChart size={16} className="lucide-icon inline-icon" /> Resumen General
        </button>
        <button className={`tab-btn ${activeTab === "posts" ? "active" : ""}`} onClick={() => setActiveTab("posts")}>
          <FileText size={16} className="lucide-icon inline-icon" /> Publicaciones ({posts.length})
        </button>
        <button className={`tab-btn ${activeTab === "settings" ? "active" : ""}`} onClick={() => setActiveTab("settings")}>
          <Settings size={16} className="lucide-icon inline-icon" /> Ajustes de Perfil y Meta
        </button>
      </nav>

      {/* Tab: Overview */}
      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="stats-grid">
            <StatCard label="Publicaciones activas" value={posts.length} />
            <StatCard label="Apoyos recibidos" value={totalReport.donationCount} helper={`${totalReport.totalFlans} flanes`} />
            <StatCard label="Ingresos simulados" value={`Bs. ${totalReport.totalBs}`} helper="Estado SIMULADO_APROBADO" />
          </div>

          {profile?.goal && (
            <article className="card" style={{ borderLeft: "4px solid var(--brand)", padding: "1.25rem" }}>
              <div className="section-header" style={{ marginBottom: "0.5rem" }}>
                <div>
                  <p className="eyebrow" style={{ color: "var(--brand-dark)" }}><Target size={14} className="lucide-icon inline-icon" /> Meta de Apoyo Activa</p>
                  <h3 style={{ margin: "0.2rem 0" }}>{profile.goal.title}</h3>
                  <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>{profile.goal.description}</p>
                </div>
              </div>
              <div style={{ marginTop: "0.75rem", fontSize: "0.9rem", color: "var(--muted-strong)", display: "flex", alignItems: "center" }}>
                <Heart size={14} className="lucide-icon inline-icon" style={{ fill: 'var(--brand)', color: 'var(--brand)' }} />
                <span>Apoyos recibidos: <strong>{totalFlans} {totalFlans === 1 ? 'flan' : 'flanes'}</strong></span>
              </div>
            </article>
          )}

          <section className="card form-grid" style={{ width: "100%" }}>
            <h2>Reporte de ingresos <BarChart size={20} className="lucide-icon inline-icon" /></h2>
            <div className="inline-form wrap">
              <label>Fecha de Inicio<input type="date" value={reportDates.startDate} onChange={(e) => setReportDates({ ...reportDates, startDate: e.target.value })} /></label>
              <label>Fecha de Fin<input type="date" value={reportDates.endDate} onChange={(e) => setReportDates({ ...reportDates, endDate: e.target.value })} /></label>
            </div>
            <div className="report-summary" style={{ background: "var(--brand-soft)", padding: "0.8rem", borderRadius: "16px", border: "1px solid rgba(184,95,45,0.12)", justifyContent: "space-around" }}>
              <div style={{ textAlign: "center" }}><small style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem" }}>Total Flanes Filtrados</small><strong style={{ fontSize: "1.35rem", color: "var(--brand)" }}>{report.totalFlans} <Heart size={14} className="lucide-icon inline-icon" style={{ fill: 'var(--brand)', color: 'var(--brand)' }} /></strong></div>
              <div style={{ textAlign: "center" }}><small style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem" }}>Ingreso Filtrado</small><strong style={{ fontSize: "1.35rem", color: "var(--success)" }}>Bs. {report.totalBs}</strong></div>
              <div style={{ textAlign: "center" }}><small style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem" }}>Apoyos Filtrados</small><strong style={{ fontSize: "1.35rem", color: "var(--text)" }}>{report.donationCount}</strong></div>
            </div>
            <div className="table-responsive" style={{ maxHeight: "300px" }}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Seguidor</th>
                    <th>Fecha</th>
                    <th>Cantidad</th>
                    <th>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDonations.map((donation) => (
                    <tr key={donation.donationId}>
                      <td><User size={14} className="lucide-icon inline-icon" /> Seguidor #{donation.followerId}</td>
                      <td><Calendar size={14} className="lucide-icon inline-icon" /> {donation.createdAt ? new Date(donation.createdAt).toLocaleDateString() : "Sin fecha"}</td>
                      <td>{donation.flanQuantity} <Heart size={14} className="lucide-icon inline-icon" style={{ fill: 'var(--brand)', color: 'var(--brand)' }} /></td>
                      <td><span className="badge-amount">Bs. {donation.amountBs}</span></td>
                    </tr>
                  ))}
                  {filteredDonations.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: "center", color: "var(--muted)", padding: "1.5rem" }}>
                        No hay apoyos en ese rango de fechas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* Tab: Posts */}
      {activeTab === "posts" && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.2fr)", gap: "1.5rem", alignItems: "start" }}>
          <form className="card form-grid" onSubmit={createPost}>
            <h2>Nueva publicación <PlusCircle size={20} className="lucide-icon inline-icon" /></h2>
            <label>Contenido del post<textarea value={postForm.text} onChange={(e) => setPostForm({ ...postForm, text: e.target.value })} placeholder="Escribe el contenido exclusivo para tus seguidores..." /></label>
            <label>Subir imágenes de la publicación<input type="file" accept="image/*" multiple onChange={(e) => setPostImageFiles(Array.from(e.target.files || []))} /></label>
            {postImageFiles.length > 0 && (
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", margin: "0.5rem 0" }}>
                {postImageFiles.map((file, idx) => (
                  <div key={idx} className="image-preview-container" style={{ margin: 0, padding: "0.25rem 0.5rem" }}>
                    <img className="image-preview-thumbnail" style={{ width: "40px", height: "40px" }} src={URL.createObjectURL(file)} alt={`Vista previa ${idx}`} />
                    <div className="image-preview-info">
                      <span className="image-preview-name" style={{ maxWidth: "100px" }}>{file.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <label>URLs de imágenes, una por línea (manual/fallback)<textarea value={postForm.imageUrls} onChange={(e) => setPostForm({ ...postForm, imageUrls: e.target.value })} placeholder="https://imagen-1...\nhttps://imagen-2..." /></label>
            <button className="button" disabled={actionLoading || uploadingPostImages || (!postForm.text.trim() && !postForm.imageUrls.trim() && postImageFiles.length === 0)}>
              {uploadingPostImages ? "Subiendo imágenes..." : "Publicar"}
            </button>
          </form>

          <section className="card" style={{ padding: "1.25rem" }}>
            <h2>Mis publicaciones y comentarios ({posts.length})</h2>
            {posts.length === 0 && <EmptyState title="Sin publicaciones">Crea tu primera publicación exclusiva en el panel izquierdo.</EmptyState>}
            <div className="post-list" style={{ gap: "1.25rem" }}>
              {posts.map((post) => (
                <article className="post card" key={post.postId} style={{ background: "rgba(255, 255, 255, 0.4)" }}>
                  <div className="post-header">
                    <time>{post.createdAt ? new Date(post.createdAt).toLocaleString() : "Sin fecha"}</time>
                    <button className="button danger small" onClick={() => deactivatePost(post)} disabled={actionLoading}><Trash2 size={12} className="lucide-icon btn-icon" /> Desactivar</button>
                  </div>
                  {post.text && <p style={{ fontSize: "0.95rem", lineHeight: "1.5" }}>{post.text}</p>}
                  {post.images?.length > 0 && (
                    <div className="image-grid">
                      {post.images.map((image) => <img className="post-image" src={image.imageUrl} alt="Publicación" key={image.imageId} loading="lazy" />)}
                    </div>
                  )}
                  <div className="comment-box" style={{ borderTop: "1px solid var(--line)" }}>
                    <h4 style={{ margin: "0.5rem 0", fontSize: "0.9rem" }}><MessageSquare size={14} className="lucide-icon inline-icon" /> Comentarios recibidos</h4>
                    {post.comments?.length ? (
                      <div className="comments-bubble-list">
                        {post.comments.map((comment) => (
                          <div className="comment-bubble" key={comment.commentId}>
                            <div className="comment-bubble-meta">
                              <span><User size={12} className="lucide-icon inline-icon" /> Seguidor #{comment.followerId}</span>
                              <span>•</span>
                              <span><Calendar size={12} className="lucide-icon inline-icon" /> {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : "Sin fecha"}</span>
                            </div>
                            <p className="comment-bubble-text">{comment.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>Sin comentarios aún.</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Tab: Settings */}
      {activeTab === "settings" && (
        <div className="two-column">
          <form className="card form-grid" onSubmit={saveProfile}>
            <h2>Perfil público <User size={20} className="lucide-icon inline-icon" /></h2>
            <label>Nombre público<input value={profileForm.nombre_publico} onChange={(e) => setProfileForm({ ...profileForm, nombre_publico: e.target.value })} maxLength={120} required /></label>
            <label>Biografía<textarea value={profileForm.biografia} onChange={(e) => setProfileForm({ ...profileForm, biografia: e.target.value })} /></label>

            <label>Subir foto de perfil<input type="file" accept="image/*" onChange={(e) => setProfileImageFile(e.target.files?.[0] || null)} /></label>
            {profileImageFile && (
              <div className="image-preview-container">
                <img className="image-preview-thumbnail" src={URL.createObjectURL(profileImageFile)} alt="Vista previa de perfil" />
                <div className="image-preview-info">
                  <p className="image-preview-name">{profileImageFile.name}</p>
                  <p className="image-preview-size">{(profileImageFile.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
            )}
            <button type="button" className="button" onClick={uploadProfileImage} disabled={actionLoading || uploadingProfileImage || !profileImageFile}>
              {uploadingProfileImage ? "Subiendo foto..." : "Subir foto de perfil"}
            </button>

            <label>Subir banner<input type="file" accept="image/*" onChange={(e) => setBannerFile(e.target.files?.[0] || null)} /></label>
            {bannerFile && (
              <div className="image-preview-container">
                <img className="image-preview-thumbnail" src={URL.createObjectURL(bannerFile)} alt="Vista previa de banner" />
                <div className="image-preview-info">
                  <p className="image-preview-name">{bannerFile.name}</p>
                  <p className="image-preview-size">{(bannerFile.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
            )}
            <button type="button" className="button" onClick={uploadBannerImage} disabled={actionLoading || uploadingBannerImage || !bannerFile}>
              {uploadingBannerImage ? "Subiendo banner..." : "Subir banner"}
            </button>

            <label>URL foto de perfil (manual/fallback)<input value={profileForm.foto_perfil_url} onChange={(e) => setProfileForm({ ...profileForm, foto_perfil_url: e.target.value })} placeholder="https://..." /></label>
            <label>URL banner (manual/fallback)<input value={profileForm.banner_url} onChange={(e) => setProfileForm({ ...profileForm, banner_url: e.target.value })} placeholder="https://..." /></label>

            <button className="button" disabled={actionLoading}>{actionLoading ? "Guardando..." : "Guardar perfil"}</button>
          </form>

          <form className="card form-grid" onSubmit={saveGoal}>
            <h2>Meta de apoyo <Target size={20} className="lucide-icon inline-icon" /></h2>
            <label>Título<input value={goalForm.title} onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })} maxLength={160} required placeholder="Ej. Comprar una batidora industrial" /></label>
            <label>Descripción<textarea value={goalForm.description} onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })} required placeholder="Explica a tus seguidores en qué usarás el apoyo económico..." /></label>
            <div className="actions">
              <button className="button" disabled={actionLoading}>{profile?.goal ? "Actualizar meta" : "Crear meta"}</button>
              <button type="button" className="button danger" onClick={deactivateGoal} disabled={!profile?.goal || actionLoading}>Desactivar</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
