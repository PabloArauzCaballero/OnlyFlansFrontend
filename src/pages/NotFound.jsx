import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="card not-found">
      <p className="eyebrow">404</p>
      <h1>Ruta no encontrada</h1>
      <p className="muted">La ruta solicitada no existe en el frontend.</p>
      <Link className="button" to="/">Volver al inicio</Link>
    </section>
  );
}
