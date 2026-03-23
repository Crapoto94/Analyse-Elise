'use client';

import React, { useState, useEffect } from 'react';
import StatsCard from '../../../components/StatsCard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const CompactStatsCard = ({ title, value, icon, color }: { title: string, value: any, icon: string, color: string }) => {
  const colorMap: any = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center space-y-2 flex-1 min-w-0">
      <div className={`p-2 rounded-xl ${colorMap[color]} text-xl`}>{icon}</div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{title}</p>
        <p className="text-xl font-black text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
};

export default function StatsCabinetPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState('all');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [availableStatuses, setAvailableStatuses] = useState<{id: number, name: string}[]>([]);

  // Hierarchy Filters State
  const [poleFilter, setPoleFilter] = useState('DGS - Direction Générale des Services');
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
         dir: dirFilter
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
  }, [year, month, status, poleFilter, dgaFilter, dirFilter, serviceFilter]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

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

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 pb-32">
      {/* Header & Main Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter italic flex items-center gap-3">
            <span className="w-2 h-10 bg-emerald-500 rounded-full"></span>
            Statistiques Cabinet
          </h1>
          <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">Analyse de la Performance & Flux Entrants</p>
        </div>
        
        <div className="flex flex-wrap gap-3 bg-white/50 dark:bg-gray-800/50 p-2 rounded-2xl border border-gray-100 dark:border-gray-700 backdrop-blur-sm">
          <select 
            value={year} 
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-xs font-black outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
          >
            {allYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <select 
            value={month} 
            onChange={(e) => setMonth(e.target.value)}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-xs font-black outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
          >
            <option value="all">Année complète</option>
            {["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"].map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>

          <select 
            value={status} 
            onChange={(e) => setStatus(e.target.value)}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-xs font-black outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
          >
            <option value="all">Tous les statuts</option>
            {availableStatuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {/* Hierarchical Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-visible">
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

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard title="Total Entrants" value={data?.totalDocs || 0} icon="📩" color="blue" />
        <StatsCard title="Dont dossiers Muni" value={data?.totalMuni || 0} icon="🏢" color="amber" />
        <StatsCard title="Non Attribués" value={data?.totalUnassigned || 0} icon="⚠️" color="red" />
        <StatsCard title="Délai Moyen" value={`${data?.avgDelay || 0} j`} icon="⏱️" color="indigo" />
      </div>

      {/* SLA Section - Full Width */}
      <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Respect des Délais (SLA)</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Seuils : 30j standard / 60j DRH</p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Temps Réel</div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div> Dossiers Clôturés
              </h3>
              <div className="flex gap-4">
                <CompactStatsCard title="Dans les temps" value={data?.sla?.closed?.within || 0} icon="✅" color="blue" />
                <CompactStatsCard title="Hors délais" value={data?.sla?.closed?.exceeded || 0} icon="🔴" color="red" />
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden flex">
                  <div 
                  className="bg-blue-500 h-full" 
                  style={{ width: `${(data?.sla?.closed?.within / (data?.sla?.closed?.within + data?.sla?.closed?.exceeded || 1)) * 100}%` }}
                  />
              </div>
            </div>
            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div> En cours de traitement
              </h3>
              <div className="flex gap-4">
                <CompactStatsCard title="En attente OK" value={data?.sla?.active?.within || 0} icon="⏳" color="amber" />
                <CompactStatsCard title="En retard" value={data?.sla?.active?.exceeded || 0} icon="⚠️" color="red" />
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden flex">
                  <div 
                  className="bg-amber-500 h-full" 
                  style={{ width: `${(data?.sla?.active?.within / (data?.sla?.active?.within + data?.sla?.active?.exceeded || 1)) * 100}%` }}
                  />
              </div>
            </div>
        </div>
      </div>


      {/* Support Evolution Chart */}
      <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Transitions Papier vs Digital</h2>
          </div>
        </div>
        <div className="w-full" style={{ height: '350px' }}>
           <ResponsiveContainer width="100%" height="100%">
             <BarChart data={monthlyData}>
               <Legend verticalAlign="top" align="right" iconType="circle" />
               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
               <XAxis 
                 dataKey="name" 
                 axisLine={false} 
                 tickLine={false} 
                 tick={{fontSize: 10, fontWeight: 900, fill: '#9ca3af'}} 
                 dy={10}
               />
               <YAxis 
                 axisLine={false} 
                 tickLine={false} 
                 tick={{fontSize: 10, fontWeight: 900, fill: '#9ca3af'}} 
               />
               <Tooltip 
                 contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 900, fontSize: '12px' }}
               />
               <Bar dataKey="courriels" name="E-mail" stackId="a" fill="#f59e0b" />
               <Bar dataKey="courriers" name="Papier" stackId="a" fill="#3b82f6" radius={[10, 10, 0, 0]} />
             </BarChart>
           </ResponsiveContainer>
        </div>
      </div>

      {/* Nature Breakdown - Full Width at Bottom */}
      <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-8">Typologie des Dossiers (Top 10)</h2>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={natureData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={140}
                paddingAngle={8}
                dataKey="value"
              >
                {natureData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 900, fontSize: '12px' }}
              />
              <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Assignments Detail Hierarchical - Moved to Bottom */}
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-center mb-2">
           <div>
             <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
               <span className="w-1 h-5 bg-green-500 rounded-full"></span> Attribution par Direction / Service (Pôle DGS)
             </h2>
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 ml-3 italic">Calcul hiérarchique : Somme des affectations enfants + affectations directes</p>
           </div>
           <div className="flex flex-col items-end gap-1">
             <span className="px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-[10px] font-black rounded-full uppercase tracking-widest leading-none">Hiérarchie Pôle</span>
             <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Unité : Dossier Unique</span>
           </div>
        </div>
        
        <div className="flex flex-col gap-4 mb-8">
           <div className="flex flex-wrap gap-3 items-center">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">Filtrer par niveau:</span>
            
            <select 
              value={dgaFilter}
              onChange={(e) => { setDgaFilter(e.target.value); setDirFilter('all'); setServiceFilter('all'); }}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-[10px] font-bold text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
            >
              <option value="all">Toutes les DGA</option>
              {dgas.map(d => <option key={d.name} value={d.name}>{d.name} ({d.count})</option>)}
            </select>

            <select 
              value={dirFilter}
              onChange={(e) => { setDirFilter(e.target.value); setServiceFilter('all'); }}
              disabled={dgaFilter === 'all'}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-[10px] font-bold text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm disabled:opacity-30"
            >
              <option value="all">Toutes les directions</option>
              {directions.map(d => <option key={d.name} value={d.name}>{d.name} ({d.count})</option>)}
            </select>

            <select 
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              disabled={dirFilter === 'all'}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-[10px] font-bold text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm disabled:opacity-30"
            >
              <option value="all">Tous les services</option>
              {services.map(s => <option key={s.name} value={s.name}>{s.name} ({s.count})</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-8">
          {sortedDgas.map((dga: any, pIdx: number) => (
            <div key={pIdx} className="space-y-4">
               <div className="flex items-center gap-3 px-2">
                  <div className="h-6 w-1 rounded-full bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.5)]"></div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">{dga.name}</h3>
                  <div className="flex-1 border-b border-dashed border-gray-200 dark:border-gray-700"></div>
                  <div className="flex gap-2">
                     <span className="text-xs font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full whitespace-nowrap">{dga.total}</span>
                     {dga.totalUnclosed > 0 && (
                        <span className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-full whitespace-nowrap">({dga.totalUnclosed})</span>
                     )}
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.values(dga.directions).sort((a: any, b: any) => b.total - a.total).map((dir: any, idx: number) => (
                    <div key={idx} className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden bg-gray-50/30 dark:bg-gray-900/10 h-full flex flex-col">
                      <div className="bg-gray-50 dark:bg-gray-800/50 px-5 py-3 flex justify-between items-center border-b border-gray-100 dark:border-gray-700">
                        <div>
                          <h4 className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-tight leading-tight">{dir.name}</h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                             <span className="text-[10px] font-black text-gray-700 dark:text-gray-200">{dir.total}</span>
                             {dir.unclosedCount > 0 && (
                                <span className="text-[9px] font-bold text-red-500">({dir.unclosedCount})</span>
                             )}
                          </div>
                        </div>
                        <div className="bg-white dark:bg-gray-700 p-1.5 rounded-lg border border-gray-100 dark:border-gray-600 shadow-sm">
                           <div className="h-4 w-4 rounded-md bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                              <span className="text-[10px] font-black text-blue-600">🏛️</span>
                           </div>
                        </div>
                      </div>
                      <div className="p-4 space-y-3 flex-1">
                        {dir.services.map((svc: any, sIdx: number) => (
                          <div key={sIdx} className="flex items-center gap-3">
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-0.5">
                                <div className="flex items-center gap-2">
                                   <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 italic leading-tight">
                                     {svc.service || '(Affectations directes)'}
                                   </span>
                                </div>
                                <div className="flex items-center gap-1">
                                   <span className="text-[10px] font-black text-gray-900 dark:text-white">{svc.count}</span>
                                   {svc.activeCount > 0 && (
                                      <span className="text-[9px] font-bold text-red-500">({svc.activeCount})</span>
                                   )}
                                </div>
                              </div>
                              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1 overflow-hidden">
                                <div 
                                  className="bg-blue-400 h-full rounded-full" 
                                  style={{ width: `${dir.total ? (svc.count / dir.total) * 100 : 0}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

function FilterSelect({ label, value, onChange, options, disabled }: any) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{label}</label>
      <select 
        disabled={disabled}
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50 transition-all font-bold text-gray-700 dark:text-gray-200"
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
