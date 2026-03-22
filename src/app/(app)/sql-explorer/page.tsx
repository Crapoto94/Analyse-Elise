'use client';

import { useEffect, useState } from 'react';
import { 
  Database, 
  Search, 
  ChevronRight, 
  RefreshCw, 
  Table as TableIcon,
  Columns,
  Hash,
  Terminal
} from 'lucide-react';

export default function SqlExplorerPage() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [columns, setColumns] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [indexes, setIndexes] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [loadingTables, setLoadingTables] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    setLoadingTables(true);
    try {
      const res = await fetch('/api/sql-explorer');
      const json = await res.json();
      setTables(json.tables || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTables(false);
    }
  };

  const fetchTableData = async (table: string) => {
    setLoading(true);
    setSelectedTable(table);
    setData([]);
    setColumns([]);
    try {
      const res = await fetch(`/api/sql-explorer?table=${table}&limit=200`);
      const json = await res.json();
      setColumns(json.columns || []);
      setData(json.data || []);
      setIndexes(json.indexes || []);
      setTotalCount(json.count ?? (json.data || []).length);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredTables = tables.filter(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 md:p-8 space-y-8">
      {/* Header Premium */}
      <div className="relative overflow-hidden bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] -mr-32 -mt-32"></div>
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-3xl shadow-xl">
               <Terminal className="w-6 h-6" />
             </div>
             <div>
               <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none uppercase italic">SQL Explorer</h1>
               <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">Exploration & Audit de la Base Système</p>
             </div>
          </div>
          <button
            onClick={fetchTables}
            className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:shadow-lg transition-all active:scale-95 group"
          >
            <RefreshCw className={`w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-700 ${loadingTables ? 'animate-spin' : ''}`} />
            Rafraîchir
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar: Tables */}
        <div className="lg:col-span-1 space-y-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Chercher une entité..."
              className="w-full pl-11 pr-4 py-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px] text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-300 transition-all shadow-sm"
            />
          </div>
          
          <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 p-4 space-y-1 overflow-auto max-h-[70vh] shadow-xl shadow-slate-200/20 dark:shadow-none custom-scrollbar">
            {loadingTables ? (
              <div className="p-8 space-y-3">
                {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-slate-50 dark:bg-slate-800/50 rounded-xl animate-pulse" />)}
              </div>
            ) : (
              filteredTables.map(t => (
                <button
                  key={t}
                  onClick={() => fetchTableData(t)}
                  className={`w-full flex items-center justify-between px-5 py-4 rounded-3xl text-[11px] font-black uppercase tracking-tight transition-all duration-300 ${selectedTable === t ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-[1.02]' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500'}`}
                >
                  <div className="flex items-center gap-4">
                    <TableIcon className={`w-4 h-4 ${selectedTable === t ? 'text-indigo-200' : 'text-slate-300'}`} />
                    <span className="truncate max-w-[150px]">{t.replace('sync_', '')}</span>
                  </div>
                  {selectedTable === t && <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Content: Main View */}
        <div className="lg:col-span-3 min-h-[700px]">
          <div className="bg-white dark:bg-slate-900 rounded-[48px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-2xl h-full flex flex-col">
            {selectedTable ? (
              <>
                {/* Table Header Info */}
                <div className="p-8 md:p-10 border-b border-slate-50 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-800/10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                       <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">{selectedTable}</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100/50 dark:border-indigo-800/50">
                        <Hash className="w-3 h-3" /> {totalCount} Records
                      </span>
                      <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200/50 dark:border-slate-700">
                        <Columns className="w-3 h-3" /> {columns.length} Fields
                      </span>
                    </div>
                  </div>
                  <button onClick={() => fetchTableData(selectedTable)} className="p-4 bg-white dark:bg-slate-800 text-slate-400 hover:text-indigo-600 rounded-[24px] transition-all shadow-md active:scale-90">
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Table Data */}
                <div className="flex-1 overflow-auto">
                  {loading ? (
                    <div className="h-full flex flex-col items-center justify-center p-32 space-y-4">
                      <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin shadow-inner"></div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Extraction des données...</p>
                    </div>
                  ) : data.length === 0 ? (
                    <div className="p-20 text-center text-slate-300 italic">Aucun enregistrement trouvé dans cette table.</div>
                  ) : (
                    <table className="w-full border-collapse">
                      <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10">
                        <tr className="border-b border-slate-100 dark:border-slate-800">
                          {Object.keys(data[0]).map(k => (
                            <th key={k} className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {data.map((row, i) => (
                          <tr key={i} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10 transition-colors group">
                            {Object.values(row).map((v: any, j) => (
                              <td key={j} className="px-8 py-5 text-[11px] font-medium text-slate-600 dark:text-slate-400 truncate max-w-[200px]" title={String(v)}>
                                {v === null ? <span className="opacity-20 italic">NULL</span> : String(v)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Footer / Performance Indexes */}
                {indexes.length > 0 && (
                  <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2">Performance & Indexes</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {indexes.map(idx => (
                        <div key={idx.name} className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Hash className="w-8 h-8" />
                          </div>
                          <div className="text-[11px] font-black text-indigo-600 uppercase tracking-tight mb-2">{idx.name}</div>
                          <code className="block text-[10px] font-mono text-slate-400 leading-relaxed italic break-all">
                            {idx.sql}
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-20 space-y-8 opacity-20 group">
                <div className="w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-[42px] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <Terminal className="w-12 h-12 text-slate-300" />
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Sélectionnez une entité</h3>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-2">Prêt pour l&apos;audit de la base de données locale</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
