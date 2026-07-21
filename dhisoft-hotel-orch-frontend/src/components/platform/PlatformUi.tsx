import { ReactNode } from 'react';

export function PlatformHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="admin-heading">
      <div>
        <div className="kicker">{eyebrow}</div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="builder-actions">{actions}</div>}
    </div>
  );
}

export function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: ReactNode;
  note?: string;
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </div>
  );
}

export function StatusPill({ value }: { value?: string }) {
  const positive = ['ACTIVE', 'HEALTHY', 'OPERATIONAL', 'VERIFIED', 'PUBLISHED', 'SUCCEEDED'].includes(
    value ?? '',
  );
  const negative = ['FAILED', 'DOWN', 'SUSPENDED', 'ARCHIVED', 'DISABLED', 'REJECTED', 'REVOKED'].includes(
    value ?? '',
  );
  return (
    <span className={`status ${positive ? 'ok' : negative ? 'err' : 'warn'}`}>
      {value ?? 'UNKNOWN'}
    </span>
  );
}

export function ErrorNotice({ error }: { error: string }) {
  return error ? <div className="notice error-notice">{error}</div> : null;
}

export function LoadingPanel() {
  return <div className="panel">Loading platform data…</div>;
}
