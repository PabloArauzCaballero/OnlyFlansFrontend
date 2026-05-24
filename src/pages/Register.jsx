import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROLES } from "../services/onlyflansApi.js";
import { useAuth } from "../state/AuthContext.jsx";
import { ErrorMessage } from "../components/Status.jsx";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: ROLES.FOLLOWER,
    publicName: "",
    visibleName: "",
    bio: "",
    profileUrl: "",
    coverUrl: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await register(form);
      navigate(user.role === ROLES.CREATOR ? "/creator/dashboard" : "/follower/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-card card">
      <p className="eyebrow">Registro</p>
      <h1>Crear cuenta</h1>
      <p className="muted">El registro usa rutas separadas para creador y seguidor, tal como está definido en el backend.</p>
      <ErrorMessage message={error} />

      <form onSubmit={submit} className="form-grid">
        <label>Nombre<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} minLength={2} required /></label>
        <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
        <label>Contraseña<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required /></label>
        <label>Rol
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value={ROLES.FOLLOWER}>Seguidor</option>
            <option value={ROLES.CREATOR}>Creador</option>
          </select>
        </label>

        {form.role === ROLES.CREATOR ? (
          <>
            <label>Nombre público<input value={form.publicName} onChange={(e) => setForm({ ...form, publicName: e.target.value })} placeholder="Nombre visible del creador" /></label>
            <label>Biografía<textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={500} placeholder="Cuenta brevemente qué tipo de contenido publicarás" /></label>
            <label>URL foto de perfil<input value={form.profileUrl} onChange={(e) => setForm({ ...form, profileUrl: e.target.value })} placeholder="https://..." /></label>
            <label>URL banner<input value={form.coverUrl} onChange={(e) => setForm({ ...form, coverUrl: e.target.value })} placeholder="https://..." /></label>
          </>
        ) : (
          <label>Nombre visible<input value={form.visibleName} onChange={(e) => setForm({ ...form, visibleName: e.target.value })} placeholder="Nombre que verá el creador" /></label>
        )}

        <button className="button" disabled={loading}>{loading ? "Creando..." : "Crear cuenta"}</button>
      </form>
    </section>
  );
}
