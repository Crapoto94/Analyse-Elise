'use client';

import { useEffect, useState } from 'react';

export default function SqlExplorerPage() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const res = await fetch('/api/sql-explorer');
      const json = await res.json();
      setTables(json.tables || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTableData = async (table: string) => {
    setLoading(true);
    setSelectedTable(table);
    try {
      const res = await fetch(`/api/sql-explorer?table=${table}`);
      const json = await res.json();
      setData(json.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Explorateur SQL</h1>
        <p className="text-slate-500">Inspection de la base de données SQLite locale</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Sidebar: Tables */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">Tables</h2>
          <div className="flex flex-col gap-1">
            {tables.map(t => (
              <button
                key={t}
                onClick={() => fetchTableData(t)}
                className={`text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${selectedTable === t ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'hover:bg-slate-50 text-slate-600'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Content: Data Table */}
        <div className="md:col-span-3 bg-white rounded-3xl shadow-sm border border-slate-100 p-6 overflow-hidden">
          {!selectedTable ? (
            <div className="h-64 flex items-center justify-center text-slate-400 italic">
              Sélectionnez une table pour voir son contenu
            </div>
          ) : loading ? (
            <div className="h-64 flex items-center justify-center animate-pulse text-blue-600 font-bold">
              Chargement des données...
            </div>
          ) : (
            <div className="space-y-4">
               <div className="flex justify-between items-center">
                 <h3 className="text-lg font-bold text-slate-800">Contenu de {selectedTable}</h3>
                 <span className="text-xs bg-slate-100 text-slate-500 px-3 py-1 rounded-full">{data.length} enregistrements</span>
               </div>
               
               <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                 <table className="w-full text-left">
                   <thead className="bg-slate-50">
                     <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                       {data.length > 0 && Object.keys(data[0]).map(k => (
                         <th key={k} className="px-4 py-3">{k}</th>
                       ))}
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {data.map((row, i) => (
                       <tr key={i} className="text-xs hover:bg-slate-50 transition-colors">
                         {Object.values(row).map((v: any, j) => (
                           <td key={j} className="px-4 py-3 text-slate-600 truncate max-w-[200px]">
                             {v === null ? <span className="text-slate-300">null</span> : v.toString()}
                           </td>
                         ))}
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
