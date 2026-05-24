export function ErrorMessage({ message }) {
  if (!message) return null;
  return <div className="alert alert-error" role="alert">{message}</div>;
}

export function SuccessMessage({ message }) {
  if (!message) return null;
  return <div className="alert alert-success" role="status">{message}</div>;
}

export function EmptyState({ title = "Sin resultados", children }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}

export function LoadingCard({ children = "Cargando información..." }) {
  return <section className="card loading-card"><span className="loader" /> <p>{children}</p></section>;
}

export function StatCard({ label, value, helper }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {helper && <small>{helper}</small>}
    </article>
  );
}
