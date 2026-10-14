'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, ChevronDown, FolderOpen } from 'lucide-react';
import { PageHeader, EmptyState, LoadingBlock } from '@/components/ui';

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

const stateBadge = (state: string) =>
  state === 'Terminée' ? 'badge-ok'
  : state === 'Refusée' ? 'badge-danger'
  : state === 'Démarrée' || state === 'Demandée' ? 'badge-brand'
  : '';

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
    <div className="page animate-fade-in" style={{ maxWidth: 1100 }}>
      <PageHeader
        title="Explorateur courrier"
        subtitle="Recherche d'un courrier par numéro de chrono et suivi de ses tâches."
        actions={
          <div className="seg" role="group" aria-label="Année">
            {[2026, 2025, 2024].map((y) => (
              <button key={y} className="seg-item" data-active={year === y.toString()} onClick={() => setYear(y.toString())}>{y}</button>
            ))}
          </div>
        }
      />

      {/* Recherche */}
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-3)' }} />
        <input
          type="text"
          placeholder="Rechercher par numéro de chrono (ex. ENT-2026…)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input !py-3 !pl-10 !pr-10"
          aria-label="Rechercher un courrier"
        />
        {loading && <span className="spinner absolute right-3.5 top-1/2 -translate-y-1/2 !h-4 !w-4" />}
      </div>

      {loading && courriers.length === 0 ? (
        <LoadingBlock />
      ) : courriers.length === 0 ? (
        <div className="card"><EmptyState icon={<FolderOpen size={20} />} title="Aucun résultat" hint="Modifiez votre recherche ou l'année." /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-12 px-5 py-3 text-xs font-medium" style={{ background: 'var(--surface-muted)', borderBottom: '1px solid var(--line)', color: 'var(--ink-3)' }}>
            <div className="col-span-5 md:col-span-3">Identifiant</div>
            <div className="hidden md:block md:col-span-3">Type</div>
            <div className="col-span-4 md:col-span-3">Création</div>
            <div className="col-span-2 text-center">Tâches</div>
            <div className="col-span-1" />
          </div>

          <div>
            {courriers.map((doc) => {
              const open = expandedDoc === doc.id;
              return (
                <React.Fragment key={doc.id}>
                  <button
                    onClick={() => toggleDoc(doc.id)}
                    aria-expanded={open}
                    className="grid w-full grid-cols-12 items-center px-5 py-3.5 text-left transition-colors hover:bg-[var(--surface-muted)]"
                    style={{ borderBottom: '1px solid var(--line)', background: open ? 'var(--brand-soft)' : undefined }}
                  >
                    <div className="col-span-5 min-w-0 md:col-span-3">
                      <div className="text-sm font-semibold">{doc.identifier}</div>
                      <div className="truncate text-xs" style={{ color: 'var(--ink-3)' }} title={doc.direction}>{doc.direction}</div>
                    </div>
                    <div className="hidden md:col-span-3 md:block"><span className="badge">{doc.type}</span></div>
                    <div className="num col-span-4 text-sm md:col-span-3" style={{ color: 'var(--ink-2)' }}>{formatDate(doc.createdDate, true)}</div>
                    <div className="col-span-2 text-center">
                      <span className={`badge num ${doc.tasks.length > 0 ? 'badge-brand' : ''}`}>{doc.tasks.length}</span>
                    </div>
                    <div className="col-span-1 flex justify-end" style={{ color: open ? 'var(--brand)' : 'var(--ink-3)' }}>
                      <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {open && (
                    <div className="px-5 py-5" style={{ background: 'var(--surface-muted)', borderBottom: '1px solid var(--line)' }}>
                      {doc.tasks.length === 0 ? (
                        <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Aucune tâche associée.</p>
                      ) : (
                        <ol className="relative ml-2 space-y-3 pl-6" style={{ borderLeft: '2px solid var(--brand-line)' }}>
                          {doc.tasks.map((task, tidx) => (
                            <li key={task.id} className="relative">
                              <span className="absolute -left-[31px] top-4 h-2.5 w-2.5 rounded-full" style={{ background: 'var(--brand)', boxShadow: '0 0 0 4px var(--surface-muted)' }} />
                              <div className="flex flex-col justify-between gap-2 rounded-[10px] p-3 md:flex-row md:items-center" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
                                <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                                  <span className="text-xs font-semibold" style={{ color: 'var(--brand-ink)' }}>#{tidx + 1} · {task.type}</span>
                                  <span className={`badge ${stateBadge(task.state)}`}>{task.state}</span>
                                  <span className="truncate text-sm font-medium">{task.assignedTo}</span>
                                </div>
                                <span className="shrink-0 text-xs" style={{ color: 'var(--ink-3)' }}>Assignée le {formatDate(task.date)}</span>
                              </div>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      <p className="pb-6 text-center text-xs" style={{ color: 'var(--ink-3)' }}>Affichage des 30 derniers résultats.</p>
    </div>
  );
}
