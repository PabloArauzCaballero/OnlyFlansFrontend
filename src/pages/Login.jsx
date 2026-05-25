import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ErrorMessage } from "../components/Status.jsx";
import { ROLES } from "../services/onlyflansApi.js";
import { useAuth } from "../state/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login(form);
      const fallback = user.role === ROLES.CREATOR ? "/creator/dashboard" : "/follower/dashboard";
      navigate(location.state?.from || fallback, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-card card">
      <p className="eyebrow">Acceso seguro</p>
      <h1>Iniciar sesión</h1>
      <ErrorMessage message={error} />

      <form onSubmit={submit} className="form-grid">
        <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="email" /></label>
        <label>Contraseña<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required autoComplete="current-password" /></label>
        <button className="button full" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button>
      </form>

      <p className="auth-footer">¿No tienes cuenta? <Link to="/register">Crear una cuenta</Link></p>
    </section>
  );
}
