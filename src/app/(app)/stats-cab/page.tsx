'use client';

import { useEffect, useState } from 'react';
import { getODataClient } from '@/lib/odata';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

export default function StatsCabinetPage() {
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [poleFilter, setPoleFilter] = useState('CABINET DU MAIRE - ADJOINTS');
  const [dgaFilter, setDgaFilter] = useState('all');
  const [dirFilter, setDirFilter] = useState('all');
  
  const [poles, setPoles] = useState<string[]>([]);
  const [dgas, setDgas] = useState<string[]>([]);
  const [directions, setDirections] = useState<string[]>([]);
  
  const [stats, setStats] = useState<any>({
    totalDocs: 0,
    muniCount: 0,
    courantCount: 0,
    monthlyEvolution: [],
  });
  
  const [loading, setLoading] = useState(true);
  const [cabinetMailCount, setCabinetMailCount] = useState(0);
  const [isLocal, setIsLocal] = useState(false);

  const years = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const client = getODataClient();
      if (!client) return;

      try {
        const hierarchyRes = await client.request("DimStructureElementPath?$filter=StructureElementTypeKey eq 'SERVICE'") as any;
        const items = hierarchyRes.value || [];

        const uniquePoles = Array.from(new Set(items.map((i: any) => i.Level2).filter(Boolean))) as string[];
        setPoles(uniquePoles.sort());

        fetchCabinetMailCount(yearFilter);
        fetchData();
      } catch (e) {
        console.error("Init error:", e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [yearFilter]);

  useEffect(() => {
    updateHierarchyOptions();
    fetchData();
  }, [poleFilter, dgaFilter, dirFilter]);


  const fetchCabinetMailCount = async (year: number) => {
    // If we are in local mode, the fetchData will fetch it from /api/stats
    if (isLocal) return;

    const client = getODataClient();
    if (!client) return;
    try {
      const startDate = `${year}-01-01T00:00:00Z`;
      const endDate = `${year}-12-31T23:59:59Z`;
      const res = await client.request(`FactTask?$filter=Document/CreatedDate ge ${startDate} and Document/CreatedDate le ${endDate} and AssignedToStructureElement/DimStructureElementPathIdNavigation/Level2 eq 'CABINET DU MAIRE - ADJOINTS'&$count=true&$top=0`) as any;
      setCabinetMailCount(res['@odata.count'] || 0);
    } catch (e) {
      console.error("Cabinet counts error:", e);
    }
  };

  const updateHierarchyOptions = async () => {
    const client = getODataClient();
    if (!client) return;
    
    let filter = "StructureElementTypeKey eq 'SERVICE'";
    if (poleFilter !== 'all') filter += ` and Level2 eq '${poleFilter.replace(/'/g, "''")}'`;
    
    const res = await client.request(`FactDocument?$count=true&$top=0&$filter=CreatedByStructureElement/DimStructureElementPathIdNavigation/Level2 eq 'CABINET'`) as any; 
    // Simplified: we reuse the hierarchy from init usually.
    const hRes = await client.request(`DimStructureElementPath?$filter=${filter}`) as any;
    const items = hRes.value || [];

    if (poleFilter !== 'all') {
      setDgas(Array.from(new Set(items.map((i: any) => i.Level3).filter(Boolean))).sort() as string[]);
    }
    if (dgaFilter !== 'all') {
      setDirections(Array.from(new Set(items.map((i: any) => i.Level4).filter(Boolean))).sort() as string[]);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        year: yearFilter.toString(),
        pole: poleFilter,
        dga: dgaFilter,
        dir: dirFilter
      });
      
      const res = await fetch(`/api/stats?${params}`);
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);

      setStats({
        totalDocs: data.totalDocs,
        muniCount: data.muniCount,
        courantCount: data.courantCount,
        monthlyEvolution: data.monthlyEvolution
      });
      setIsLocal(data.isLocal || false);
    } catch (e) {
      console.error("Fetch data error:", e);
    } finally {
      setLoading(false);
    }
  };

  const pieData = [
    { name: 'Muni', value: stats.muniCount, color: '#f59e0b' },
    { name: 'Courant', value: stats.courantCount, color: '#3b82f6' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            Stats cabinet
            {isLocal && <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-1 rounded-full uppercase tracking-tighter">Locales</span>}
          </h1>
          <p className="text-slate-500">Analyse spécifique pour le Cabinet du Maire et Adjoints</p>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard title="Total Docs Créés" value={stats.totalDocs} icon="📄" color="blue" />
        <StatsCard title="Courriers Reçus (Pôle)" value={cabinetMailCount} icon="📥" color="indigo" />
        <StatsCard title="Muni vs Courant" value={`${Math.round((stats.muniCount / stats.totalDocs) * 100) || 0}% Muni`} icon="⚖️" color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Evolution Chart */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-[350px]">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
            Évolution
          </h3>
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={stats.monthlyEvolution}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Muni vs Courant Chart */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-[350px]">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-2 h-6 bg-amber-500 rounded-full"></span>
            Répartition Muni vs Courant
          </h3>
          <div className="flex items-center h-[80%]">
            <ResponsiveContainer width="60%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-4">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: d.color}}></div>
                  <span className="text-sm font-bold text-slate-700">{d.name}</span>
                  <span className="text-sm text-slate-400">{d.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
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
        <option value="all">Tous</option>
        {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

function StatsCard({ title, value, icon, color }: any) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-400 font-medium">{title}</p>
        <p className="text-2xl font-bold text-slate-900">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      </div>
    </div>
  );
}
