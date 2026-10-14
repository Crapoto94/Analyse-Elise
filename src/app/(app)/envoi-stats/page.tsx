'use client';

import { useEffect, useMemo, useState } from 'react';

type Recipient = { key: string; name?: string; email?: string; assistantName?: string; assistantEmail?: string };
type Svc = { name: string; countEnt: number; countSor: number };
type Dir = { name: string; dga?: string; countEnt: number; countSor: number; services: Svc[] };
type Sug = { name?: string; email?: string; assistantName?: string; assistantEmail?: string; hubLabel?: string };
type Result = { label: string; to?: string; status: string; detail?: string };

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const dKey = (d: string) => `D|${d}`;
const sKey = (d: string, s: string) => `S|${d}|${s}`;

function previousMonth() {
  const n = new Date();
  return n.getMonth() === 0 ? { year: n.getFullYear() - 1, month: 12 } : { year: n.getFullYear(), month: n.getMonth() };
}

/** Champ nom + e-mail avec recherche d'agent dans StudioRH */
function PersonField({ name, email, placeholder, onChange }: {
  name?: string; email?: string; placeholder: string;
  onChange: (name: string, email: string) => void;
}) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const j = await (await fetch(`/api/envoi-stats/agents?q=${encodeURIComponent(q)}`)).json();
        setHits(j.data || []);
      } finally { setBusy(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="relative flex flex-col gap-1 min-w-[220px]">
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder={`🔎 ${placeholder} (nom)`}
        className="px-2 py-1 text-[11px] border border-slate-200 rounded-lg bg-white"
      />
      {(hits.length > 0 || busy) && (
        <div className="absolute top-7 left-0 z-30 w-72 bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-auto">
          {busy && <div className="p-2 text-[10px] text-slate-400">Recherche…</div>}
          {hits.map((h, i) => (
            <button key={i} type="button" className="block w-full text-left px-2 py-1.5 hover:bg-blue-50 text-[11px]"
              onClick={() => { onChange(h.nom, h.email); setQ(''); setHits([]); }}>
              <b>{h.nom}</b> <span className="text-slate-400">{h.email}</span>
              <div className="text-[9px] text-slate-400 truncate">{h.fonction} — {h.direction}</div>
            </button>
          ))}
        </div>
      )}
      <input
        value={email || ''}
        onChange={e => onChange(name || '', e.target.value)}
        placeholder="e-mail"
        className="px-2 py-1 text-[11px] border border-slate-200 rounded-lg bg-slate-50"
      />
      {name && <span className="text-[10px] text-slate-500 truncate">{name}</span>}
    </div>
  );
}

