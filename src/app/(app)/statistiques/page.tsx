'use client';

import { useEffect, useState } from 'react';
import { getODataClient } from '@/lib/odata';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export default function StatistiquesPage() {
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [poleFilter, setPoleFilter] = useState('all');
  const [dgaFilter, setDgaFilter] = useState('all');
  const [dirFilter, setDirFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');

  const [poles, setPoles] = useState<string[]>([]);
  const [dgas, setDgas] = useState<string[]>([]);
  const [directions, setDirections] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  
  const [stats, setStats] = useState<any>({
    totalDocs: 0,
    monthlyEvolution: [],
  });
  
  const [loading, setLoading] = useState(true);
  const [docCountsById, setDocCountsById] = useState<Record<number, number>>({});
  const [isLocal, setIsLocal] = useState(false);

  const years = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

  // 1. Initial Load: Fetch Hierarchy and Mail Counts
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const client = getODataClient();
      if (!client) return;

      try {
        // Fetch all hierarchy elements of type SERVICE to avoid individuals
        const hierarchyRes = await client.request("DimStructureElementPath?$filter=StructureElementTypeKey eq 'SERVICE'") as any;
        const items = hierarchyRes.value || [];

        const uniquePoles = Array.from(new Set(items.map((i: any) => i.Level2).filter(Boolean))) as string[];
        setPoles(uniquePoles.sort());

        // Fetch mail counts via FactTask for accuracy
        fetchMailCounts(yearFilter);
        fetchData();
      } catch (e) {
        console.error("Init error:", e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [yearFilter]);

  // Handle cascading filters
  useEffect(() => {
    updateHierarchyOptions();
    fetchData();
  }, [poleFilter, dgaFilter, dirFilter, serviceFilter]);

  const fetchMailCounts = async (year: number) => {
    const client = getODataClient();
    if (!client) return;
    try {
      const counts: Record<number, number> = {};
      const startDate = `${year}-01-01T00:00:00Z`;
      const endDate = `${year}-12-31T23:59:59Z`;
      
      // Top 5000 tasks for the year
      const res = await client.request(`FactTask?$select=AssignedToStructureElementId&$filter=Document/CreatedDate ge ${startDate} and Document/CreatedDate le ${endDate}&$top=5000`) as any;
      (res.value || []).forEach((t: any) => {
        const sid = t.AssignedToStructureElementId;
        if (sid) counts[sid] = (counts[sid] || 0) + 1;
      });
      setDocCountsById(counts);
    } catch (e) {
      console.error("Counts error:", e);
    }
  };

  const updateHierarchyOptions = async () => {
    const client = getODataClient();
    if (!client) return;
    
    let filter = "StructureElementTypeKey eq 'SERVICE'";
    if (poleFilter !== 'all') filter += ` and Level2 eq '${poleFilter.replace(/'/g, "''")}'`;
    
    const res = await client.request(`DimStructureElementPath?$filter=${filter}`) as any;
    const items = res.value || [];

    if (poleFilter !== 'all') {
      setDgas(Array.from(new Set(items.map((i: any) => i.Level3).filter(Boolean))).sort() as string[]);
    }
    if (dgaFilter !== 'all') {
      setDirections(Array.from(new Set(items.map((i: any) => i.Level4).filter(Boolean))).sort() as string[]);
    }
    if (dirFilter !== 'all') {
      setServices(Array.from(new Set(items.map((i: any) => i.Level5).filter(Boolean))).sort() as string[]);
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
        service: serviceFilter
      });
      
      const res = await fetch(`/api/stats?${params}`);
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);

      setStats({
        totalDocs: data.totalDocs,
        monthlyEvolution: data.monthlyEvolution
      });
      setIsLocal(data.isLocal || false);
    } catch (e) {
      console.error("Fetch data error:", e);
      // Fallback or error state
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            Stats généraux
            {isLocal && <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-1 rounded-full uppercase tracking-tighter">Locales</span>}
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
        <StatsCard title="Total Courriers (Créés)" value={stats.totalDocs} icon="📄" color="blue" />
        <StatsCard title="Courriers Reçus (Assignés)" value={Object.values(docCountsById).reduce((a, b) => a + b, 0)} icon="📥" color="indigo" />
        <StatsCard title="Mois en cours" value={stats.monthlyEvolution[stats.monthlyEvolution.length - 1]?.value || 0} icon="📅" color="emerald" />
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
        {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
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
