'use client';

import { useEffect, useMemo, useState } from 'react';
import { Send, Search, FileText, Check, Minus, X, AlertTriangle } from 'lucide-react';
import { PageHeader, LoadingBlock, EmptyState, Field } from '@/components/ui';

type Recipient = { key: string; name?: string; email?: string; assistantName?: string; assistantEmail?: string };
type Svc = { name: string; countEnt: number; countSor: number };
type Dir = { name: string; dga?: string; countEnt: number; countSor: number; services: Svc[] };
type Sug = { name?: string; email?: string; assistantName?: string; assistantEmail?: string; hubLabel?: string };
type Result = { label: string; to?: string; status: string; detail?: string };

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const dKey = (d: string) => `D|${d}`;
const sKey = (d: string, s: string) => `S|${d}|${s}`;
const nf = (n: number) => (n || 0).toLocaleString('fr-FR');

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
    <div className="relative min-w-[230px] space-y-1.5">
      <div className="relative">
        <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-3)' }} />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder={`Chercher ${placeholder}`}
          className="input !py-1.5 !pl-8 !text-[13px]"
          aria-label={`Rechercher ${placeholder}`}
        />
      </div>
      {(hits.length > 0 || busy) && (
        <div className="card absolute left-0 top-9 z-30 max-h-60 w-80 overflow-auto p-1 shadow-[var(--shadow-md)]">
          {busy && <div className="p-2 text-xs" style={{ color: 'var(--ink-3)' }}>Recherche…</div>}
          {hits.map((h, i) => (
            <button key={i} type="button" className="block w-full rounded-[8px] px-2.5 py-2 text-left transition-colors hover:bg-[var(--surface-sunken)]"
              onClick={() => { onChange(h.nom, h.email); setQ(''); setHits([]); }}>
              <div className="text-[13px] font-medium">{h.nom} <span className="font-normal" style={{ color: 'var(--ink-3)' }}>{h.email}</span></div>
              <div className="truncate text-xs" style={{ color: 'var(--ink-3)' }}>{h.fonction} · {h.direction}</div>
            </button>
          ))}
        </div>
      )}
      <input
        value={email || ''}
        onChange={e => onChange(name || '', e.target.value)}
        placeholder="adresse e-mail"
        className="input !py-1.5 !text-[13px]"
        aria-label={`E-mail ${placeholder}`}
      />
      {name && <p className="truncate text-xs" style={{ color: 'var(--ink-3)' }}>{name}</p>}
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
    if (!res.ok) { setError(j.error || 'Erreur'); return false; }
    setDirty(new Set());
    return true;
  };

  const send = async () => {
    if (dirty.size > 0 && !(await save())) return;
    const items: any[] = [];
    selDirs.forEach(d => items.push({ kind: 'direction', dir: d, includeAssistant: withAssistant.has(d) }));
    if (mode === 'service') {
      selSvcs.forEach(k => { const [, dir, service] = k.split('|'); items.push({ kind: 'service', dir, service }); });
    }
    const target = testTo.trim() ? `l'adresse de TEST ${testTo.trim()}` : `${items.length} destinataire(s) réel(s)`;
    if (!confirm(`Envoyer ${items.length} PDF (${MONTHS[month - 1]} ${year}) vers ${target} ?`)) return;
    setSending(true); setResults(null); setError('');
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

  const resultIcon = (s: string) => s === 'envoyé' ? <Check size={14} /> : s === 'ignoré' ? <Minus size={14} /> : <X size={14} />;
  const resultColor = (s: string) => s === 'envoyé' ? 'var(--ok)' : s === 'ignoré' ? 'var(--warn)' : 'var(--danger)';

  return (
    <div className="page animate-fade-in pb-28">
      <PageHeader
        title="Envoi des statistiques"
        subtitle="Envoi à la demande du tableau Entrants / Sortants, en PDF, aux directeurs, responsables de service et assistantes de direction."
      />

      {hubError && (
        <div className="alert alert-warn flex items-start gap-2.5">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>Hub DSI injoignable ({hubError}) : seuls les e-mails saisis ici sont utilisés.</span>
        </div>
      )}

      {/* Paramètres de l'envoi */}
      <div className="card card-pad grid items-end gap-5 md:grid-cols-2 xl:grid-cols-[auto_auto_1fr_1fr_1fr]">
        <Field label="Envoyer aux">
          <div className="seg">
            <button className="seg-item" data-active={mode === 'direction'} onClick={() => setMode('direction')}>Directions</button>
            <button className="seg-item" data-active={mode === 'service'} onClick={() => setMode('service')}>Directions + services</button>
          </div>
        </Field>
        <Field label="Période (du 1er au dernier jour du mois)">
          <div className="flex gap-2">
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className="select" aria-label="Mois">
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="select !w-auto" aria-label="Année">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </Field>
        <Field label="Filtrer la liste">
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Direction ou service…" className="input" />
        </Field>
        <Field label="Copie (Cc) de chaque mail" hint="Plusieurs adresses possibles, séparées par une virgule.">
          <input value={ccAll} onChange={e => setCcAll(e.target.value)} placeholder="adresse@ivry94.fr" className="input" />
        </Field>
        <Field label="Mode test" hint="Tous les PDF partent vers cette seule adresse.">
          <input value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="votre@adresse.fr"
            className="input" style={testTo ? { background: 'var(--warn-soft)', borderColor: '#f3dfb9' } : undefined} />
        </Field>
      </div>

      {!isAdmin && <p className="text-sm" style={{ color: 'var(--ink-3)' }}>L&apos;enregistrement des e-mails et l&apos;envoi sont réservés aux administrateurs.</p>}
      {error && <div className="alert alert-danger" role="alert">{error}</div>}

      {results && (
        <section className="card card-pad">
          <h2 className="mb-3 text-base font-semibold">Résultat de l&apos;envoi</h2>
          <ul className="space-y-1.5">
            {results.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5" style={{ color: resultColor(r.status) }}>{resultIcon(r.status)}</span>
                <span><span className="font-medium">{r.label}</span>{r.to && <span style={{ color: 'var(--ink-3)' }}> → {r.to}</span>}{r.detail && <span style={{ color: resultColor(r.status) }}> ({r.detail})</span>}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Liste */}
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 px-5 py-3" style={{ borderBottom: '1px solid var(--line)', background: 'var(--surface-muted)' }}>
          <button onClick={() => selectAll(true)} className="btn btn-secondary btn-sm">Tout cocher</button>
          <button onClick={() => selectAll(false)} className="btn btn-secondary btn-sm">Tout décocher</button>
          <button onClick={toggleAllAssistants} disabled={withAssistantAvail.length === 0} className="btn btn-secondary btn-sm">
            {allAssistChecked ? 'Décocher' : 'Cocher'} les assistantes ({withAssistantAvail.length})
          </button>
          <span className="ml-auto text-sm" style={{ color: 'var(--ink-3)' }}>{visibleTree.length} directions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="tbl min-w-[1000px]">
            <thead>
              <tr>
                <th className="w-10"></th>
                <th>Direction{mode === 'service' ? ' et services' : ''}</th>
                <th className="text-center">Entrants</th>
                <th className="text-center">Sortants</th>
                <th>Directeur / responsable</th>
                <th>Assistante de direction <span className="font-normal">(en copie, option)</span></th>
                <th>PDF</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7}><LoadingBlock label="Chargement des statistiques…" /></td></tr>}
              {!loading && visibleTree.length === 0 && (
                <tr><td colSpan={7}><EmptyState title="Aucune direction" hint="Aucune donnée pour cette période ou ce filtre." /></td></tr>
              )}
              {!loading && visibleTree.map(d => {
                const r = { key: dKey(d.name), ...eff(dKey(d.name)) };
                return (
                  <DirectionRows key={d.name}>
                    <tr className="align-top" style={{ background: selDirs.has(d.name) ? 'var(--brand-soft)' : undefined }}>
                      <td><input type="checkbox" checked={selDirs.has(d.name)} onChange={() => toggleDir(d)} aria-label={`Sélectionner ${d.name}`} /></td>
                      <td>
                        <div className="text-sm font-semibold">{d.name}</div>
                        {d.dga && <div className="text-xs" style={{ color: 'var(--ink-3)' }}>{d.dga}</div>}
                        {r.hubLabel && <span className="badge badge-ok mt-1 !text-[10px]">Hub : {r.hubLabel}</span>}
                      </td>
                      <td className="num text-center font-semibold" style={{ color: 'var(--brand-ink)' }}>{nf(d.countEnt)}</td>
                      <td className="num text-center font-semibold" style={{ color: 'var(--warn)' }}>{nf(d.countSor)}</td>
                      <td>
                        <PersonField name={r.name} email={r.email} placeholder="le directeur" onChange={(name, email) => patch(r.key, { name, email, assistantName: r.assistantName, assistantEmail: r.assistantEmail })} />
                      </td>
                      <td>
                        <div className="flex items-start gap-2.5">
                          <input type="checkbox" title="Mettre l'assistante en copie" aria-label="Mettre l'assistante en copie" checked={withAssistant.has(d.name)} onChange={() => toggle(withAssistant, setWithAssistant, d.name)} className="mt-2.5" />
                          <PersonField name={r.assistantName} email={r.assistantEmail} placeholder="l'assistante" onChange={(assistantName, assistantEmail) => patch(r.key, { name: r.name, email: r.email, assistantName, assistantEmail })} />
                        </div>
                      </td>
                      <td>
                        <a href={pdfUrl(d.name)} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm"><FileText size={14} /> Aperçu</a>
                      </td>
                    </tr>
                    {mode === 'service' && d.services.map(s => {
                      const sk = sKey(d.name, s.name);
                      const sr = { key: sk, ...eff(sk) };
                      return (
                        <tr key={sk} className="align-top" style={{ background: selSvcs.has(sk) ? 'var(--brand-soft)' : 'var(--surface-muted)' }}>
                          <td className="text-right"><input type="checkbox" checked={selSvcs.has(sk)} onChange={() => toggle(selSvcs, setSelSvcs, sk)} aria-label={`Sélectionner ${s.name}`} /></td>
                          <td className="!pl-8">
                            <div className="text-[13px] font-medium" style={{ color: 'var(--ink-2)' }}>{s.name}</div>
                            {sr.hubLabel && <span className="badge badge-ok mt-1 !text-[10px]">Hub : {sr.hubLabel}</span>}
                          </td>
                          <td className="num text-center" style={{ color: 'var(--brand-ink)' }}>{nf(s.countEnt)}</td>
                          <td className="num text-center" style={{ color: 'var(--warn)' }}>{nf(s.countSor)}</td>
                          <td><PersonField name={sr.name} email={sr.email} placeholder="le responsable" onChange={(name, email) => patch(sk, { name, email })} /></td>
                          <td></td>
                          <td><a href={pdfUrl(d.name, s.name)} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm"><FileText size={14} /> Aperçu</a></td>
                        </tr>
                      );
                    })}
                  </DirectionRows>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Barre d'action */}
      <div
        className="fixed bottom-0 right-0 z-30 flex items-center justify-between gap-4 px-8 py-3 backdrop-blur"
        style={{ left: 'var(--sidebar-w)', background: 'rgba(255,255,255,0.92)', borderTop: '1px solid var(--line)' }}
      >
        <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
          <span className="num font-semibold">{count}</span> sélectionné{count > 1 ? 's' : ''}
          {testTo.trim() && <span className="badge badge-warn ml-2">Mode test : {testTo.trim()}</span>}
          {dirty.size > 0 && <span className="ml-3" style={{ color: 'var(--ink-3)' }}>{dirty.size} e-mail{dirty.size > 1 ? 's' : ''} modifié{dirty.size > 1 ? 's' : ''}</span>}
        </p>
        <div className="flex items-center gap-2">
          {dirty.size > 0 && isAdmin && <button onClick={save} className="btn btn-secondary">Enregistrer les e-mails</button>}
          <button disabled={!isAdmin || count === 0 || sending} onClick={send} className="btn btn-primary">
            <Send size={15} /> {sending ? 'Envoi en cours…' : `Envoyer (${count})`}
          </button>
        </div>
      </div>
    </div>
  );
}

// Fragment nommé pour regrouper les lignes d'une direction
function DirectionRows({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
