import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ROLES } from "../services/onlyflansApi.js";
import { useAuth } from "../state/AuthContext.jsx";
import { ErrorMessage } from "../components/Status.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login(form);
      navigate(user.role === ROLES.CREATOR ? "/creator/dashboard" : "/follower/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-card card">
      <p className="eyebrow">Acceso</p>
      <h1>Iniciar sesión</h1>
      <p className="muted">Usa el correo y contraseña creados en el registro o cargados en tus datos de prueba.</p>
      <ErrorMessage message={error} />
      <form onSubmit={submit} className="form-grid">
        <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
        <label>Contraseña<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
        <button className="button" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button>
      </form>
      <p>¿No tienes cuenta? <Link to="/register">Regístrate</Link></p>
    </section>
  );
}
