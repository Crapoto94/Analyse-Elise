'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { UserCheck } from 'lucide-react';
import { SectionHeader, EmptyState, LoadingBlock } from '@/components/ui';

// Utilisateurs en ligne et dernières connexions (comptes locaux et AD / identifiants Windows)
type Row = {
  identifier: string; source: 'local' | 'ad'; role: string;
  lastLogin: string | null; lastSeen: string | null; loginCount: number; online: boolean;
};

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

function ago(iso: string | null) {
  if (!iso) return '';
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
}

export default function ConnexionsTab() {
  const [users, setUsers] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/connexions');
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Erreur');
      setUsers(j.users || []); setError('');
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, []);

  // Rafraîchissement automatique toutes les 30 s
  useEffect(() => { load(); const t = setInterval(load, 30_000); return () => clearInterval(t); }, [load]);

  const online = users.filter(u => u.online);
  const srcLabel = (s: string) => (s === 'ad' ? 'Windows (AD)' : 'Compte local');

  return (
    <div>
      <div className="p-6" style={{ borderBottom: '1px solid var(--line)' }}>
        <SectionHeader title="Connexions" subtitle="Utilisateurs en ligne et dernières connexions, comptes locaux et Windows (AD)." />
      </div>

      {error && <div className="alert alert-danger m-6">{error}</div>}

      {loading ? <LoadingBlock /> : (
        <>
          <section className="p-6" style={{ borderBottom: '1px solid var(--line)' }}>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: 'var(--ok)' }} />
              En ligne maintenant <span className="badge badge-ok">{online.length}</span>
            </h3>
            {online.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Personne n&apos;est connecté en ce moment.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {online.map(u => (
                  <div key={u.identifier} className="rounded-[10px] px-3.5 py-2" style={{ background: 'var(--ok-soft)', border: '1px solid #c4e8d8' }}>
                    <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{u.identifier}</p>
                    <p className="text-xs" style={{ color: 'var(--ok)' }}>{srcLabel(u.source)} · {u.role === 'ADMIN' ? 'Administrateur' : 'Utilisateur'}</p>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs" style={{ color: 'var(--ink-3)' }}>Est « en ligne » un utilisateur actif dans les 3 dernières minutes.</p>
          </section>

          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Utilisateur</th><th>Compte</th><th>Rôle</th><th>Dernière connexion</th><th>Dernière activité</th><th className="text-center">Connexions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.identifier}>
                    <td>
                      <div className="flex items-center gap-2.5 font-medium">
                        <span className="h-2 w-2 rounded-full" style={{ background: u.online ? 'var(--ok)' : 'var(--line-strong)' }} />
                        {u.identifier}
                      </div>
                    </td>
                    <td><span className={`badge ${u.source === 'ad' ? 'badge-brand' : ''}`}>{srcLabel(u.source)}</span></td>
                    <td style={{ color: 'var(--ink-2)' }}>{u.role === 'ADMIN' ? 'Administrateur' : 'Utilisateur'}</td>
                    <td className="num whitespace-nowrap" style={{ color: 'var(--ink-2)' }}>{fmt(u.lastLogin)}</td>
                    <td className="num whitespace-nowrap" style={{ color: 'var(--ink-2)' }}>{fmt(u.lastSeen)} <span style={{ color: 'var(--ink-3)' }}>{ago(u.lastSeen)}</span></td>
                    <td className="num text-center font-medium">{u.loginCount}</td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={6}><EmptyState icon={<UserCheck size={20} />} title="Aucune connexion enregistrée" hint="Les connexions apparaissent ici dès la prochaine authentification." /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
