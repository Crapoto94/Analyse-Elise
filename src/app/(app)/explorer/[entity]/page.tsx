'use client';

import { useEffect, useState, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ODataClient, ODataConfig, getEntityInfo, formatDate } from '@/lib/odata';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Inbox } from 'lucide-react';
import { EmptyState, LoadingBlock } from '@/components/ui';

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, colFilters, columns]);

  return (
    <div className="page animate-fade-in">
      {/* En-tête */}
      <div className="page-head">
        <div className="flex items-center gap-3">
          <Link href="/explorer" className="btn btn-secondary btn-sm !p-2" aria-label="Retour aux collections"><ArrowLeft size={16} /></Link>
          <span className="grid h-9 w-9 place-items-center rounded-[10px] text-lg" style={{ background: 'var(--brand-soft)' }}>{info.icon}</span>
          <h1 className="page-title">{info.label}</h1>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Requête OData, ex. $top=50&$orderby=Id desc"
            className="input !w-[22rem] font-mono !text-[13px]"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && config && fetchData(config, query)}
            aria-label="Requête OData"
          />
          <button onClick={() => config && fetchData(config, query)} className="btn btn-primary" disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Actualiser
          </button>
        </div>
      </div>

      {loading && data.length === 0 ? (
        <LoadingBlock label={`Chargement de ${info.label.toLowerCase()}…`} />
      ) : error ? (
        <div className="alert alert-danger" role="alert">
          <p className="font-medium">Erreur lors de la récupération des données</p>
          <p className="mt-2 break-all rounded-[8px] bg-white/60 p-3 font-mono text-[13px]">{error}</p>
        </div>
      ) : data.length === 0 ? (
        <div className="card"><EmptyState icon={<Inbox size={20} />} title="Aucune donnée trouvée" hint="Modifiez vos filtres ou votre requête OData." /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                {/* Noms des colonnes */}
                <tr>
                  {columns.map(col => (
                    <th key={col} className="whitespace-nowrap !pb-1">{col}</th>
                  ))}
                </tr>
                {/* Filtres */}
                <tr>
                  {columns.map(col => (
                    <th key={col} className="!py-2">
                      <input
                        type="text"
                        placeholder="Filtrer"
                        value={colFilters[col] || ''}
                        onChange={e => setColFilters(prev => ({ ...prev, [col]: e.target.value }))}
                        className="input !min-w-[90px] !px-2 !py-1 !text-xs"
                        aria-label={`Filtrer ${col}`}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, i) => (
                  <tr key={i}>
                    {columns.map(col => (
                      <td key={col} className="max-w-xs truncate whitespace-nowrap text-[13px]" style={{ color: 'var(--ink-2)' }} title={renderCell(col, row[col])}>
                        {renderCell(col, row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-5 py-3 text-xs" style={{ borderTop: '1px solid var(--line)', background: 'var(--surface-muted)', color: 'var(--ink-3)' }}>
            <span>
              {filteredData.length !== data.length
                ? `${filteredData.length} / ${data.length} enregistrements (filtrés)`
                : `${data.length} enregistrements affichés`}
            </span>
            <span>Utilisez les filtres de colonne ou la requête OData pour affiner.</span>
          </div>
        </div>
      )}
    </div>
  );
}
