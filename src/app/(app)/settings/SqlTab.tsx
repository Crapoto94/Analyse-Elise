'use client';

import React, { useState, useEffect } from 'react';
import { Database, Table2 } from 'lucide-react';
import { EmptyState, LoadingBlock } from '@/components/ui';

// Explorateur des bases locales (entités synchronisées et système)
export default function SqlTab() {
  const [dbType, setDbType] = useState<'system' | 'entities'>('entities');
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [data, setData] = useState<any[]>([]);
  const [indexes, setIndexes] = useState<{ name: string; sql: string }[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [loadingTables, setLoadingTables] = useState(true);

  useEffect(() => { fetchTables(); }, [dbType]);

  const fetchTables = async () => {
    setLoadingTables(true);
    try {
      const res = await fetch(`/api/sql-explorer?db=${dbType}`);
      const json = await res.json();
      setTables(json.tables || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setLoadingTables(false); }
  };

  const fetchTableData = async (table: string) => {
    setLoading(true);
    setSelectedTable(table);
    try {
      const res = await fetch(`/api/sql-explorer?table=${table}&db=${dbType}&limit=200`);
      const json = await res.json();
      setData(json.data || []);
      setIndexes(json.indexes || []);
      setTotalCount(json.count ?? (json.data || []).length);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const switchDb = (t: 'system' | 'entities') => { setDbType(t); setSelectedTable(''); setData([]); };

  return (
    <div className="grid h-[calc(100vh-250px)] min-h-[520px] md:grid-cols-[260px_1fr]">
      {/* Liste des tables */}
      <div className="flex min-h-0 flex-col" style={{ borderRight: '1px solid var(--line)', background: 'var(--surface-muted)' }}>
        <div className="space-y-3 p-4" style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="seg w-full">
            <button className="seg-item flex-1" data-active={dbType === 'entities'} onClick={() => switchDb('entities')}>Entités</button>
            <button className="seg-item flex-1" data-active={dbType === 'system'} onClick={() => switchDb('system')}>Système</button>
          </div>
          <p className="text-xs" style={{ color: 'var(--ink-3)' }}>{tables.length} tables</p>
        </div>
        <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
          {loadingTables && <LoadingBlock />}
          {tables.map(t => {
            const active = selectedTable === t;
            return (
              <button
                key={t}
                onClick={() => fetchTableData(t)}
                className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left text-[13px] font-medium transition-colors"
                style={active ? { background: 'var(--brand-soft)', color: 'var(--brand-ink)' } : { color: 'var(--ink-2)' }}
              >
                <Table2 size={14} style={{ color: active ? 'var(--brand)' : 'var(--ink-3)' }} />
                <span className="truncate">{t.replace('sync_', '')}</span>
                {t.startsWith('sync_') && <span className="badge badge-warn ml-auto">synchro</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenu de la table */}
      <div className="flex min-h-0 min-w-0 flex-col">
        {selectedTable ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
              <div>
                <h3 className="text-base font-semibold">{selectedTable}</h3>
                <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
                  {dbType === 'entities' ? 'Base entités' : 'Base système'} · {totalCount} enregistrements
                </p>
              </div>
              <span className="badge">{data.length} lignes affichées</span>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              {loading ? <LoadingBlock /> : (
                <table className="tbl">
                  <thead className="sticky top-0 z-10">
                    <tr>{Object.keys(data[0] || {}).map(k => <th key={k} className="whitespace-nowrap">{k}</th>)}</tr>
                  </thead>
                  <tbody>
                    {data.map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((v: any, j) => (
                          <td key={j} className="max-w-[240px] truncate font-mono text-[12.5px]" style={{ color: 'var(--ink-2)' }} title={String(v)}>
                            {String(v)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {indexes.length > 0 && (
                <div className="space-y-3 p-6">
                  <h4 className="text-sm font-semibold">Index ({indexes.length})</h4>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {indexes.map(idx => (
                      <div key={idx.name} className="rounded-[12px] p-4" style={{ border: '1px solid var(--line)', background: 'var(--surface-muted)' }}>
                        <p className="mb-2 text-[13px] font-medium" style={{ color: 'var(--brand-ink)' }}>{idx.name}</p>
                        <code className="block break-all font-mono text-[12px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>{idx.sql}</code>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <EmptyState icon={<Database size={20} />} title="Sélectionnez une table" hint="Choisissez une table dans la liste pour afficher ses 200 premières lignes." />
        )}
      </div>
    </div>
  );
}
