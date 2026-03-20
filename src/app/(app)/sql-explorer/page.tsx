'use client';

import { useEffect, useState } from 'react';

export default function SqlExplorerPage() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [columns, setColumns] = useState<{ name: string; type: string }[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [indexes, setIndexes] = useState<{ name: string; sql: string }[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [loadingTables, setLoadingTables] = useState(true);

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

  const syncTables = tables.filter(t => t.startsWith('sync_'));
  const systemTables = tables.filter(t => !t.startsWith('sync_'));

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Explorateur SQL</h1>
          <p className="text-slate-500">Inspection de la base de données SQLite locale</p>
        </div>
        <button
          onClick={fetchTables}
          className="px-4 py-2 text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
        >
          🔄 Rafraîchir les tables
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Sidebar: Tables */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4 overflow-auto max-h-[80vh]">
          {loadingTables ? (
            <div className="text-sm text-slate-400 italic animate-pulse">Chargement...</div>
          ) : (
            <>
              {syncTables.length > 0 && (
                <div>
                  <h2 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest px-2 mb-2">
                    Entités synchronisées ({syncTables.length})
                  </h2>
                  <div className="flex flex-col gap-1">
                    {syncTables.map(t => (
                      <button
                        key={t}
                        onClick={() => fetchTableData(t)}
                        className={`text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${selectedTable === t ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'hover:bg-slate-50 text-slate-600'}`}
                      >
                        <span className="block font-bold">{t.replace('sync_', '')}</span>
                        <span className={`text-[10px] ${selectedTable === t ? 'text-blue-200' : 'text-slate-400'}`}>{t}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {systemTables.length > 0 && (
                <div>
                  <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">
                    Système ({systemTables.length})
                  </h2>
                  <div className="flex flex-col gap-1">
                    {systemTables.map(t => (
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
              )}

              {tables.length === 0 && (
                <p className="text-sm text-slate-400 italic text-center py-4">
                  Aucune table trouvée. Lancez une synchronisation depuis l&apos;Explorateur.
                </p>
              )}
            </>
          )}
        </div>

        {/* Content: Data Table */}
        <div className="md:col-span-3 bg-white rounded-3xl shadow-sm border border-slate-100 p-6 overflow-hidden">
          {!selectedTable ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
              <span className="text-4xl">🗄️</span>
              <p className="italic">Sélectionnez une table pour voir son contenu</p>
            </div>
          ) : loading ? (
            <div className="h-64 flex items-center justify-center animate-pulse text-blue-600 font-bold">
              Chargement des données...
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800">{selectedTable}</h3>
                <div className="flex gap-2">
                  <span className="text-xs bg-blue-50 text-blue-600 font-bold px-3 py-1 rounded-full">
                    {data.length}/{totalCount} enregistrements
                  </span>
                  <span className="text-xs bg-slate-100 text-slate-500 px-3 py-1 rounded-full">
                    {columns.length} colonnes
                  </span>
                </div>
              </div>

              {data.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-slate-400 italic border border-slate-100 rounded-2xl">
                  Aucune donnée dans cette table
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50">
                      <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                        {Object.keys(data[0]).map(k => (
                          <th key={k} className="px-4 py-3">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.map((row, i) => (
                        <tr key={i} className="text-xs hover:bg-slate-50 transition-colors">
                          {Object.values(row).map((v: any, j) => (
                            <td key={j} className="px-4 py-3 text-slate-600 truncate max-w-[200px]" title={v !== null ? String(v) : 'null'}>
                              {v === null ? <span className="text-slate-300">null</span> : String(v)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Indexes Section */}
              {indexes.length > 0 && (
                <div className="mt-8 space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span className="text-blue-500">🗂️</span>
                    Index de la table ({indexes.length})
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    {indexes.map(idx => (
                      <div key={idx.name} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                        <div className="font-bold text-xs text-slate-700 mb-1">{idx.name}</div>
                        <code className="text-[10px] text-slate-400 block whitespace-pre-wrap break-all leading-relaxed">
                          {idx.sql}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
