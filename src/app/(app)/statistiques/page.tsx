'use client';

import { useEffect, useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

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
    monthlyEvolution: [],
  });
  
  const [loading, setLoading] = useState(true);
  const [docCountsById, setDocCountsById] = useState<Record<number, number>>({});
  const [dataSource, setDataSource] = useState<'local' | 'odata'>('local');

  // Load data source choice
  useEffect(() => {
    const updateSource = () => {
      const saved = localStorage.getItem('data_source') as 'local' | 'odata';
      if (saved) setDataSource(saved);
    };
    updateSource();
    window.addEventListener('dataSourceChanged', updateSource);
    return () => window.removeEventListener('dataSourceChanged', updateSource);
  }, []);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2018 + 1 }, (_, i) => 2018 + i).filter(y => y !== 2019);

  // 1. Initial Load: Fetch Hierarchy and Mail Counts
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/hierarchy?year=${yearFilter}`);
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
  }, [yearFilter, dataSource]); // Re-init on dataSource change

  // Handle cascading filters
  useEffect(() => {
    updateHierarchyOptions();
    fetchData();
  }, [poleFilter, dgaFilter, dirFilter, serviceFilter, monthFilter, statusFilter, dataSource]);

  const fetchMailCounts = async (year: number) => {
    try {
      const params = new URLSearchParams({ year: year.toString(), source: dataSource });
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
      const params = new URLSearchParams({ year: yearFilter.toString() });
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
        status: statusFilter,
        source: dataSource
      });
      
      const res = await fetch(`/api/stats?${params}`);
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);

      setStats({
        totalTasks: data.totalTasks,
        totalDocs: data.totalDocs,
        monthlyEvolution: data.monthlyEvolution
      });
    } catch (e) {
      console.error("Fetch data error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            Stats généraux
            {dataSource === 'odata' ? (
              <span className="text-xs bg-amber-100 text-amber-600 px-2 py-1 rounded-full uppercase tracking-tighter animate-pulse">LIVE 🚀</span>
            ) : (
              <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-1 rounded-full uppercase tracking-tighter">LOCAL ⚡</span>
            )}
          </h1>
          <p className="text-slate-500">Exploration globale des courriers par structure</p>
        </div>
        <div className="flex gap-3 items-center">
          <select 
            value={yearFilter} 
            onChange={(e) => setYearFilter(Number(e.target.value))}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <select 
            value={monthFilter} 
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
          >
            <option value="all">Toute l'année</option>
            {monthNames.map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>

          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium text-amber-600"
          >
            <option value="all">Tout statut</option>
            {statuses.map(s => (
              <option key={s.id} value={s.id}>{s.name || 'Sans nom'}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
        <FilterSelect label="Pôle" value={poleFilter} onChange={(v: string) => { setPoleFilter(v); setDgaFilter('all'); setDirFilter('all'); setServiceFilter('all'); }} options={poles} />
        <FilterSelect label="DGA / Adjoint" value={dgaFilter} onChange={(v: string) => { setDgaFilter(v); setDirFilter('all'); setServiceFilter('all'); }} options={dgas} disabled={poleFilter === 'all'} />
        <FilterSelect label="Direction" value={dirFilter} onChange={(v: string) => { setDirFilter(v); setServiceFilter('all'); }} options={directions} disabled={dgaFilter === 'all'} />
        <FilterSelect label="Service" value={serviceFilter} onChange={setServiceFilter} options={services} disabled={dirFilter === 'all'} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard title="Courriers Assignés" value={stats.totalDocs} icon="📄" color="blue" />
        <StatsCard title="Total Tâches reçues" value={stats.totalTasks} icon="📥" color="indigo" />
        <StatsCard title="Répartition par entité (Tâches)" value={Object.values(docCountsById).reduce((a, b) => a + b, 0)} icon="👥" color="emerald" />
      </div>

      {/* Main Chart */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-[400px]">
        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
          <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
          Évolution mensuelle
        </h3>
        <ResponsiveContainer width="100%" height="85%">
          <AreaChart data={stats.monthlyEvolution}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
            <Tooltip 
              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
            />
            <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, disabled }: any) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{label}</label>
      <select 
        disabled={disabled}
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50 transition-all font-medium"
      >
        <option value="all">Tous les {label.toLowerCase()}s</option>
        {options.map((opt: any) => (
          <option key={opt.name} value={opt.name}>
            {opt.name} ({opt.count.toLocaleString()})
          </option>
        ))}
      </select>
    </div>
  );
}

function StatsCard({ title, value, icon, color }: any) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-400 font-medium">{title}</p>
        <p className="text-2xl font-bold text-slate-900">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}
