'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface Task {
  id: number;
  number: number;
  date: string;
  assignedTo: string;
  type: string;
  state: string;
}

interface Courrier {
  id: number;
  identifier: string;
  createdDate: string;
  type: string;
  direction: string;
  tasks: Task[];
}

export default function CourriersExplorer() {
  const [courriers, setCourriers] = useState<Courrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState('2026');
  const [search, setSearch] = useState('');
  const [expandedDoc, setExpandedDoc] = useState<number | null>(null);

  const fetchCourriers = useCallback(async (currentYear: string, searchTerm: string) => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        year: currentYear,
        limit: '30',
        ...(searchTerm && { search: searchTerm })
      });
      const res = await fetch(`/api/explorer/courriers?${query.toString()}`);
      const data = await res.json();
      setCourriers(data.courriers || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCourriers(year, search);
    }, 400); // Debounce search
    return () => clearTimeout(timer);
  }, [year, search, fetchCourriers]);

  const toggleDoc = (id: number) => {
    setExpandedDoc(expandedDoc === id ? null : id);
  };

  const formatDate = (dateStr: string, compact = false) => {
    const d = new Date(dateStr);
    if (compact) {
      return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(d);
    }
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header & Filters */}
        <header className="sticky top-0 z-30 bg-slate-50/80 dark:bg-gray-950/80 backdrop-blur-md pb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                <span className="p-2 bg-blue-600 text-white rounded-lg text-sm">📨</span>
                Explorateur <span className="text-blue-600">Courriers</span>
              </h1>
            </div>
            <div className="flex items-center gap-2 bg-white dark:bg-gray-900 p-1.5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
               {[2026, 2025, 2024].map((y) => (
                 <button
                   key={y}
                   onClick={() => setYear(y.toString())}
                   className={`px-4 py-1.5 rounded-lg font-bold text-xs transition-all ${
                     year === y.toString()
                       ? 'bg-blue-600 text-white'
                       : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                   }`}
                 >
                   {y}
                 </button>
               ))}
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher par N° Chrono (ex: ENT-2026...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-5 py-3.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl shadow-blue-500/5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {loading && <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>}
              <span className="text-gray-300">🔍</span>
            </div>
          </div>
        </header>

        {/* Results List - Concentrated View */}
        {loading && courriers.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Chargement...</p>
          </div>
        ) : courriers.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-16 text-center border border-gray-100 dark:border-gray-800 shadow-sm">
            <span className="text-4xl mb-4 block">📂</span>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Aucun résultat trouvé</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/20 dark:shadow-none overflow-hidden">
             <div className="grid grid-cols-12 px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <div className="col-span-4 md:col-span-3">Identifiant</div>
                <div className="hidden md:block col-span-2">Type</div>
                <div className="col-span-4 md:col-span-3">Date Création</div>
                <div className="col-span-2 text-center">Tâches</div>
                <div className="col-span-2 md:col-span-2 text-right">Action</div>
             </div>

             <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
               {courriers.map((doc) => (
                 <React.Fragment key={doc.id}>
                    <div 
                      onClick={() => toggleDoc(doc.id)}
                      className={`grid grid-cols-12 px-6 py-4 items-center cursor-pointer transition-colors hover:bg-blue-50/30 dark:hover:bg-blue-900/10 ${expandedDoc === doc.id ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                    >
                      <div className="col-span-4 md:col-span-3">
                      <div className="font-black text-gray-900 dark:text-gray-100 text-sm tracking-tight">{doc.identifier}</div>
                      <div className="text-[10px] font-bold text-blue-600 truncate max-w-[150px]">{doc.direction}</div>
                    </div>
                      <div className="hidden md:block col-span-2">
                         <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[9px] font-black text-gray-500 uppercase tracking-tighter">
                           {doc.type}
                         </span>
                      </div>
                      <div className="col-span-4 md:col-span-3 text-xs font-bold text-gray-400">
                        {formatDate(doc.createdDate, true)}
                      </div>
                      <div className="col-span-2 text-center">
                         <span className={`inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-lg text-xs font-black ${doc.tasks.length > 0 ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-gray-100 text-gray-300 dark:bg-gray-800'}`}>
                           {doc.tasks.length}
                         </span>
                      </div>
                      <div className="col-span-2 md:col-span-2 text-right">
                         <div className={`inline-block transition-transform duration-300 ${expandedDoc === doc.id ? 'rotate-180 text-blue-600' : 'text-gray-300'}`}>
                           ▼
                         </div>
                      </div>
                    </div>

                    {expandedDoc === doc.id && (
                      <div className="col-span-12 bg-gray-50/30 dark:bg-gray-900/40 border-y border-blue-100/30 dark:border-blue-900/20 px-12 py-6 animate-in fade-in slide-in-from-top-1 duration-300">
                         {doc.tasks.length === 0 ? (
                           <p className="text-[11px] font-bold text-gray-400 italic">Aucune tâche associée.</p>
                         ) : (
                           <div className="space-y-3 relative before:absolute before:left-[-1.5rem] before:top-2 before:bottom-2 before:w-0.5 before:bg-blue-200 dark:before:bg-blue-900/40">
                             {doc.tasks.map((task, tidx) => (
                               <div key={task.id} className="relative">
                                  <div className="absolute -left-[1.85rem] top-2 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-white dark:ring-gray-950"></div>
                                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                                     <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5 whitespace-nowrap">
                                          #{tidx + 1}
                                          <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                          {task.type}
                                        </span>
                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${
                                          task.state === 'Terminée' ? 'bg-green-100 text-green-700' :
                                          task.state === 'Refusée' ? 'bg-red-100 text-red-700' :
                                          task.state === 'Démarrée' || task.state === 'Demandée' ? 'bg-blue-100 text-blue-700' :
                                          'bg-gray-100 text-gray-500'
                                        }`}>
                                          {task.state}
                                        </span>
                                        <p className="text-xs font-black text-gray-700 dark:text-gray-300 truncate">
                                          {task.assignedTo}
                                        </p>
                                     </div>
                                     <div className="text-[9px] font-bold text-gray-400 italic shrink-0">
                                        Assignée le {formatDate(task.date)}
                                     </div>
                                  </div>
                               </div>
                             ))}
                           </div>
                         )}
                      </div>
                    )}
                 </React.Fragment>
               ))}
             </div>
          </div>
        )}

        <footer className="mt-10 pb-10 text-center">
           <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">
             Affichage des 30 derniers résultats
           </p>
        </footer>
      </div>
    </div>
  );
}