export default function EnvoiStatsPage() {
  const def = previousMonth();
  const [year, setYear] = useState(def.year);
  const [month, setMonth] = useState(def.month);
  const [mode, setMode] = useState<'direction' | 'service'>('direction');
  const [tree, setTree] = useState<Dir[]>([]);
  const [recipients, setRecipients] = useState<Record<string, Recipient>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [selDirs, setSelDirs] = useState<Set<string>>(new Set());
  const [selSvcs, setSelSvcs] = useState<Set<string>>(new Set());
  const [withAssistant, setWithAssistant] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [ccAll, setCcAll] = useState('');
  useEffect(() => { try { setCcAll(localStorage.getItem('envoiStatsCc') || ''); } catch { /* stockage indisponible */ } }, []);
  useEffect(() => { try { localStorage.setItem('envoiStatsCc', ccAll); } catch { /* idem */ } }, [ccAll]);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, Sug>>({});
  const [hubError, setHubError] = useState('');
  const [filter, setFilter] = useState('');

  const years = Array.from({ length: new Date().getFullYear() - 2023 + 1 }, (_, i) => 2023 + i);

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(j => setIsAdmin(j?.user?.role === 'ADMIN')).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true); setError('');
    fetch(`/api/envoi-stats?year=${year}&month=${month}`)
      .then(r => r.json())
      .then(j => {
        if (j.error) throw new Error(j.error);
        setTree(j.tree || []);
        setRecipients(j.recipients || {});
        setSuggestions(j.suggestions || {});
        setHubError(j.hubError || '');
        setDirty(new Set());
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [year, month]);

  const visibleTree = useMemo(
    () => tree.filter(d => !filter || d.name.toLowerCase().includes(filter.toLowerCase()) || d.services.some(s => s.name.toLowerCase().includes(filter.toLowerCase()))),
    [tree, filter]);

  // Saisie manuelle prioritaire, sinon proposition du Hub DSI
  const eff = (key: string) => {
    const m = recipients[key]; const g = suggestions[key];
    return {
      name: m?.name || g?.name, email: m?.email || g?.email,
      assistantName: m?.assistantName || g?.assistantName, assistantEmail: m?.assistantEmail || g?.assistantEmail,
      hubLabel: g?.hubLabel, auto: !m?.email && !!g?.email,
    };
  };

  const patch = (key: string, p: Partial<Recipient>) => {
    setRecipients(r => ({ ...r, [key]: { ...(r[key] || { key }), key, ...p } }));
    setDirty(d => new Set(d).add(key));
  };

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, v: string) => {
    const n = new Set(set); n.has(v) ? n.delete(v) : n.add(v); setter(n);
  };

  // Cocher une direction coche aussi ses services (et inversement) en mode Service
  const toggleDir = (d: Dir) => {
    const on = !selDirs.has(d.name);
    const nd = new Set(selDirs); on ? nd.add(d.name) : nd.delete(d.name); setSelDirs(nd);
    if (mode === 'service') {
      const ns = new Set(selSvcs);
      d.services.forEach(s => on ? ns.add(sKey(d.name, s.name)) : ns.delete(sKey(d.name, s.name)));
      setSelSvcs(ns);
    }
  };

  const selectAll = (on: boolean) => {
    setSelDirs(on ? new Set(visibleTree.map(d => d.name)) : new Set());
    setSelSvcs(on && mode === 'service' ? new Set(visibleTree.flatMap(d => d.services.map(s => sKey(d.name, s.name)))) : new Set());
  };

  // Directions affichées qui ont une assistante (saisie ou proposée par le Hub)
  const withAssistantAvail = visibleTree.filter(d => eff(dKey(d.name)).assistantEmail);
  const allAssistChecked = withAssistantAvail.length > 0 && withAssistantAvail.every(d => withAssistant.has(d.name));
  const toggleAllAssistants = () => {
    const n = new Set(withAssistant);
    withAssistantAvail.forEach(d => allAssistChecked ? n.delete(d.name) : n.add(d.name));
    setWithAssistant(n);
  };

  const count = selDirs.size + (mode === 'service' ? selSvcs.size : 0);

  const save = async () => {
    const payload = Array.from(dirty).map(k => recipients[k]).filter(Boolean);
    const res = await fetch('/api/envoi-stats/recipients', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipients: payload }) });
    const j = await res.json();
    if (!res.ok) { alert(j.error || 'Erreur'); return; }
    setDirty(new Set());
  };

  const send = async () => {
    if (dirty.size > 0) await save();
    const items: any[] = [];
    selDirs.forEach(d => items.push({ kind: 'direction', dir: d, includeAssistant: withAssistant.has(d) }));
    if (mode === 'service') {
      selSvcs.forEach(k => { const [, dir, service] = k.split('|'); items.push({ kind: 'service', dir, service }); });
    }
    const target = testTo.trim() ? `l'adresse de TEST ${testTo.trim()}` : `${items.length} destinataire(s) réel(s)`;
    if (!confirm(`Envoyer ${items.length} PDF (${MONTHS[month - 1]} ${year}) vers ${target} ?`)) return;
    setSending(true); setResults(null);
    try {
      const res = await fetch('/api/envoi-stats/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ year, month, items, testTo: testTo.trim() || undefined, cc: ccAll.trim() || undefined }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Erreur');
      setResults(j.results);
    } catch (e: any) {
      setError(e.message);
    } finally { setSending(false); }
  };

  const pdfUrl = (dir: string, svc?: string) =>
    `/api/envoi-stats/pdf?year=${year}&month=${month}&dir=${encodeURIComponent(dir)}${svc ? `&service=${encodeURIComponent(svc)}` : ''}`;

  return (
    <div className="p-8 space-y-6 max-w-[1500px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          Envoi des statistiques
          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full uppercase tracking-tighter">PDF par e-mail</span>
        </h1>
        <p className="text-slate-500">Envoi à la demande du tableau Entrants/Sortants aux directeurs, responsables de service et assistants de direction.</p>
        {hubError && (
          <p className="text-[11px] text-amber-600 mt-1">⚠ Hub DSI injoignable ({hubError}) : seuls les e-mails saisis ici sont utilisés.</p>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Envoyer aux</label>
          <div className="flex rounded-xl overflow-hidden border border-slate-200">
            {(['direction', 'service'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-4 py-2 text-sm font-bold ${mode === m ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}>
                {m === 'direction' ? 'Directions' : 'Directions + services'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mois (1er → dernier jour)</label>
          <div className="flex gap-2">
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className="px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl text-sm font-bold text-blue-900">
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl text-sm font-bold text-blue-900">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtrer</label>
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="direction ou service…" className="px-3 py-2 border border-slate-200 rounded-xl text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Copie (Cc) de chaque mail</label>
          <input value={ccAll} onChange={e => setCcAll(e.target.value)} placeholder="adresse(s), séparées par une virgule" className="px-3 py-2 border border-slate-200 rounded-xl text-sm w-64" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mode test (adresse unique)</label>
          <input value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="votre@mail — rien ne part aux destinataires" className="px-3 py-2 border border-amber-200 bg-amber-50 rounded-xl text-sm w-72" />
        </div>
        <div className="flex gap-2 ml-auto">
          <button onClick={() => selectAll(true)} className="px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl">Tout cocher</button>
          <button onClick={() => selectAll(false)} className="px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl">Tout décocher</button>
          <button onClick={toggleAllAssistants} disabled={withAssistantAvail.length === 0}
            className="px-3 py-2 text-xs font-bold border border-indigo-200 text-indigo-700 rounded-xl disabled:opacity-40">
            {allAssistChecked ? 'Décocher' : 'Cocher'} toutes les assistantes ({withAssistantAvail.length})
          </button>
          {dirty.size > 0 && isAdmin && <button onClick={save} className="px-3 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl">Enregistrer les e-mails ({dirty.size})</button>}
          <button disabled={!isAdmin || count === 0 || sending} onClick={send}
            className="px-5 py-2 text-sm font-black bg-blue-600 text-white rounded-xl disabled:opacity-40">
            {sending ? 'Envoi…' : `Envoyer (${count})`}
          </button>
        </div>
      </div>

      {!isAdmin && <p className="text-xs text-slate-500">L'enregistrement des e-mails et l'envoi sont réservés aux administrateurs.</p>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">{error}</div>}

      {results && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
          <h3 className="font-black text-sm text-slate-700">Résultat de l'envoi</h3>
          {results.map((r, i) => (
            <div key={i} className={`text-xs ${r.status === 'envoyé' ? 'text-emerald-700' : r.status === 'ignoré' ? 'text-amber-600' : 'text-red-600'}`}>
              {r.status === 'envoyé' ? '✓' : r.status === 'ignoré' ? '–' : '✗'} <b>{r.label}</b> {r.to && `→ ${r.to}`} {r.detail && `(${r.detail})`}
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <th className="px-4 py-3 w-10"></th>
              <th className="px-2 py-3">Direction{mode === 'service' ? ' / Services' : ''}</th>
              <th className="px-2 py-3 text-center">ENT</th>
              <th className="px-2 py-3 text-center">SOR</th>
              <th className="px-2 py-3">Directeur / Responsable</th>
              <th className="px-2 py-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={allAssistChecked} onChange={toggleAllAssistants} disabled={withAssistantAvail.length === 0} />
                  Assistant(e) de direction <span className="normal-case font-medium">(option, tout cocher)</span>
                </label>
              </th>
              <th className="px-2 py-3">PDF</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="p-8 text-center text-slate-400 text-sm">Chargement des statistiques…</td></tr>}
            {!loading && visibleTree.map(d => {
              const r = { key: dKey(d.name), ...eff(dKey(d.name)) };
              return (
                <DirectionRows key={d.name}>
                  <tr className="border-t border-slate-100 bg-blue-50/40 align-top">
                    <td className="px-4 py-2"><input type="checkbox" checked={selDirs.has(d.name)} onChange={() => toggleDir(d)} /></td>
                    <td className="px-2 py-2">
                      <div className="text-sm font-black text-slate-800">{d.name}</div>
                      {d.dga && <div className="text-[10px] text-slate-400 italic">{d.dga}</div>}
                      {r.hubLabel && <div className="text-[9px] text-emerald-600">Hub : {r.hubLabel}</div>}
                    </td>
                    <td className="px-2 py-2 text-center font-bold text-blue-700">{d.countEnt}</td>
                    <td className="px-2 py-2 text-center font-bold text-amber-700">{d.countSor}</td>
                    <td className="px-2 py-2">
                      <PersonField name={r.name} email={r.email} placeholder="directeur" onChange={(name, email) => patch(r.key, { name, email, assistantName: r.assistantName, assistantEmail: r.assistantEmail })} />
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2 items-start">
                        <input type="checkbox" title="Inclure l'assistant(e) en copie" checked={withAssistant.has(d.name)} onChange={() => toggle(withAssistant, setWithAssistant, d.name)} className="mt-2" />
                        <PersonField name={r.assistantName} email={r.assistantEmail} placeholder="assistant(e)" onChange={(assistantName, assistantEmail) => patch(r.key, { name: r.name, email: r.email, assistantName, assistantEmail })} />
                      </div>
                    </td>
                    <td className="px-2 py-2"><a href={pdfUrl(d.name)} target="_blank" className="text-[11px] font-bold text-blue-600 hover:underline">Aperçu</a></td>
                  </tr>
                  {mode === 'service' && d.services.map(s => {
                    const sk = sKey(d.name, s.name);
                    const sr = { key: sk, ...eff(sk) };
                    return (
                      <tr key={sk} className="border-t border-slate-50 align-top">
                        <td className="px-4 py-2 text-right"><input type="checkbox" checked={selSvcs.has(sk)} onChange={() => toggle(selSvcs, setSelSvcs, sk)} /></td>
                        <td className="px-2 py-2 pl-8 text-[12px] font-semibold text-slate-600">{s.name}{sr.hubLabel && <div className="text-[9px] font-normal text-emerald-600">Hub : {sr.hubLabel}</div>}</td>
                        <td className="px-2 py-2 text-center text-blue-600/80">{s.countEnt}</td>
                        <td className="px-2 py-2 text-center text-amber-600/80">{s.countSor}</td>
                        <td className="px-2 py-2">
                          <PersonField name={sr.name} email={sr.email} placeholder="responsable" onChange={(name, email) => patch(sk, { name, email })} />
                        </td>
                        <td></td>
                        <td className="px-2 py-2"><a href={pdfUrl(d.name, s.name)} target="_blank" className="text-[11px] font-bold text-blue-600 hover:underline">Aperçu</a></td>
                      </tr>
                    );
                  })}
                </DirectionRows>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Fragment nommé pour regrouper les lignes d'une direction
function DirectionRows({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
