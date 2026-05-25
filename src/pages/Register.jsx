import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ErrorMessage } from "../components/Status.jsx";
import { ROLES } from "../services/onlyflansApi.js";
import { useAuth } from "../state/AuthContext.jsx";

const initialForm = {
  name: "",
  email: "",
  password: "",
  role: ROLES.FOLLOWER,
  publicName: "",
  visibleName: "",
  bio: "",
  profileUrl: "",
  coverUrl: "",
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await register(form);
      navigate(user.role === ROLES.CREATOR ? "/creator/dashboard" : "/follower/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-card card wide-auth">
      <p className="eyebrow">Registro conectado al backend</p>
      <h1>Crear cuenta</h1>
      <ErrorMessage message={error} />

      <form onSubmit={submit} className="form-grid">
        <div className="two-column compact">
          <label>Nombre<input value={form.name} onChange={(e) => update("name", e.target.value)} minLength={2} maxLength={120} required autoComplete="name" /></label>
          <label>Email<input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required autoComplete="email" /></label>
        </div>

        <div className="two-column compact">
          <label>Contraseña<input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} minLength={8} maxLength={100} required autoComplete="new-password" /></label>
          <label>Rol
            <select value={form.role} onChange={(e) => update("role", e.target.value)}>
              <option value={ROLES.FOLLOWER}>Seguidor</option>
              <option value={ROLES.CREATOR}>Creador</option>
            </select>
          </label>
        </div>

        {form.role === ROLES.CREATOR ? (
          <div className="form-grid nested-panel">
            <h2>Perfil de creador</h2>
            <label>Nombre público<input value={form.publicName} onChange={(e) => update("publicName", e.target.value)} placeholder="Ej. Flanes de Ana" maxLength={120} required /></label>
            <label>Biografía<textarea value={form.bio} onChange={(e) => update("bio", e.target.value)} placeholder="Cuenta brevemente qué contenido publicarás" /></label>
            <div className="two-column compact">
              <label>URL foto de perfil<input value={form.profileUrl} onChange={(e) => update("profileUrl", e.target.value)} placeholder="https://..." /></label>
              <label>URL banner<input value={form.coverUrl} onChange={(e) => update("coverUrl", e.target.value)} placeholder="https://..." /></label>
            </div>
          </div>
        ) : (
          <div className="form-grid nested-panel">
            <h2>Perfil de seguidor</h2>
            <label>Nombre visible<input value={form.visibleName} onChange={(e) => update("visibleName", e.target.value)} placeholder="Nombre que verá el creador" maxLength={120} required /></label>
          </div>
        )}

        <button className="button full" disabled={loading}>{loading ? "Creando cuenta..." : "Crear cuenta"}</button>
      </form>

      <p className="auth-footer">¿Ya tienes cuenta? <Link to="/login">Entrar</Link></p>
    </section>
  );
}
