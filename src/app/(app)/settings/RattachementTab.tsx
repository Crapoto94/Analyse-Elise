'use client';

import React, { useState, useEffect } from 'react';

// Rattachement des directions Elise aux directions du Hub DSI (envoi des statistiques)
type HubDir = { code: string; label: string; head: string };
type EliseDir = { name: string; countEnt: number; autoCode: string | null; manualCode: string | null };

export default function RattachementTab() {
  const [hubDirs, setHubDirs] = useState<HubDir[]>([]);
  const [dirs, setDirs] = useState<EliseDir[]>([]);
  const [choice, setChoice] = useState<Record<string, string | null>>({}); // modifications non enregistrées
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [onlyUnmatched, setOnlyUnmatched] = useState(true);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/envoi-stats/mapping');
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Erreur');
      setHubDirs(j.hubDirections || []); setDirs(j.directions || []); setChoice({});
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  // Valeur affichée : modification en cours > rattachement manuel > automatique
  const current = (d: EliseDir): string | null => (d.name in choice ? choice[d.name] : (d.manualCode ?? d.autoCode));
  const status = (d: EliseDir) => {
    if (d.name in choice) return choice[d.name] === null ? (d.autoCode ? 'auto' : 'none') : (choice[d.name] === '' ? 'ignored' : 'manual');
    if (d.manualCode !== null) return d.manualCode === '' ? 'ignored' : 'manual';
    return d.autoCode ? 'auto' : 'none';
  };

  const save = async () => {
    setSaving(true); setSaved(false);
    try {
      const res = await fetch('/api/envoi-stats/mapping', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mapping: choice }) });
      if (!res.ok) throw new Error((await res.json()).error || 'Erreur');
      await load(); setSaved(true);
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  const unmatched = dirs.filter(d => status(d) === 'none').length;
  const shown = dirs.filter(d => !onlyUnmatched || status(d) === 'none' || d.name in choice);
  const badge: Record<string, string> = {
    auto: 'bg-emerald-50 text-emerald-700 border-emerald-100', manual: 'bg-blue-50 text-blue-700 border-blue-100',
    none: 'bg-amber-50 text-amber-700 border-amber-100', ignored: 'bg-slate-100 text-slate-500 border-slate-200',
  };
  const label: Record<string, string> = { auto: 'Automatique', manual: 'Manuel', none: 'À rattacher', ignored: 'Ignorée' };

  return (
    <div className="p-10 space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">Rattachement des directions</h2>
          <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">
            Directions Elise ↔ directions du Hub DSI (directeur et assistantes pour l&apos;envoi des statistiques)
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs font-bold text-gray-500 cursor-pointer">
            <input type="checkbox" checked={onlyUnmatched} onChange={e => setOnlyUnmatched(e.target.checked)} />
            Seulement à rattacher ({unmatched})
          </label>
          <button onClick={save} disabled={saving || Object.keys(choice).length === 0}
            className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest disabled:opacity-40">
            {saving ? 'Enregistrement…' : `Enregistrer (${Object.keys(choice).length})`}
          </button>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100">{error}</div>}
      {saved && <div className="p-4 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-100">Rattachements enregistrés.</div>}

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-4">Direction (Elise)</th>
                <th className="px-4 py-4 text-center">Entrants {new Date().getFullYear()}</th>
                <th className="px-4 py-4">Direction du Hub DSI</th>
                <th className="px-4 py-4">État</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(d => {
                const st = status(d);
                const cur = current(d);
                return (
                  <tr key={d.name} className="border-t border-gray-50 dark:border-gray-800">
                    <td className="px-6 py-3 text-xs font-black text-gray-800 dark:text-gray-100">{d.name}</td>
                    <td className="px-4 py-3 text-center text-xs font-bold text-blue-600">{d.countEnt}</td>
                    <td className="px-4 py-3">
                      <select
                        value={cur === null ? '__auto' : cur}
                        onChange={e => {
                          const v = e.target.value;
                          setChoice(c => ({ ...c, [d.name]: v === '__auto' ? null : v }));
                        }}
                        className="w-full max-w-md px-3 py-2 text-xs font-bold bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl"
                      >
                        <option value="__auto">{d.autoCode ? '↺ Rapprochement automatique' : '— Choisir une direction du Hub —'}</option>
                        <option value="">⛔ Ne pas rattacher (ignorer)</option>
                        {hubDirs.map(h => <option key={h.code} value={h.code}>{h.label}{h.head ? ` — ${h.head}` : ''}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${badge[st]}`}>{label[st]}</span>
                    </td>
                  </tr>
                );
              })}
              {shown.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-16 text-center text-gray-400 text-xs font-black uppercase tracking-widest">
                  Toutes les directions sont rattachées
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
