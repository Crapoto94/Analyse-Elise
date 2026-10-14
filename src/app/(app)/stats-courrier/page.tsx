'use client';

import { useState, useEffect } from 'react';
import { Mail, FileText, CheckCheck, Inbox, Search } from 'lucide-react';
import { PageHeader, EmptyState } from '@/components/ui';

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

const nf = (n: number) => (n || 0).toLocaleString('fr-FR');
/** Affiche un tiret discret pour les zéros. */
const dash = (n: number) => (n ? nf(n) : '–');

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const th = 'px-3 py-2 text-center text-[11px] font-medium';

  return (
    <div className="page animate-fade-in">
      <PageHeader
        title="Stats service courrier"
        subtitle="Détail journalier : courriels et courriers papier reçus et enregistrés."
        actions={
          <>
            <select value={year} onChange={(e) => setYear(e.target.value)} className="select !w-auto" aria-label="Année">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={month} onChange={(e) => setMonth(e.target.value)} className="select !w-auto" aria-label="Mois">
              {monthNames.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </>
        }
      />

      {/* Synthèse du mois */}
      {totals && !loading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Total reçus" value={totals.total_recus} icon={Inbox} />
          <Kpi label="Courriels" value={totals.courriels.total} icon={Mail} foot={`${nf(totals.courriels.supprimes)} supprimés`} />
          <Kpi label="Courriers papier" value={totals.papiers.total} icon={FileText} foot={`${nf(totals.papiers.non_enregistres)} non enregistrés`} />
          <Kpi label="Enregistrés" value={totals.total_enregistres} icon={CheckCheck} />
        </div>
      )}

      {loading ? (
        <div className="card card-pad"><div className="skeleton h-64" /></div>
      ) : data && data.length > 0 ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-sm">
              <thead>
                <tr style={{ background: 'var(--surface-muted)', borderBottom: '1px solid var(--line)' }}>
                  <th rowSpan={2} className="w-28 px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--ink-3)' }}>Date</th>
                  <th colSpan={4} className="border-l px-3 py-2 text-center text-xs font-semibold" style={{ color: 'var(--brand-ink)' }}>Courriels</th>
                  <th colSpan={4} className="border-l px-3 py-2 text-center text-xs font-semibold" style={{ color: 'var(--warn)' }}>Courriers papier</th>
                  <th colSpan={2} className="border-l px-3 py-2 text-center text-xs font-semibold" style={{ color: 'var(--ink-2)' }}>Total</th>
                </tr>
                <tr style={{ background: 'var(--surface-muted)', borderBottom: '1px solid var(--line)', color: 'var(--ink-3)' }}>
                  <th className={`${th} border-l`}>Reçus</th>
                  <th className={th}>Supprimés</th>
                  <th className={th}>Enr. courant</th>
                  <th className={th}>Enr. Muni</th>
                  <th className={`${th} border-l`}>Reçus</th>
                  <th className={th}>Enr. courant</th>
                  <th className={th}>Enr. Muni</th>
                  <th className={th}>Non enr.</th>
                  <th className={`${th} border-l`}>Reçus</th>
                  <th className={th}>Enregistrés</th>
                </tr>
              </thead>
              <tbody>
                {data.map((day) => {
                  const dayDate = new Date(day.date);
                  const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
                  const nonEnr = day.papiers.total - day.papiers.enregistres;
                  const cell = 'px-3 py-2 text-center num';

                  return (
                    <tr key={day.date} className="transition-colors hover:bg-[var(--surface-muted)]"
                      style={{ borderBottom: '1px solid var(--line)', background: isWeekend ? 'var(--surface-muted)' : undefined }}>
                      <td className="px-4 py-2 text-left text-[13px] font-medium" style={{ color: isWeekend ? 'var(--ink-3)' : 'var(--ink-2)' }}>
                        {dayDate.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                      </td>
                      {/* Courriels */}
                      <td className={`${cell} border-l font-medium`} title={day.courriels.ids?.join('\n')}>{dash(day.courriels.total)}</td>
                      <td className={cell} style={{ color: 'var(--ink-3)' }}>{dash(day.courriels.supprimes)}</td>
                      <td className={cell} style={{ color: 'var(--brand-ink)' }} title={day.courriels.courant_ids?.join('\n')}>{dash(day.courriels.courant)}</td>
                      <td className={cell} style={{ color: 'var(--brand-ink)' }} title={day.courriels.municipalite_ids?.join('\n')}>{dash(day.courriels.municipalite)}</td>
                      {/* Papiers */}
                      <td className={`${cell} border-l font-medium`} title={day.papiers.ids?.join('\n')}>{dash(day.papiers.total)}</td>
                      <td className={cell} style={{ color: 'var(--warn)' }} title={day.papiers.courant_ids?.join('\n')}>{dash(day.papiers.courant)}</td>
                      <td className={cell} style={{ color: 'var(--warn)' }} title={day.papiers.municipalite_ids?.join('\n')}>{dash(day.papiers.municipalite)}</td>
                      <td className={`${cell} font-medium`} style={{ color: nonEnr > 0 ? 'var(--danger)' : 'var(--ink-3)' }}>{dash(nonEnr)}</td>
                      {/* Totaux du jour */}
                      <td className={`${cell} border-l font-semibold`}>{dash(day.total_recus)}</td>
                      <td className={`${cell} font-semibold`} style={{ color: 'var(--brand-ink)' }}>{dash(day.total_enregistres)}</td>
                    </tr>
                  );
                })}
              </tbody>
              {totals && (
                <tfoot>
                  <tr style={{ background: 'var(--brand-soft)', borderTop: '1px solid var(--brand-line)' }} className="text-[13px] font-semibold">
                    <td className="px-4 py-3 text-left" style={{ color: 'var(--brand-ink)' }}>Totaux</td>
                    <td className="num border-l px-3 py-3 text-center">{nf(totals.courriels.total)}</td>
                    <td className="num px-3 py-3 text-center" style={{ color: 'var(--ink-3)' }}>{nf(totals.courriels.supprimes)}</td>
                    <td className="num px-3 py-3 text-center" style={{ color: 'var(--brand-ink)' }}>{nf(totals.courriels.courant)}</td>
                    <td className="num px-3 py-3 text-center" style={{ color: 'var(--brand-ink)' }}>{nf(totals.courriels.municipalite)}</td>
                    <td className="num border-l px-3 py-3 text-center">{nf(totals.papiers.total)}</td>
                    <td className="num px-3 py-3 text-center" style={{ color: 'var(--warn)' }}>{nf(totals.papiers.courant)}</td>
                    <td className="num px-3 py-3 text-center" style={{ color: 'var(--warn)' }}>{nf(totals.papiers.municipalite)}</td>
                    <td className="num px-3 py-3 text-center" style={{ color: 'var(--danger)' }}>{nf(totals.papiers.non_enregistres)}</td>
                    <td className="num border-l px-3 py-3 text-center">{nf(totals.total_recus)}</td>
                    <td className="num px-3 py-3 text-center" style={{ color: 'var(--brand-ink)' }}>{nf(totals.total_enregistres)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <EmptyState icon={<Search size={20} />} title="Aucune donnée pour cette période" hint="Sélectionnez une autre année ou un autre mois." />
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, icon: Icon, foot }: { label: string; value: number; icon: React.ComponentType<{ size?: number }>; foot?: string }) {
  return (
    <div className="kpi flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="kpi-label">{label}</p>
        <p className="kpi-value">{nf(value)}</p>
        {foot && <p className="kpi-foot">{foot}</p>}
      </div>
      <span className="kpi-icon"><Icon size={18} /></span>
    </div>
  );
}
