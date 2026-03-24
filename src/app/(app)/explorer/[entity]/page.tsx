'use client';

import { useEffect, useState, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ODataClient, ODataConfig, getEntityInfo, formatDate } from '@/lib/odata';
import Link from 'next/link';

export default function EntityPage({ params }: { params: Promise<{ entity: string }> }) {
  const { entity } = use(params);
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [config, setConfig] = useState<ODataConfig | null>(null);
  const [query, setQuery] = useState('$top=50');
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const info = getEntityInfo(entity);

  useEffect(() => {
    const init = async () => {
      try {
        const resSession = await fetch('/api/auth/session');
        const sessionJson = await resSession.json();
        if (sessionJson.user?.role !== 'ADMIN') {
           router.push('/statistiques');
           return;
        }

        const resConfig = await fetch('/api/config/odata');
        if (!resConfig.ok) throw new Error('Configuration OData manquante');
        const odataConfig = await resConfig.json();
        setConfig(odataConfig);

        let finalQuery = query;
        if (info.defaultExpand && !finalQuery.includes('$expand')) {
          const separator = finalQuery ? '&' : '';
          finalQuery += `${separator}$expand=${info.defaultExpand}`;
        }

        fetchData(odataConfig, finalQuery);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };
    init();
  }, [router, entity, query, info.defaultExpand]);

  const fetchData = async (odataConfig: ODataConfig, queryStr: string) => {
    setLoading(true);
    setColFilters({});
    const client = new ODataClient(odataConfig);
    try {
      const res = await client.getEntityData(entity, queryStr);
      setData(res.value);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const columns = data.length > 0 ? (() => {
    const allKeys = Object.keys(data[0]).filter(k => k !== '@odata.id');
    const priority = info.priorityFields || [];
    return [
      ...priority.filter(k => allKeys.includes(k)),
      ...allKeys.filter(k => !priority.includes(k))
    ];
  })() : [];

  // Format a single cell value
  function renderCell(col: string, val: any): string {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'object') {
      return val.LabelFrFr || val.Label || val.Name || val.Title || JSON.stringify(val).slice(0, 40);
    }
    if (col.toLowerCase().includes('date') || col.toLowerCase().includes('timestamp') ||
        (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val))) {
      return formatDate(val);
    }
    return String(val);
  }

  // Client-side filter on displayed values + Global exclusion
  const filteredData = useMemo(() => {
    const EXCLUDED_NAME = "ABBAS Isabelle";
    
    return data.filter(row => {
      // 1. Global Exclusion check
      const rowString = JSON.stringify(row).toUpperCase();
      if (rowString.includes(EXCLUDED_NAME.toUpperCase())) return false;

      // 2. Column filters check
      return columns.every(col => {
        const filter = colFilters[col]?.toLowerCase().trim();
        if (!filter) return true;
        const cell = renderCell(col, row[col]).toLowerCase();
        return cell.includes(filter);
      });
    });
  }, [data, colFilters, columns]);

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200/60 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/explorer" className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 text-lg">
            ←
          </Link>
          <div className="h-6 w-px bg-slate-200" />
          <span className="text-2xl">{info.icon}</span>
          <h1 className="text-xl font-bold text-slate-900">{info.label}</h1>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="OData Query (e.g. $top=50&$orderby=Id desc)"
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm w-80 focus:ring-2 focus:ring-blue-500 outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && config && fetchData(config, query)}
          />
          <button
            onClick={() => config && fetchData(config, query)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all shadow-sm"
          >
            Actualiser
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-auto">
        {loading && data.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4" />
            <p className="text-slate-500">Chargement de {info.label.toLowerCase()}…</p>
          </div>
        ) : error ? (
          <div className="p-8 rounded-2xl bg-red-50 border border-red-100 text-red-700 max-w-4xl mx-auto mt-10">
            <h3 className="text-lg font-bold mb-2">Erreur lors de la récupération des données</h3>
            <p className="text-sm font-mono bg-white/50 p-4 rounded-lg mt-4">{error}</p>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-bold text-slate-800">Aucune donnée trouvée</h3>
            <p className="text-slate-500">Essayez de modifier vos filtres ou votre requête OData.</p>
          </div>
        ) : (
          <div className="glass overflow-hidden rounded-2xl animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  {/* Column names */}
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {columns.map(col => (
                      <th key={col} className="px-4 pt-3 pb-1 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                  {/* Filter inputs */}
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    {columns.map(col => (
                      <th key={col} className="px-3 py-2">
                        <input
                          type="text"
                          placeholder="🔍"
                          value={colFilters[col] || ''}
                          onChange={e => setColFilters(prev => ({ ...prev, [col]: e.target.value }))}
                          className="w-full min-w-[80px] px-2 py-1 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-400 outline-none bg-white text-slate-700 placeholder-slate-300"
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-blue-50/30 transition-colors">
                      {columns.map(col => (
                        <td key={col} className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap max-w-xs truncate">
                          {renderCell(col, row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <footer className="px-6 py-3 bg-white border-t border-slate-200 text-xs text-slate-400 flex justify-between items-center">
        <span>
          {filteredData.length !== data.length
            ? `${filteredData.length} / ${data.length} enregistrements (filtrés)`
            : `${data.length} enregistrements affichés`}
        </span>
        <span>Utilisez les champs de filtre ou la barre OData pour affiner</span>
      </footer>
    </div>
  );
}
