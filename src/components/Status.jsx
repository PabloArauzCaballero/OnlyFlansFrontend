export function ErrorMessage({ message }) {
  if (!message) return null;
  return <div className="alert alert-error">{message}</div>;
}

export function SuccessMessage({ message }) {
  if (!message) return null;
  return <div className="alert alert-success">{message}</div>;
}

export function EmptyState({ children }) {
  return <div className="empty-state">{children}</div>;
}
