'use client';

import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { SectionHeader, EmptyState, LoadingBlock } from '@/components/ui';

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
  const badge: Record<string, string> = { auto: 'badge-ok', manual: 'badge-brand', none: 'badge-warn', ignored: '' };
  const label: Record<string, string> = { auto: 'Automatique', manual: 'Manuel', none: 'À rattacher', ignored: 'Ignorée' };
  const pending = Object.keys(choice).length;

  return (
    <div>
      <div className="p-6" style={{ borderBottom: '1px solid var(--line)' }}>
        <SectionHeader
          title="Rattachement des directions"
          subtitle="Directions Elise et directions du Hub DSI : elles fournissent le directeur et les assistantes pour l'envoi des statistiques."
          actions={
            <>
              <label className="flex cursor-pointer items-center gap-2 text-sm" style={{ color: 'var(--ink-2)' }}>
                <input type="checkbox" checked={onlyUnmatched} onChange={e => setOnlyUnmatched(e.target.checked)} />
                Seulement à rattacher ({unmatched})
              </label>
              <button onClick={save} disabled={saving || pending === 0} className="btn btn-primary btn-sm">
                <Save size={15} /> {saving ? 'Enregistrement…' : `Enregistrer${pending ? ` (${pending})` : ''}`}
              </button>
            </>
          }
        />
      </div>

      {error && <div className="alert alert-danger m-6" role="alert">{error}</div>}
      {saved && <div className="alert alert-ok m-6">Rattachements enregistrés.</div>}

      {loading ? <LoadingBlock /> : (
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr><th>Direction (Elise)</th><th className="text-center">Entrants {new Date().getFullYear()}</th><th>Direction du Hub DSI</th><th>État</th></tr>
            </thead>
            <tbody>
              {shown.map(d => {
                const st = status(d);
                const cur = current(d);
                return (
                  <tr key={d.name}>
                    <td className="font-medium">{d.name}</td>
                    <td className="num text-center" style={{ color: 'var(--ink-2)' }}>{d.countEnt}</td>
                    <td>
                      <select
                        className="select max-w-md"
                        value={cur === null ? '__auto' : cur}
                        onChange={e => {
                          const v = e.target.value;
                          setChoice(c => ({ ...c, [d.name]: v === '__auto' ? null : v }));
                        }}
                      >
                        <option value="__auto">{d.autoCode ? 'Rapprochement automatique' : '— Choisir une direction du Hub —'}</option>
                        <option value="">Ne pas rattacher (ignorer)</option>
                        {hubDirs.map(h => <option key={h.code} value={h.code}>{h.label}{h.head ? ` — ${h.head}` : ''}</option>)}
                      </select>
                    </td>
                    <td><span className={`badge ${badge[st]}`}>{label[st]}</span></td>
                  </tr>
                );
              })}
              {shown.length === 0 && <tr><td colSpan={4}><EmptyState title="Toutes les directions sont rattachées" /></td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
