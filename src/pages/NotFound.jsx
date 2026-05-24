import { Link } from "react-router-dom";

export default function NotFound() {
  return <section className="card"><h1>Ruta no encontrada</h1><Link className="button" to="/">Volver al inicio</Link></section>;
}
