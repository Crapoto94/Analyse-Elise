'use client';

import React, { useState, useEffect } from 'react';
import { Inbox, Building2, TriangleAlert, Timer, CheckCircle2, XCircle, Hourglass, AlertCircle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { PageHeader, LoadingBlock } from '@/components/ui';

const COLORS = ['#1f5eea', '#0e9f8e', '#d98a1a', '#7a5af8', '#e0559f', '#64748b', '#c93131', '#3aa7e8', '#8bb82f', '#a16207'];
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const nf = (n: number) => (n || 0).toLocaleString('fr-FR');

const tooltipStyle = {
  borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface)',
  boxShadow: 'var(--shadow-md)', fontSize: 13, padding: '8px 12px',
};
const axisTick = { fontSize: 12, fill: '#7c8aa0' };

/** Indicateur principal. */
function Kpi({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon: React.ComponentType<{ size?: number }> }) {
  return (
    <div className="kpi flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="kpi-label">{label}</p>
        <p className="kpi-value">{value}</p>
      </div>
      <span className="kpi-icon"><Icon size={18} /></span>
    </div>
  );
}

/** Mini-indicateur de la section SLA. */
function SlaTile({ label, value, icon: Icon, tone }: { label: string; value: number; icon: React.ComponentType<{ size?: number }>; tone: 'ok' | 'danger' | 'warn' }) {
  const c = { ok: ['var(--ok)', 'var(--ok-soft)'], danger: ['var(--danger)', 'var(--danger-soft)'], warn: ['var(--warn)', 'var(--warn-soft)'] }[tone];
  return (
    <div className="flex flex-1 items-center gap-3 rounded-[12px] p-4" style={{ border: '1px solid var(--line)', background: 'var(--surface)' }}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px]" style={{ color: c[0], background: c[1] }}><Icon size={18} /></span>
      <div className="min-w-0">
        <p className="text-xs" style={{ color: 'var(--ink-3)' }}>{label}</p>
        <p className="num text-xl font-semibold leading-tight">{nf(value)}</p>
      </div>
    </div>
  );
}

function Progress({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--surface-sunken)' }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
    </div>
  );
}

