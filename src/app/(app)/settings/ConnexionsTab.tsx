'use client';

import React, { useState, useEffect, useCallback } from 'react';

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
    <div className="p-10 space-y-10">
      <div>
        <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">Connexions</h2>
        <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">Utilisateurs en ligne et dernières connexions</p>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>
      ) : (
        <>
          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              En ligne maintenant ({online.length})
            </h3>
            {online.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Personne n&apos;est connecté en ce moment.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {online.map(u => (
                  <div key={u.identifier} className="px-5 py-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
                    <div className="text-sm font-black text-emerald-900">{u.identifier}</div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-600">{srcLabel(u.source)} · {u.role}</div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-gray-400">Est « en ligne » un utilisateur actif dans les 3 dernières minutes.</p>
          </section>

          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Dernières connexions ({users.length})</h3>
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-6 py-4">Utilisateur</th>
                    <th className="px-4 py-4">Type de compte</th>
                    <th className="px-4 py-4">Rôle</th>
                    <th className="px-4 py-4">Dernière connexion</th>
                    <th className="px-4 py-4">Dernière activité</th>
                    <th className="px-4 py-4 text-center">Connexions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.identifier} className="border-t border-gray-50 dark:border-gray-800">
                      <td className="px-6 py-3 text-xs font-black text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${u.online ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>{u.identifier}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${u.source === 'ad' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                          {srcLabel(u.source)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase">{u.role}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{fmt(u.lastLogin)}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{fmt(u.lastSeen)} <span className="text-gray-400">{ago(u.lastSeen)}</span></td>
                      <td className="px-4 py-3 text-center text-xs font-bold text-blue-600">{u.loginCount}</td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={6} className="px-6 py-16 text-center text-gray-400 text-xs font-black uppercase tracking-widest">
                      Aucune connexion enregistrée pour l&apos;instant
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
