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
  const [type, setType] = useState('all');
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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          year: String(year),
          type,
          month,
          status,
          pole: poleFilter,
          dga: dgaFilter,
          dir: dirFilter,
          service: serviceFilter
        });
        const res = await fetch(`/api/stats/cabinet-v2?${params}`);
        const json = await res.json();
        setData(json);
        if (json.availableYears) setAvailableYears(json.availableYears);

        // Update hierarchy options when filters change
        const hParams = new URLSearchParams({
           year: String(year),
           pole: poleFilter,
           dga: dgaFilter,
           dir: dirFilter
        });
        const hRes = await fetch(`/api/hierarchy?${hParams}`);
        const hJson = await hRes.json();
        
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
    fetchData();
  }, [year, type, month, status, poleFilter, dgaFilter, dirFilter, serviceFilter]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const { entrants, assignments, averageDelay } = data;

  // Monthly data for chart
  const monthlyData = (entrants?.byMonth || []).map((count: number, i: number) => ({
    name: new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(2000, i)),
    count
  }));

  // Nature data for chart
  const natureData = Object.entries(entrants?.byNature || {}).map(([name, value]) => ({ name, value: value as number }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Group assignments by Direction
  const groupedAssignments = (assignments || []).reduce((acc: any, curr: any) => {
    const dirKey = curr.direction || 'Pôle DGS (Transverse)';
    if (!acc[dirKey]) {
      acc[dirKey] = {
        name: dirKey,
        dga: curr.dga,
        total: 0,
        services: []
      };
    }
    acc[dirKey].services.push(curr);
    acc[dirKey].total += curr.count;
    return acc;
  }, {});

  const sortedDirections = Object.values(groupedAssignments).sort((a: any, b: any) => b.total - a.total);

  const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 pb-20">
      {/* Sticky Header for Filters */}
      <div className="sticky top-0 z-50 -mx-6 px-6 py-4 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 mb-8">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Tableau de Bord Cabinet</h1>
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">{year} • Filtres Actifs</p>
            </div>
            
            <div className="flex flex-col items-end gap-3">
               {/* Year Selector Dropdown */}
               <div className="flex items-center gap-2">
                  <select
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value))}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-xs font-black text-blue-600 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
                  >
                    <option value={0}>Toutes les années</option>
                    {(availableYears.length > 0 ? availableYears.sort((a,b) => b-a) : [2026, 2025, 2024]).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>

                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-xs font-black text-amber-600 outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-sm"
                  >
                    <option value="all">Tout statut</option>
                    {availableStatuses.map(s => (
                      <option key={s.id} value={String(s.id)}>{s.name || 'Sans nom'}</option>
                    ))}
                  </select>

                  <select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-xs font-black text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm"
                  >
                    <option value="all">Tout mois</option>
                    {monthNames.map((name, i) => (
                      <option key={i + 1} value={String(i + 1)}>{name}</option>
                    ))}
                  </select>
               </div>

               {/* Classification Toggle */}
               <div className="flex bg-white dark:bg-gray-800 p-1 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                  <button 
                    onClick={() => setType('muni')}
                    className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${type === 'muni' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-50'}`}
                  >
                    Muni
                  </button>
                  <button 
                    onClick={() => setType('all')}
                    className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${type === 'all' ? 'bg-gray-900 text-white dark:bg-white dark:text-black' : 'text-gray-400 hover:bg-gray-50'}`}
                  >
                    Tout
                  </button>
                  <button 
                    onClick={() => setType('courant')}
                    className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${type === 'courant' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-50'}`}
                  >
                    Courant
                  </button>
               </div>
            </div>
          </div>

          {/* Hierarchy Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select 
              value={poleFilter}
              onChange={(e) => { setPoleFilter(e.target.value); setDgaFilter('all'); setDirFilter('all'); setServiceFilter('all'); }}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-[10px] font-bold text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            >
              <option value="all">Tous les pôles</option>
              {poles.map(p => <option key={p.name} value={p.name}>{p.name} ({p.count})</option>)}
            </select>

            <select 
              value={dgaFilter}
              onChange={(e) => { setDgaFilter(e.target.value); setDirFilter('all'); setServiceFilter('all'); }}
              disabled={poleFilter === 'all'}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-[10px] font-bold text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm disabled:opacity-30"
            >
              <option value="all">Tous les dga / adjoints</option>
              {dgas.map(d => <option key={d.name} value={d.name}>{d.name} ({d.count})</option>)}
            </select>

            <select 
              value={dirFilter}
              onChange={(e) => { setDirFilter(e.target.value); setServiceFilter('all'); }}
              disabled={dgaFilter === 'all'}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-[10px] font-bold text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-pink-500 shadow-sm disabled:opacity-30"
            >
              <option value="all">Tous les directions</option>
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
      </div>

      {/* Support Evolution Chart */}
      <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-1">Évolution des Flux</h3>
            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Transitions Papier vs Digital</h2>
          </div>
          <div className="flex gap-4">
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Papier</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Courriel / Mail</span>
             </div>
          </div>
        </div>
        <div className="h-[300px] w-full">
           <ResponsiveContainer width="100%" height="100%">
             <AreaChart data={data?.bySupportEvolution || []}>
               <defs>
                 <linearGradient id="colorPapier" x1="0" y1="0" x2="0" y2="1">
                   <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                   <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                 </linearGradient>
                 <linearGradient id="colorMail" x1="0" y1="0" x2="0" y2="1">
                   <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                   <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                 </linearGradient>
               </defs>
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
               <Area type="monotone" dataKey="papier" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorPapier)" />
               <Area type="monotone" dataKey="mail" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorMail)" />
             </AreaChart>
           </ResponsiveContainer>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="flex gap-4 w-full">
        <CompactStatsCard title="Total Enregistrés" value={entrants?.total || 0} icon="📊" color="blue" />
        <CompactStatsCard title="Courriers (Papier)" value={entrants?.paperCount || 0} icon="📄" color="amber" />
        <CompactStatsCard title="Courriels (Mail)" value={entrants?.mailCount || 0} icon="📧" color="green" />
        <CompactStatsCard title="Sans Réponse" value={entrants?.noResponseCount || 0} icon="⚠️" color="red" />
        <CompactStatsCard title="Délai de Réponse" value={`${Math.round(averageDelay || 0)} j`} icon="⏱️" color="indigo" />
      </div>

      {/* Secondary KPIs: Muni vs Courant + Shared */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center flex flex-col justify-center">
            <p className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">Municipalité</p>
            <h3 className="text-5xl font-black text-blue-700 dark:text-blue-200">{entrants?.muniCount || 0}</h3>
            <p className="text-xs text-gray-400 mt-2 italic font-medium">Cabinet & Élus</p>
        </div>

        <div className="bg-blue-600 text-white p-8 rounded-2xl shadow-xl shadow-blue-200 dark:shadow-none flex flex-col justify-center items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
               <span className="text-8xl font-black tracking-tighter">DUAL</span>
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] mb-3 opacity-90">Assignations Communes</p>
            <h3 className="text-6xl font-black mb-2">{entrants?.sharedCount || 0}</h3>
            <p className="text-sm font-medium opacity-80 text-center">Documents attribués à la fois en Muni et en Courant</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center flex flex-col justify-center">
            <p className="text-sm font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-2">Courant</p>
            <h3 className="text-5xl font-black text-indigo-600 dark:text-indigo-200">{entrants?.courantCount || 0}</h3>
            <p className="text-xs text-gray-400 mt-2 italic font-medium">Administration & DGS</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Evolution */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold mb-8 text-gray-800 dark:text-white flex items-center gap-2">
            <span className="w-1 h-5 bg-blue-600 rounded-full"></span> Évolution Flux Mensuel
          </h2>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Nature Distribution */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
             <span className="w-1 h-5 bg-amber-500 rounded-full"></span> Top Thématiques (Nature)
          </h2>
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={natureData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {natureData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend layout="horizontal" align="center" verticalAlign="bottom" iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Assignments Detail Hierarchical */}
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <span className="w-1 h-5 bg-green-500 rounded-full"></span> Attribution par Direction / Service (Pôle DGS)
          </h2>
          <span className="px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-black rounded-full uppercase tracking-widest">Hiérarchie Pôle</span>
        </div>
        
        <div className="space-y-6">
          {sortedDirections.map((dir: any, idx: number) => (
            <div key={idx} className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden bg-gray-50/30 dark:bg-gray-900/10">
              <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 flex justify-between items-center border-b border-gray-100 dark:border-gray-700">
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{dir.name}</h3>
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{dir.dga || 'Direction Générale'}</p>
                </div>
                <div className="bg-white dark:bg-gray-700 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm">
                   <span className="text-sm font-black text-gray-900 dark:text-white">{dir.total}</span>
                   <span className="text-[10px] text-gray-400 ml-1">docs</span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {dir.services.map((svc: any, sIdx: number) => (
                  <div key={sIdx} className="flex items-center gap-4 px-2">
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 italic">
                          {svc.service || 'Service Inconnu'}
                        </span>
                        <span className="text-xs font-black text-gray-900 dark:text-white">{svc.count}</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-blue-400 h-full rounded-full transition-all duration-1000" 
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

      {/* SLA Deadlines Section */}
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-2">
          <span className="w-1 h-5 bg-red-500 rounded-full"></span> Respect des Délais (SLA 30j / DRH 60j)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-4 p-5 rounded-2xl bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30">
            <div className="p-3 bg-green-100 dark:bg-green-800/50 rounded-xl text-green-600 dark:text-green-400 font-black text-xl shadow-sm">✓</div>
            <div>
              <p className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-widest mb-1">Dans les temps</p>
              <p className="text-2xl font-black text-green-700 dark:text-green-300">
                {(entrants?.deadlines?.within30 || 0) + (entrants?.deadlines?.within60 || 0)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-5 rounded-2xl bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
            <div className="p-3 bg-red-100 dark:bg-red-800/50 rounded-xl text-red-600 dark:text-red-400 font-black text-xl shadow-sm">!</div>
            <div>
              <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-widest mb-1">Dépassé</p>
              <p className="text-2xl font-black text-red-700 dark:text-green-300">{entrants?.deadlines?.exceeded || 0}</p>
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 flex flex-col justify-center">
             <div className="flex justify-between mb-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Taux de succès</span>
                <span className="text-sm font-black text-gray-900 dark:text-white">
                   {entrants?.total > 0 ? Math.round((( (entrants.deadlines?.within30 || 0) + (entrants.deadlines?.within60 || 0) ) / entrants.total) * 100) : 0}%
                </span>
             </div>
             <div className="w-full bg-gray-200 dark:bg-gray-600 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-green-500 h-full transition-all duration-1000 shadow-[0_0_10px_rgba(34,197,94,0.3)]" 
                  style={{ width: `${entrants?.total > 0 ? (((entrants.deadlines?.within30 || 0) + (entrants.deadlines?.within60 || 0)) / entrants.total) * 100 : 0}%` }}
                ></div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