export default function StatsCabinetPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState('all');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [availableStatuses, setAvailableStatuses] = useState<{id: number, name: string}[]>([]);

  // Hierarchy Filters State
  const [poleFilter, setPoleFilter] = useState('all');
  const [dgaFilter, setDgaFilter] = useState('all');
  const [dirFilter, setDirFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');

  const [poles, setPoles] = useState<{name: string, count: number}[]>([]);
  const [dgas, setDgas] = useState<{name: string, count: number}[]>([]);
  const [directions, setDirections] = useState<{name: string, count: number}[]>([]);
  const [services, setServices] = useState<{name: string, count: number}[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        year: String(year),
        month,
        status,
        pole: poleFilter,
        dga: dgaFilter,
        dir: dirFilter,
        service: serviceFilter
      });
      const hParams = new URLSearchParams({
         year: String(year),
         month: month,
         status: status,
         pole: poleFilter,
         dga: dgaFilter,
         dir: dirFilter,
         taskTypeId: '114'
      });

      const [res, hRes] = await Promise.all([
        fetch(`/api/stats/cabinet-v2?${params}`),
        fetch(`/api/hierarchy?${hParams}`)
      ]);

      const [json, hJson] = await Promise.all([
        res.json(),
        hRes.json()
      ]);

      setData(json);
      if (json.availableYears) setAvailableYears(json.availableYears);

      if (hJson.statuses) setAvailableStatuses(hJson.statuses);
      setPoles(hJson.poles || []);
      setDgas(hJson.dgas || []);
      setDirections(hJson.directions || []);
      setServices(hJson.services || []);

    } catch (error) {
      console.error('Error fetching cabinet stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, status, poleFilter, dgaFilter, dirFilter, serviceFilter]);

  if (loading && !data) return <LoadingBlock label="Chargement des statistiques…" />;

  const monthlyData = data?.monthlyEvolution || [];
  const natureData = data?.byNature || [];

  const currentYear = new Date().getFullYear();
  const allYears = Array.from({ length: currentYear - 2020 + 1 }, (_, i) => 2020 + i);

  const byDga = data?.byDga || [];
  const byDirection = data?.byDirection || [];
  const byService = data?.byService || [];

  // Group pre-aggregated data by DGA then Direction
  const hierData: Record<string, any> = {};

  byDga.forEach((d: any) => {
    hierData[d.name] = { name: d.name, total: d.total, totalUnclosed: d.unclosed, directions: {} };
  });

  byDirection.forEach((d: any) => {
    if (hierData[d.dga]) {
      hierData[d.dga].directions[d.name] = {
        name: d.name,
        total: d.total,
        unclosedCount: d.unclosed,
        services: []
      };
    }
  });

  byService.forEach((s: any) => {
    if (hierData[s.dga] && hierData[s.dga].directions[s.dir]) {
      hierData[s.dga].directions[s.dir].services.push({
        service: s.name,
        count: s.total,
        activeCount: s.unclosed
      });
    }
  });

  // Sort services within each direction
  Object.values(hierData).forEach((dga: any) => {
     Object.values(dga.directions).forEach((dir: any) => {
        dir.services.sort((a: any, b: any) => b.count - a.count);
     });
  });

  const sortedDgas = Object.values(hierData).sort((a, b) => b.total - a.total);

  const closedWithin = data?.sla?.closed?.within || 0;
  const closedExceeded = data?.sla?.closed?.exceeded || 0;
  const activeWithin = data?.sla?.active?.within || 0;
  const activeExceeded = data?.sla?.active?.exceeded || 0;
  const pct = (a: number, b: number) => (a + b > 0 ? (a / (a + b)) * 100 : 0);

  return (
    <div className="page animate-fade-in">
      <PageHeader
        title="Statistiques cabinet"
        subtitle="Performance de traitement et flux entrants."
        actions={
          <>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="select !w-auto" aria-label="Année">
              {allYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={month} onChange={(e) => setMonth(e.target.value)} className="select !w-auto" aria-label="Mois">
              <option value="all">Année complète</option>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="select !w-auto" aria-label="Statut">
              <option value="all">Tous les statuts</option>
              {availableStatuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </>
        }
      />

      {/* Filtres hiérarchiques */}
      <div className="card card-pad grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FilterSelect
          label="Pôle"
          value={poleFilter}
          onChange={(v: string) => { setPoleFilter(v); setDgaFilter('all'); setDirFilter('all'); setServiceFilter('all'); }}
          options={poles}
        />
        <FilterSelect
          label="DGA / Adjoint"
          value={dgaFilter}
          onChange={(v: string) => { setDgaFilter(v); setDirFilter('all'); setServiceFilter('all'); }}
          options={dgas}
          disabled={poleFilter === 'all'}
        />
        <FilterSelect
          label="Direction"
          value={dirFilter}
          onChange={(v: string) => { setDirFilter(v); setServiceFilter('all'); }}
          options={directions}
          disabled={dgaFilter === 'all'}
        />
        <FilterSelect
          label="Service"
          value={serviceFilter}
          onChange={setServiceFilter}
          options={services}
          disabled={dirFilter === 'all'}
        />
      </div>

      {/* Indicateurs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Total entrants" value={nf(data?.totalDocs || 0)} icon={Inbox} />
        <Kpi label="Dont dossiers Muni" value={nf(data?.totalMuni || 0)} icon={Building2} />
        <Kpi label="Non attribués" value={nf(data?.totalUnassigned || 0)} icon={TriangleAlert} />
        <Kpi label="Délai moyen" value={`${data?.avgDelay || 0} j`} icon={Timer} />
      </div>

      {/* Respect des délais */}
      <section className="card card-pad">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Respect des délais</h2>
            <p className="mt-0.5 text-sm" style={{ color: 'var(--ink-3)' }}>Seuils : 30 jours en standard, 60 jours pour la DRH.</p>
          </div>
          <span className="badge badge-ok">Temps réel</span>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-medium"><span className="h-2 w-2 rounded-full" style={{ background: 'var(--brand)' }} /> Dossiers clôturés</h3>
            <div className="flex gap-3">
              <SlaTile label="Dans les temps" value={closedWithin} icon={CheckCircle2} tone="ok" />
              <SlaTile label="Hors délais" value={closedExceeded} icon={XCircle} tone="danger" />
            </div>
            <Progress pct={pct(closedWithin, closedExceeded)} color="var(--brand)" />
            <p className="text-xs" style={{ color: 'var(--ink-3)' }}>{Math.round(pct(closedWithin, closedExceeded))} % clôturés dans les délais</p>
          </div>
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-medium"><span className="h-2 w-2 rounded-full" style={{ background: '#d98a1a' }} /> En cours de traitement</h3>
            <div className="flex gap-3">
              <SlaTile label="Dans les délais" value={activeWithin} icon={Hourglass} tone="warn" />
              <SlaTile label="En retard" value={activeExceeded} icon={AlertCircle} tone="danger" />
            </div>
            <Progress pct={pct(activeWithin, activeExceeded)} color="#d98a1a" />
            <p className="text-xs" style={{ color: 'var(--ink-3)' }}>{Math.round(pct(activeWithin, activeExceeded))} % encore dans les délais</p>
          </div>
        </div>
      </section>

      {/* Papier vs numérique */}
      <section className="card card-pad">
        <h2 className="text-lg font-semibold">Papier et numérique</h2>
        <p className="mb-5 mt-0.5 text-sm" style={{ color: 'var(--ink-3)' }}>Évolution mensuelle des entrants selon le support.</p>
        <div className="w-full" style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} barCategoryGap="28%">
              <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 13, paddingBottom: 8 }} />
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6e9ee" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={axisTick} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={axisTick} width={40} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(31,94,234,0.05)' }} />
              <Bar dataKey="courriels" name="E-mail" stackId="a" fill="#d98a1a" />
              <Bar dataKey="courriers" name="Papier" stackId="a" fill="#1f5eea" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Typologie */}
      <section className="card card-pad">
        <h2 className="text-lg font-semibold">Typologie des dossiers</h2>
        <p className="mb-2 mt-0.5 text-sm" style={{ color: 'var(--ink-3)' }}>Les 10 types les plus fréquents.</p>
        <div style={{ height: 360 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={natureData} cx="40%" cy="50%" innerRadius={78} outerRadius={128} paddingAngle={3} dataKey="value" stroke="var(--surface)" strokeWidth={2}>
                {natureData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 13, lineHeight: '24px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Attribution par direction / service */}
      <section className="card card-pad">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Attribution par direction et service</h2>
            <p className="mt-0.5 text-sm" style={{ color: 'var(--ink-3)' }}>
              Somme des affectations enfants et directes. Entre parenthèses : dossiers non clôturés. Unité : dossier unique.
            </p>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-sm" style={{ color: 'var(--ink-3)' }}>Filtrer :</span>
          <select
            value={dgaFilter}
            onChange={(e) => { setDgaFilter(e.target.value); setDirFilter('all'); setServiceFilter('all'); }}
            className="select !w-auto"
          >
            <option value="all">Toutes les DGA</option>
            {dgas.map(d => <option key={d.name} value={d.name}>{d.name} ({d.count})</option>)}
          </select>
          <select
            value={dirFilter}
            onChange={(e) => { setDirFilter(e.target.value); setServiceFilter('all'); }}
            disabled={dgaFilter === 'all'}
            className="select !w-auto"
          >
            <option value="all">Toutes les directions</option>
            {directions.map(d => <option key={d.name} value={d.name}>{d.name} ({d.count})</option>)}
          </select>
          <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} disabled={dirFilter === 'all'} className="select !w-auto">
            <option value="all">Tous les services</option>
            {services.map(s => <option key={s.name} value={s.name}>{s.name} ({s.count})</option>)}
          </select>
        </div>

        <div className="space-y-8">
          {sortedDgas.map((dga: any, pIdx: number) => (
            <div key={pIdx} className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="h-5 w-1 rounded-full" style={{ background: 'var(--brand)' }} />
                <h3 className="text-[15px] font-semibold">{dga.name}</h3>
                <span className="h-px flex-1" style={{ background: 'var(--line)' }} />
                <span className="badge badge-brand num">{nf(dga.total)}</span>
                {dga.totalUnclosed > 0 && <span className="badge badge-danger num">{nf(dga.totalUnclosed)} en cours</span>}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {Object.values(dga.directions).sort((a: any, b: any) => b.total - a.total).map((dir: any, idx: number) => (
                  <div key={idx} className="flex h-full flex-col overflow-hidden rounded-[12px]" style={{ border: '1px solid var(--line)' }}>
                    <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ background: 'var(--surface-muted)', borderBottom: '1px solid var(--line)' }}>
                      <h4 className="text-[13px] font-semibold leading-tight">{dir.name}</h4>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="num text-sm font-semibold">{nf(dir.total)}</span>
                        {dir.unclosedCount > 0 && <span className="num text-xs font-medium" style={{ color: 'var(--danger)' }}>({nf(dir.unclosedCount)})</span>}
                      </div>
                    </div>
                    <div className="flex-1 space-y-3 p-4">
                      {dir.services.map((svc: any, sIdx: number) => (
                        <div key={sIdx}>
                          <div className="mb-1 flex items-center justify-between gap-3">
                            <span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>{svc.service || '(Affectations directes)'}</span>
                            <span className="num flex items-center gap-1 text-[13px] font-medium">
                              {nf(svc.count)}
                              {svc.activeCount > 0 && <span className="text-xs" style={{ color: 'var(--danger)' }}>({nf(svc.activeCount)})</span>}
                            </span>
                          </div>
                          <Progress pct={dir.total ? (svc.count / dir.total) * 100 : 0} color="var(--brand)" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, disabled }: any) {
  return (
    <div>
      <label className="label">{label}</label>
      <select disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)} className="select">
        <option value="all">Tous les {label.toLowerCase()}s</option>
        {options.map((opt: any) => (
          <option key={opt.name} value={opt.name}>
            {opt.name} ({(opt.countEnt || 0).toLocaleString('fr-FR')})
          </option>
        ))}
      </select>
    </div>
  );
}
