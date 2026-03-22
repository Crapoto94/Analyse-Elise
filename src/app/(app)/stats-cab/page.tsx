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
      const res = await fetch(`/api/stats/cabinet-v2?${params}`);
      const json = await res.json();
      setData(json);
      if (json.availableYears) setAvailableYears(json.availableYears);

      // Update hierarchy options when filters change
      const hParams = new URLSearchParams({
         year: String(year),
         month: month,
         status: status,
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

  useEffect(() => {
    fetchData();
  }, [year, month, status, poleFilter, dgaFilter, dirFilter, serviceFilter]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const { entrants, assignments, averageDelay } = data;

  // Evolution data for chart (Monthly or Daily)
  const isMonthly = !month || month === 'all';
  const monthlyData = (data?.entrants?.byMonth || []).map((entry: any, i: number) => {
    const total = (entry.courriers || 0) + (entry.courriels || 0);
    if (isMonthly) {
      return {
        name: new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(2000, i)),
        count: total,
        courriers: entry.courriers,
        courriels: entry.courriels
      };
    } else {
      // Vue Mensuelle : On affiche le jour avec le mois (ex: 12/03)
      const daySuffix = month.padStart(2, '0');
      return {
        name: `${(i + 1).toString().padStart(2, '0')}/${daySuffix}`,
        count: total,
        courriers: entry.courriers,
        courriels: entry.courriels
      };
    }
  });

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
              <div className="flex items-center gap-2 mt-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight text-nowrap">Tableau de Bord Cabinet</h1>
                <span className="text-[9px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-black uppercase tracking-widest animate-pulse">LIVE ODATA 🚀</span>
              </div>
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
                    {(availableYears.length > 0 ? availableYears.sort((a,b) => b-a) : Array.from({length: new Date().getFullYear() - 2015 + 2}, (_, i) => 2015 + i).sort((a,b) => b-a)).map(y => (
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

      {/* Primary KPIs */}
      <div className="flex gap-4 w-full">
        <CompactStatsCard title="Total Enregistrés" value={entrants?.total || 0} icon="📊" color="blue" />
        <CompactStatsCard title="Courriers (Papier)" value={entrants?.paperCount || 0} icon="📄" color="amber" />
        <CompactStatsCard title="Courriels (Mail)" value={entrants?.mailCount || 0} icon="📧" color="green" />
        <CompactStatsCard title="Sans Réponse" value={entrants?.noResponseCount || 0} icon="⚠️" color="red" />
        <CompactStatsCard title="Délai de Réponse" value={`${Math.round(averageDelay || 0)} j`} icon="⏱️" color="indigo" />
      </div>


      {/* SLA Section - DUAL separated Closed vs Active */}
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <span className="w-1 h-5 bg-red-500 rounded-full"></span> Respect des Délais (SLA 30j / DRH 60j)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Closed docs */}
          {(() => {
            const c = entrants?.deadlines?.closed || { within30: 0, within60: 0, exceeded: 0 };
            const successC = (c.within30 || 0) + (c.within60 || 0);
            const totalC = successC + (c.exceeded || 0);
            const ratioC = totalC > 0 ? Math.round((successC / totalC) * 100) : 0;
            return (
              <div className="p-6 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 space-y-4">
                <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Dossiers Clôturés</p>
                <div className="flex gap-4">
                  <div className="flex-1 flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <span className="text-green-600 font-black text-xl">✓</span>
                    <div>
                      <p className="text-[9px] font-bold text-green-600 uppercase tracking-widest">Dans les temps</p>
                      <p className="text-2xl font-black text-green-700 dark:text-green-300">{successC}</p>
                    </div>
                  </div>
                  <div className="flex-1 flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                    <span className="text-red-600 font-black text-xl">!</span>
                    <div>
                      <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest">Dépassé</p>
                      <p className="text-2xl font-black text-red-700 dark:text-red-300">{c.exceeded || 0}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Taux de succès</span>
                    <span className="text-xs font-black text-gray-900 dark:text-white">{ratioC}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 h-2 rounded-full overflow-hidden">
                    <div className="bg-green-500 h-full transition-all duration-1000" style={{ width: `${ratioC}%` }}></div>
                  </div>
                  <p className="text-[8px] text-gray-400 mt-1 text-right">Sur {totalC} dossiers clôturés</p>
                </div>
              </div>
            );
          })()}
          {/* Active docs */}
          {(() => {
            const a = entrants?.deadlines?.active || { within30: 0, within60: 0, exceeded: 0 };
            const successA = (a.within30 || 0) + (a.within60 || 0);
            const totalA = successA + (a.exceeded || 0);
            const ratioA = totalA > 0 ? Math.round((successA / totalA) * 100) : 0;
            return (
              <div className="p-6 rounded-2xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 space-y-4">
                <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Dossiers En Cours ⏳</p>
                <div className="flex gap-4">
                  <div className="flex-1 flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <span className="text-green-600 font-black text-xl">✓</span>
                    <div>
                      <p className="text-[9px] font-bold text-green-600 uppercase tracking-widest">Dans les temps</p>
                      <p className="text-2xl font-black text-green-700 dark:text-green-300">{successA}</p>
                    </div>
                  </div>
                  <div className="flex-1 flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                    <span className="text-orange-600 font-black text-xl">⚠</span>
                    <div>
                      <p className="text-[9px] font-bold text-orange-600 uppercase tracking-widest">Dépassé</p>
                      <p className="text-2xl font-black text-orange-700 dark:text-orange-300">{a.exceeded || 0}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Dans les temps</span>
                    <span className="text-xs font-black text-gray-900 dark:text-white">{ratioA}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-400 h-full transition-all duration-1000" style={{ width: `${ratioA}%` }}></div>
                  </div>
                  <p className="text-[8px] text-gray-400 mt-1 text-right">Sur {totalA} dossiers en cours</p>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

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
                          {svc.service || '(Affectations directes)'}
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



    </div>
  );
}
