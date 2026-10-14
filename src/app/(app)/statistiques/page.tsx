'use client';

import { useEffect, useState } from 'react';
import { Inbox, FileText, Landmark, CircleHelp, Info } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { PageHeader } from '@/components/ui';

const nf = (n: number) => (n || 0).toLocaleString('fr-FR');

export default function StatistiquesPage() {
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [poleFilter, setPoleFilter] = useState('all');
  const [dgaFilter, setDgaFilter] = useState('all');
  const [dirFilter, setDirFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

  const [poles, setPoles] = useState<{name: string, count: number}[]>([]);
  const [dgas, setDgas] = useState<{name: string, count: number}[]>([]);
  const [directions, setDirections] = useState<{name: string, count: number}[]>([]);
  const [services, setServices] = useState<{name: string, count: number}[]>([]);
  const [statuses, setStatuses] = useState<{id: number, name: string}[]>([]);

  const [stats, setStats] = useState<any>({
    totalTasks: 0,
    totalDocs: 0,
    totalMuni: 0,
    totalUnassigned: 0,
    monthlyEvolution: [],
  });

  const [loading, setLoading] = useState(true);
  const [docCountsById, setDocCountsById] = useState<Record<number, number>>({});

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2020 + 1 }, (_, i) => 2020 + i);

  // 1. Initial Load: Fetch Hierarchy and Mail Counts
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/hierarchy?year=${yearFilter}&month=${monthFilter}&status=${statusFilter}&taskTypeId=114`);
        const json = await res.json();
        setPoles(json.poles || []);

        await fetchMailCounts(yearFilter);
        await fetchData();
      } catch (e) {
        console.error("Init error:", e);
      } finally {
        setLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearFilter]);

  // Handle cascading filters
  useEffect(() => {
    updateHierarchyOptions();
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poleFilter, dgaFilter, dirFilter, serviceFilter, monthFilter, statusFilter]);

  const fetchMailCounts = async (year: number) => {
    try {
      const params = new URLSearchParams({ year: year.toString() });
      const res = await fetch(`/api/stats-tasks?${params}`);
      const json = await res.json();
      if (json.counts) {
        setDocCountsById(json.counts);
      }
    } catch (e) {
      console.error("Counts error:", e);
    }
  };

  const updateHierarchyOptions = async () => {
    try {
      const params = new URLSearchParams({
        year: yearFilter.toString(),
        month: monthFilter,
        status: statusFilter,
        taskTypeId: '114'
      });
      if (poleFilter !== 'all') params.set('pole', poleFilter);
      if (dgaFilter !== 'all') params.set('dga', dgaFilter);
      if (dirFilter !== 'all') params.set('dir', dirFilter);

      const res = await fetch(`/api/hierarchy?${params}`);
      const json = await res.json();

      if (poleFilter !== 'all') setDgas(json.dgas || []);
      if (dgaFilter !== 'all') setDirections(json.directions || []);
      if (dirFilter !== 'all') setServices(json.services || []);
      if (json.statuses) setStatuses(json.statuses);
    } catch (e) {
      console.error('Hierarchy error:', e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        year: yearFilter.toString(),
        pole: poleFilter,
        dga: dgaFilter,
        dir: dirFilter,
        service: serviceFilter,
        month: monthFilter,
        status: statusFilter
      });

      const res = await fetch(`/api/stats?${params}`);
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      setStats({
        totalDocs: data.totalDocs,
        totalAssigned: data.totalAssigned,
        totalMuni: data.totalMuni,
        totalUnassigned: data.totalUnassigned,
        monthlyEvolution: data.monthlyEvolution,
        assignedIds: data.assignedIds,
        unassignedIds: data.unassignedIds,
        muniIds: data.muniIds
      });
    } catch (e) {
      console.error("Fetch data error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page animate-fade-in">
      <PageHeader
        title="Stats généraux"
        subtitle="Exploration globale des courriers par structure."
        actions={
          <>
            <select value={yearFilter} onChange={(e) => setYearFilter(Number(e.target.value))} className="select !w-auto" aria-label="Année">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="select !w-auto" aria-label="Mois">
              <option value="all">Toute l&apos;année</option>
              {monthNames.map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select !w-auto" aria-label="Statut">
              <option value="all">Tous les statuts</option>
              {statuses.map(s => <option key={s.id} value={s.id}>{s.name || 'Sans nom'}</option>)}
            </select>
          </>
        }
      />

      {/* Filtres */}
      <div className="card card-pad grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FilterSelect label="Pôle" value={poleFilter} onChange={(v: string) => { setPoleFilter(v); setDgaFilter('all'); setDirFilter('all'); setServiceFilter('all'); }} options={poles} />
        <FilterSelect label="DGA / Adjoint" value={dgaFilter} onChange={(v: string) => { setDgaFilter(v); setDirFilter('all'); setServiceFilter('all'); }} options={dgas} disabled={poleFilter === 'all'} />
        <FilterSelect label="Direction" value={dirFilter} onChange={(v: string) => { setDirFilter(v); setServiceFilter('all'); }} options={directions} disabled={dgaFilter === 'all'} />
        <FilterSelect label="Service" value={serviceFilter} onChange={setServiceFilter} options={services} disabled={dirFilter === 'all'} />
      </div>

      {/* Indicateurs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          [0, 1, 2, 3].map(i => <div key={i} className="skeleton h-[108px]" />)
        ) : (
          <>
            <Kpi label="Total entrants" value={stats.totalDocs} icon={Inbox} />
            <Kpi label="Courriers assignés" value={stats.totalAssigned || 0} icon={FileText} identifiers={stats.assignedIds} />
            <Kpi label="Courriers Muni" value={stats.totalMuni} icon={Landmark} identifiers={stats.muniIds} />
            <Kpi label="Non attribués" value={stats.totalUnassigned} icon={CircleHelp} identifiers={stats.unassignedIds} />
          </>
        )}
      </div>

      {/* Graphique */}
      <section className="card card-pad">
        <h2 className="text-lg font-semibold">
          {monthFilter === 'all' ? 'Évolution annuelle' : 'Évolution quotidienne'}
        </h2>
        <p className="mb-5 mt-0.5 text-sm" style={{ color: 'var(--ink-3)' }}>Courriers entrants selon le support : papier ou e-mail.</p>
        <div style={{ height: 340 }}>
          {loading ? (
            <div className="skeleton h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthlyEvolution} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6e9ee" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#7c8aa0', fontSize: 12 }} dy={8} interval={0} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#7c8aa0', fontSize: 12 }} width={40} />
                <Tooltip
                  cursor={{ fill: 'rgba(31,94,234,0.05)' }}
                  contentStyle={{ borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface)', boxShadow: 'var(--shadow-md)', fontSize: 13, padding: '8px 12px' }}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 13, paddingBottom: 8 }} />
                <Bar dataKey="courriels" name="E-mails" stackId="a" fill="#d98a1a" />
                <Bar dataKey="courriers" name="Papier, fax…" stackId="a" fill="#1f5eea" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
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

function Kpi({ label, value, icon: Icon, identifiers }: { label: string; value: number; icon: React.ComponentType<{ size?: number }>; identifiers?: string[] }) {
  const tooltipText = identifiers && identifiers.length > 0
    ? `Détail (${identifiers.length}) :\n${identifiers.join('\n')}`
    : undefined;

  return (
    <div className="kpi flex items-start justify-between gap-4" title={tooltipText}>
      <div className="min-w-0">
        <p className="kpi-label">{label}</p>
        <p className="kpi-value">{nf(value)}</p>
        {tooltipText && (
          <p className="kpi-foot flex items-center gap-1"><Info size={12} /> Survolez pour la liste</p>
        )}
      </div>
      <span className="kpi-icon"><Icon size={18} /></span>
    </div>
  );
}
