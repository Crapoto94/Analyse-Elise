'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, ScrollText } from 'lucide-react';
import { SectionHeader, EmptyState } from '@/components/ui';

// Supervision des requêtes de l'application
export default function AuditTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit-logs');
      const data = await res.json();
      setLogs(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, []);

  return (
    <div>
      <div className="p-6" style={{ borderBottom: '1px solid var(--line)' }}>
        <SectionHeader
          title="Audit API"
          subtitle="Dernières requêtes reçues par l'application."
          actions={
            <button onClick={fetchLogs} className="btn btn-secondary btn-sm" disabled={loading}>
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Actualiser
            </button>
          }
        />
      </div>

      <div className="overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr><th>Horodatage</th><th>Requête</th><th>Durée</th><th>Utilisateur</th><th>État</th></tr>
          </thead>
          <tbody>
            {Array.isArray(logs) && logs.map(log => {
              const ok = log.status < 400;
              return (
                <tr key={log.id}>
                  <td className="whitespace-nowrap">
                    <div className="font-medium">{new Date(log.timestamp).toLocaleDateString('fr-FR')}</div>
                    <div className="text-xs" style={{ color: 'var(--ink-3)' }}>{new Date(log.timestamp).toLocaleTimeString('fr-FR')}</div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="badge font-mono">{log.method}</span>
                      <span className="font-mono text-[13px]">{log.endpoint}</span>
                    </div>
                  </td>
                  <td className="num whitespace-nowrap" style={{ color: 'var(--ink-2)' }}>{log.duration} ms</td>
                  <td style={{ color: 'var(--ink-2)' }}>{log.userEmail || <span style={{ color: 'var(--ink-3)' }}>Anonyme</span>}</td>
                  <td><span className={`badge ${ok ? 'badge-ok' : 'badge-danger'}`}>{log.status}</span></td>
                </tr>
              );
            })}
            {(!Array.isArray(logs) || logs.length === 0) && !loading && (
              <tr><td colSpan={5}><EmptyState icon={<ScrollText size={20} />} title="Aucune donnée d'audit" /></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
