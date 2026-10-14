import React from 'react';

/** En-tête de page : titre, sous-titre, actions à droite. */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** En-tête de section à l'intérieur d'une carte. */
export function SectionHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm" style={{ color: 'var(--ink-3)' }}>{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** État vide. */
export function EmptyState({ icon, title, hint }: { icon?: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      {icon && (
        <div className="mb-1 grid h-11 w-11 place-items-center rounded-full" style={{ background: 'var(--surface-sunken)', color: 'var(--ink-3)' }}>
          {icon}
        </div>
      )}
      <p className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>{title}</p>
      {hint && <p className="max-w-sm text-sm" style={{ color: 'var(--ink-3)' }}>{hint}</p>}
    </div>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return <span className={`spinner ${className}`} role="status" aria-label="Chargement" />;
}

export function LoadingBlock({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-20 text-sm" style={{ color: 'var(--ink-3)' }}>
      <Spinner /> {label}
    </div>
  );
}

/** Champ de formulaire avec libellé. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs" style={{ color: 'var(--ink-3)' }}>{hint}</p>}
    </div>
  );
}
