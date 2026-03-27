'use client';

import { useState, useEffect } from 'react';

interface CourrierStats {
  date: string;
  courriels: {
    total: number;
    supprimes: number;
    enregistres: number;
    courant: number;
    municipalite: number;
    ids?: string[];
    courant_ids?: string[];
    municipalite_ids?: string[];
  };
  papiers: {
    total: number;
    enregistres: number;
    courant: number;
    municipalite: number;
    non_enregistres: number;
    ids?: string[];
    courant_ids?: string[];
    municipalite_ids?: string[];
  };
  total_recus: number;
  total_enregistres: number;
}

export default function StatsCourrierPage() {
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [month, setMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [data, setData] = useState<CourrierStats[] | null>(null);
  const [loading, setLoading] = useState(true);

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());
  const monthNames = [
    { value: '1', label: 'Janvier' },
    { value: '2', label: 'Février' },
    { value: '3', label: 'Mars' },
    { value: '4', label: 'Avril' },
    { value: '5', label: 'Mai' },
    { value: '6', label: 'Juin' },
    { value: '7', label: 'Juillet' },
    { value: '8', label: 'Août' },
    { value: '9', label: 'Septembre' },
    { value: '10', label: 'Octobre' },
    { value: '11', label: 'Novembre' },
    { value: '12', label: 'Décembre' },
  ];

  useEffect(() => {
    fetchData();
  }, [year, month]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stats/courrier?year=${year}&month=${month}`);
      if (!res.ok) {
        throw new Error(`API Error: ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    if (!data) return null;
    return data.reduce((acc, day) => ({
      courriels: {
        total: acc.courriels.total + day.courriels.total,
        supprimes: acc.courriels.supprimes + day.courriels.supprimes,
        courant: acc.courriels.courant + day.courriels.courant,
        municipalite: acc.courriels.municipalite + day.courriels.municipalite,
        enregistres: acc.courriels.enregistres + day.courriels.enregistres,
      },
      papiers: {
        total: acc.papiers.total + day.papiers.total,
        courant: acc.papiers.courant + day.papiers.courant,
        municipalite: acc.papiers.municipalite + day.papiers.municipalite,
        enregistres: acc.papiers.enregistres + day.papiers.enregistres,
        non_enregistres: acc.papiers.non_enregistres + (day.papiers.total - day.papiers.enregistres),
      },
      total_recus: acc.total_recus + day.total_recus,
      total_enregistres: acc.total_enregistres + day.total_enregistres,
    }), {
      courriels: { total: 0, supprimes: 0, courant: 0, municipalite: 0, enregistres: 0 },
      papiers: { total: 0, courant: 0, municipalite: 0, enregistres: 0, non_enregistres: 0 },
      total_recus: 0, total_enregistres: 0
    });
  };

  const totals = calculateTotals();

  return (
    <div className="p-4 max-w-[100vw] mx-auto space-y-6 animate-fade-in">
      <div className="flex justify-between items-end px-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            Stats service courrier - Détail journalier
            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full uppercase tracking-tighter">LIVE 📊</span>
          </h1>
          <p className="text-slate-500 text-sm">Répartition quotidienne des flux entrants</p>
        </div>
        <div className="flex gap-3">
          <select 
            value={year} 
            onChange={(e) => setYear(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium text-xs"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <select 
            value={month} 
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium text-xs"
          >
            {monthNames.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 space-y-6">
          <div className="h-64 bg-slate-50 rounded-xl animate-pulse" />
        </div>
      ) : data && data.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse min-w-[1200px]">
              <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                <tr>
                  <th rowSpan={2} className="p-3 border-r border-slate-700 font-black text-center uppercase tracking-widest w-24">Dates</th>
                  <th colSpan={4} className="p-2 border-b border-r border-slate-700 font-black text-center text-sm uppercase tracking-[0.2em] bg-blue-900/40">Courriels</th>
                  <th colSpan={4} className="p-2 border-b border-r border-slate-700 font-black text-center text-sm uppercase tracking-[0.2em] bg-orange-900/40">Courriers Papier</th>
                  <th colSpan={2} className="p-2 border-b border-slate-700 font-black text-center text-sm uppercase tracking-[0.2em] bg-slate-800">Total</th>
                </tr>
                <tr className="bg-slate-800 text-[10px] uppercase font-bold text-slate-300">
                  <th className="p-2 border-r border-slate-700">Total Reçus</th>
                  <th className="p-2 border-r border-slate-700">Supprimés</th>
                  <th className="p-2 border-r border-slate-700 italic">Enr. Courant</th>
                  <th className="p-2 border-r border-slate-700 italic">Enr. Muni</th>
                  <th className="p-2 border-r border-slate-700">Total Reçus</th>
                  <th className="p-2 border-r border-slate-700 italic">Enr. Courant</th>
                  <th className="p-2 border-r border-slate-700 italic">Enr. Muni</th>
                  <th className="p-2 border-r border-slate-700">Non Enr.</th>
                  <th className="p-2 border-r border-slate-700 bg-slate-700">Recus</th>
                  <th className="p-2 bg-slate-700">Enregistrés</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((day) => {
                  const dayDate = new Date(day.date);
                  const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
                  const hasData = day.total_recus > 0;
                  
                  return (
                    <tr key={day.date} className={`${isWeekend ? 'bg-slate-50/50' : ''} ${hasData ? 'hover:bg-blue-50/30' : ''} transition-colors`}>
                      <td className={`p-2 border-r border-slate-100 font-bold text-center ${isWeekend ? 'text-slate-400' : 'text-slate-600'}`}>
                        {dayDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </td>
                      {/* Courriels */}
                      <td className="p-2 border-r border-slate-100 text-center font-bold text-slate-900 bg-blue-50/10" title={day.courriels.ids?.join('\n')}>
                        {day.courriels.total || '-'}
                      </td>
                      <td className="p-2 border-r border-slate-100 text-center text-slate-400 italic">
                        {day.courriels.supprimes || '-'}
                      </td>
                      <td className="p-2 border-r border-slate-100 text-center font-medium text-blue-700" title={day.courriels.courant_ids?.join('\n')}>
                        {day.courriels.courant || '-'}
                      </td>
                      <td className="p-2 border-r border-slate-100 text-center font-medium text-blue-700" title={day.courriels.municipalite_ids?.join('\n')}>
                        {day.courriels.municipalite || '-'}
                      </td>
                      {/* Papiers */}
                      <td className="p-2 border-r border-slate-100 text-center font-bold text-slate-900 bg-orange-50/10" title={day.papiers.ids?.join('\n')}>
                        {day.papiers.total || '-'}
                      </td>
                      <td className="p-2 border-r border-slate-100 text-center font-medium text-orange-700" title={day.papiers.courant_ids?.join('\n')}>
                        {day.papiers.courant || '-'}
                      </td>
                      <td className="p-2 border-r border-slate-100 text-center font-medium text-orange-700" title={day.papiers.municipalite_ids?.join('\n')}>
                        {day.papiers.municipalite || '-'}
                      </td>
                      <td className={`p-2 border-r border-slate-100 text-center font-bold ${day.papiers.total - day.papiers.enregistres > 0 ? 'text-red-500' : 'text-slate-300'}`}>
                        {day.papiers.total - day.papiers.enregistres || '-'}
                      </td>
                      {/* Totals Daily */}
                      <td className="p-2 border-r border-slate-100 text-center font-black text-slate-800 bg-slate-50/50">
                        {day.total_recus || '-'}
                      </td>
                      <td className="p-2 text-center font-black text-blue-900 bg-blue-50/20">
                        {day.total_enregistres || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {totals && (
                <tfoot className="bg-slate-900 text-white font-black text-xs">
                  <tr>
                    <td className="p-3 border-r border-slate-700 text-center">TOTAUX</td>
                    <td className="p-3 border-r border-slate-700 text-center">{totals.courriels.total.toLocaleString()}</td>
                    <td className="p-3 border-r border-slate-700 text-center text-slate-400">{totals.courriels.supprimes.toLocaleString()}</td>
                    <td className="p-3 border-r border-slate-700 text-center text-blue-300">{totals.courriels.courant.toLocaleString()}</td>
                    <td className="p-3 border-r border-slate-700 text-center text-blue-300">{totals.courriels.municipalite.toLocaleString()}</td>
                    <td className="p-3 border-r border-slate-700 text-center">{totals.papiers.total.toLocaleString()}</td>
                    <td className="p-3 border-r border-slate-700 text-center text-orange-300">{totals.papiers.courant.toLocaleString()}</td>
                    <td className="p-3 border-r border-slate-700 text-center text-orange-300">{totals.papiers.municipalite.toLocaleString()}</td>
                    <td className="p-3 border-r border-slate-700 text-center text-red-400">{totals.papiers.non_enregistres.toLocaleString()}</td>
                    <td className="p-3 border-r border-slate-700 text-center bg-slate-800">{totals.total_recus.toLocaleString()}</td>
                    <td className="p-3 text-center bg-blue-900">{totals.total_enregistres.toLocaleString()}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 p-20 text-center transition-all shadow-sm">
          <span className="text-5xl mb-4 block">🔍</span>
          <p className="text-slate-500 font-bold text-lg">Aucune donnée trouvée pour cette période</p>
          <p className="text-slate-400 text-sm">Veuillez sélectionner une autre année ou un autre mois.</p>
        </div>
      )}
    </div>
  );
}
