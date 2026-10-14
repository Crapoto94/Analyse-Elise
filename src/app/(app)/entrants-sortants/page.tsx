'use client';

import { useEffect, useState } from 'react';
import { Download, RefreshCw, ArrowLeftRight } from 'lucide-react';
import { PageHeader, EmptyState } from '@/components/ui';

const nf = (n: number) => (n || 0).toLocaleString('fr-FR');

export default function EntrantsSortantsPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [poles, setPoles] = useState<any[]>([]);
  const [selectedPole, setSelectedPole] = useState('all');
  const [dgas, setDgas] = useState<any[]>([]);
  const [selectedDga, setSelectedDga] = useState('all');
  const [directions, setDirections] = useState<any[]>([]);
  const [selectedDir, setSelectedDir] = useState('all');
  const [services, setServices] = useState<any[]>([]);

  const [itemsWithCounts, setItemsWithCounts] = useState<any[]>([]);
  const [currentTotalData, setCurrentTotalData] = useState<any>({ countEnt: 0, countSor: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [showPeople, setShowPeople] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0); // > 0 : nouveau téléchargement depuis Elise

  const years = Array.from({ length: currentYear - 2023 + 1 }, (_, i) => 2023 + i);
  const refreshParam = refreshTick > 0 ? '&refresh=1' : '';

  // Initial load: Fetch pôle and direction names
  useEffect(() => {
    const fetchBaseHierarchy = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/hierarchy?year=${year}&taskTypeId=114${refreshParam}`);
        const json = await res.json();
        setPoles(json.poles || []);
        setDgas(json.dgas || []);
        setDirections(json.directions || []);
      } catch (e) {
        console.error("Error fetching base hierarchy:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchBaseHierarchy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, refreshTick]);

  // Fetch data based on selection
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ year: year.toString(), taskTypeId: '114' });
        if (selectedPole !== 'all') params.set('pole', selectedPole);
        if (selectedDga !== 'all') params.set('dga', selectedDga);
        if (selectedDir !== 'all') params.set('dir', selectedDir);

        const res = await fetch(`/api/hierarchy?${params}`);
        const json = await res.json();

        if (selectedPole === 'all') {
           setItemsWithCounts(json.poles || []);
           const total = calculateTotal(json.poles || []);
           setCurrentTotalData(total);
           setDgas(json.dgas || []);
           setDirections(json.directions || []);
        } else if (selectedDga === 'all') {
           setItemsWithCounts(json.dgas || []);
           const poleData = json.poles?.find((p: any) => p.name === selectedPole);
           setCurrentTotalData(poleData || { countEnt: 0, countSor: 0, count: 0 });
           setDgas(json.dgas || []);
           setDirections(json.directions || []);
        } else if (selectedDir === 'all') {
           setItemsWithCounts(json.directions || []);
           const dgaData = json.dgas?.find((d: any) => d.name === selectedDga);
           setCurrentTotalData(dgaData || { countEnt: 0, countSor: 0, count: 0 });
           setDirections(json.directions || []);
        } else {
           setItemsWithCounts(json.services || []);
           const dirData = json.directions?.find((d: any) => d.name === selectedDir);
           setCurrentTotalData(dirData || { countEnt: 0, countSor: 0, count: 0 });
        }
      } catch (e) {
        console.error("Error fetching data:", e);
      } finally {
        setLoading(false);
      }
    };

    const calculateTotal = (items: any[]) => {
      const global = items.reduce((acc: any, curr: any) => ({
        idsEnt: [...acc.idsEnt, ...(curr.idsEnt || [])],
        idsSor: [...acc.idsSor, ...(curr.idsSor || [])],
        idsMuniMail: [...acc.idsMuniMail, ...(curr.idsMuniMail || [])],
        idsMuniPapier: [...acc.idsMuniPapier, ...(curr.idsMuniPapier || [])],
        idsOtherMail: [...acc.idsOtherMail, ...(curr.idsOtherMail || [])],
        idsOtherPapier: [...acc.idsOtherPapier, ...(curr.idsOtherPapier || [])],
        idsMuniTotal: [...acc.idsMuniTotal, ...(curr.idsMuniTotal || [])],
        idsOtherTotal: [...acc.idsOtherTotal, ...(curr.idsOtherTotal || [])],
        idsTotal: [...acc.idsTotal, ...(curr.idsTotal || [])],
      }), { idsEnt: [], idsSor: [], idsMuniMail: [], idsMuniPapier: [], idsOtherMail: [], idsOtherPapier: [], idsMuniTotal: [], idsOtherTotal: [], idsTotal: [] });

      // Merge closure reasons
      const mergedClosure: any = {};
      items.forEach((item: any) => {
        if (item.closureReasons) {
          Object.entries(item.closureReasons).forEach(([label, data]: [string, any]) => {
            if (!mergedClosure[label]) mergedClosure[label] = { count: 0, ids: [] };
            mergedClosure[label].count += data.count;
            mergedClosure[label].ids.push(...(data.ids || []));
          });
        }
      });

      return {
        countEnt: new Set(global.idsEnt).size,
        countSor: new Set(global.idsSor).size,
        count: new Set(global.idsTotal).size,
        entMuniTotal: new Set(global.idsMuniTotal).size,
        entOtherTotal: new Set(global.idsOtherTotal).size,
        entMuniMail: new Set(global.idsMuniMail).size,
        entMuniPapier: new Set(global.idsMuniPapier).size,
        entOtherMail: new Set(global.idsOtherMail).size,
        entOtherPapier: new Set(global.idsOtherPapier).size,
        idsEnt: global.idsEnt,
        idsSor: global.idsSor,
        idsMuniTotal: global.idsMuniTotal,
        idsMuniMail: global.idsMuniMail,
        idsMuniPapier: global.idsMuniPapier,
        idsOtherTotal: global.idsOtherTotal,
        idsOtherMail: global.idsOtherMail,
        idsOtherPapier: global.idsOtherPapier,
        idsTotal: global.idsTotal,
        closureReasons: mergedClosure
      };
    };

    fetchData();
  }, [selectedPole, selectedDga, selectedDir, year, refreshTick]);

  const downloadExcel = (name: string, type: string, ids: string[]) => {
    if (!ids || ids.length === 0) return;
    // Unique and sorted for cleaner files
    const uniqueIds = Array.from(new Set(ids)).sort();
    const content = "Numéro de courrier\n" + uniqueIds.join("\n");
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Elise_${name.replace(/[^a-z0-9]/gi, '_')}_${type}_${year}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tooltipFor = (ids: string[]) => {
    const shown = ids?.slice(0, 30) || [];
    return shown.join(', ') + ((ids?.length || 0) > 30 ? `… (+${ids.length - 30})` : '');
  };

  const reasonsOf = (closureReasons?: any) =>
    closureReasons
      ? Object.entries(closureReasons).filter(([, d]: [string, any]) => d.count > 0).sort((a: any, b: any) => b[1].count - a[1].count)
      : [];

  /** Cellule chiffrée : valeur, motifs de clôture (colonne « Total ent. »), export CSV au survol. */
  const Cell = ({ name, count, ids, type, strong = false, tone = 'ink', reasons = [] as [string, any][], head = false }: {
    name: string; count: number; ids: string[]; type: string; strong?: boolean;
    tone?: 'ink' | 'brand' | 'warn'; reasons?: [string, any][]; head?: boolean;
  }) => {
    const color = count ? (tone === 'brand' ? 'var(--brand-ink)' : tone === 'warn' ? 'var(--warn)' : 'var(--ink)') : 'var(--ink-3)';
    return (
      <td className="group/cell relative px-3 py-2.5 text-center align-middle" style={head ? { background: 'var(--brand-soft)' } : undefined}>
        <span
          className={`num cursor-help ${strong || head ? 'text-[15px] font-semibold' : 'text-sm'}`}
          style={{ color }} title={tooltipFor(ids)}
        >
          {nf(count)}
        </span>
        {reasons.length > 0 && (
          <div className="mt-1.5 flex flex-wrap justify-center gap-1">
            {reasons.slice(0, 3).map(([label, d]) => (
              <span key={label} className="badge !text-[10px]" title={label}>{label.split(' ')[0]} {d.count}</span>
            ))}
            {reasons.length > 3 && <span className="text-[10px]" style={{ color: 'var(--ink-3)' }}>+{reasons.length - 3}</span>}
          </div>
        )}
        {count > 0 && (
          <button
            onClick={() => downloadExcel(name || 'Total', type, ids)}
            className="absolute right-1 top-1 hidden rounded-[6px] p-1 group-hover/cell:block"
            style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--ink-3)' }}
            title="Télécharger la liste (CSV)" aria-label="Télécharger la liste"
          >
            <Download size={12} />
          </button>
        )}
      </td>
    );
  };

  const level = selectedPole === 'all' ? 0 : selectedDga === 'all' ? 1 : selectedDir === 'all' ? 2 : 3;
  const firstColLabel = ['Collectivité / Pôles', 'Pôle / DGA', 'DGA / Directions', 'Direction / Services'][level];
  const totalName = level === 0 ? 'Ivry-sur-Seine' : level === 1 ? selectedPole : level === 2 ? selectedDga : selectedDir;
  const rows = itemsWithCounts.filter(item => showPeople || item.type !== 'Personne');
  const t = currentTotalData;

  return (
    <div className="page animate-fade-in">
      <PageHeader
        title="Entrants / Sortants"
        subtitle="Flux de courrier par pôle, DGA, direction et service."
        actions={
          <>
            <label className="flex cursor-pointer items-center gap-2 text-sm" style={{ color: 'var(--ink-2)' }}>
              <input type="checkbox" checked={showPeople} onChange={(e) => setShowPeople(e.target.checked)} />
              Afficher les personnes
            </label>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="select !w-auto" aria-label="Année">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={() => setRefreshTick(n => n + 1)} className="btn btn-secondary" disabled={loading} title="Retélécharger les données depuis Elise">
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Actualiser
            </button>
          </>
        }
      />

      {/* Filtres */}
      <div className="card card-pad grid gap-4 md:grid-cols-3">
        <div>
          <label className="label">Pôle</label>
          <select
            value={selectedPole}
            onChange={(e) => { setSelectedPole(e.target.value); setSelectedDga('all'); setSelectedDir('all'); }}
            className="select"
          >
            <option value="all">Toute la collectivité</option>
            {poles.map((p: any) => <option key={p.name} value={p.name}>{p.name} ({nf(p.countEnt)})</option>)}
          </select>
        </div>
        <div>
          <label className="label">DGA / Adjoint</label>
          <select
            disabled={selectedPole === 'all'}
            value={selectedDga}
            onChange={(e) => { setSelectedDga(e.target.value); setSelectedDir('all'); }}
            className="select"
          >
            <option value="all">Tous les DGA / adjoints</option>
            {dgas.map((d: any) => <option key={d.name} value={d.name}>{d.name} ({nf(d.countEnt)})</option>)}
          </select>
        </div>
        <div>
          <label className="label">Direction</label>
          <select disabled={selectedDga === 'all'} value={selectedDir} onChange={(e) => setSelectedDir(e.target.value)} className="select">
            <option value="all">Toutes les directions</option>
            {directions.map((dir: any) => <option key={dir.name} value={dir.name}>{dir.name} ({nf(dir.countEnt)})</option>)}
          </select>
        </div>
      </div>

      {/* Tableau */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-sm">
            <thead>
              <tr style={{ background: 'var(--surface-muted)', borderBottom: '1px solid var(--line)' }}>
                <th rowSpan={2} className="w-[280px] px-5 py-3 text-left text-xs font-medium" style={{ color: 'var(--ink-3)' }}>{firstColLabel}</th>
                <th colSpan={7} className="border-l px-3 py-2 text-center text-xs font-semibold" style={{ color: 'var(--brand-ink)' }}>Flux entrants</th>
                <th rowSpan={2} className="border-l px-3 py-3 text-center text-xs font-semibold" style={{ color: 'var(--warn)' }}>Sortants</th>
              </tr>
              <tr style={{ background: 'var(--surface-muted)', borderBottom: '1px solid var(--line)' }}>
                {['Total', 'Muni', 'Muni mail', 'Muni papier', 'Autres', 'Autres mail', 'Autres papier'].map((h, i) => (
                  <th key={h} className={`px-3 py-2 text-center text-[11px] font-medium ${i === 0 ? 'border-l' : ''}`} style={{ color: 'var(--ink-3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Ligne de total */}
              <tr style={{ background: 'var(--brand-soft)', borderBottom: '1px solid var(--brand-line)' }}>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="h-8 w-1 rounded-full" style={{ background: 'var(--brand)' }} />
                    <div>
                      <p className="max-w-[220px] truncate text-sm font-semibold" style={{ color: 'var(--brand-ink)' }} title={totalName}>{totalName}</p>
                      <p className="text-xs" style={{ color: 'var(--ink-3)' }}>Total</p>
                    </div>
                  </div>
                </td>
                <Cell head name="Total" count={t.countEnt} ids={t.idsEnt} type="Total_Entrants" tone="brand" reasons={reasonsOf(t.closureReasons) as any} />
                <Cell head name="Total" count={t.entMuniTotal} ids={t.idsMuniTotal} type="Muni_Total" tone="brand" />
                <Cell head name="Total" count={t.entMuniMail} ids={t.idsMuniMail} type="Muni_Mail" tone="brand" />
                <Cell head name="Total" count={t.entMuniPapier} ids={t.idsMuniPapier} type="Muni_Papier" tone="brand" />
                <Cell head name="Total" count={t.entOtherTotal} ids={t.idsOtherTotal} type="Autres_Total" tone="brand" />
                <Cell head name="Total" count={t.entOtherMail} ids={t.idsOtherMail} type="Autres_Mail" tone="brand" />
                <Cell head name="Total" count={t.entOtherPapier} ids={t.idsOtherPapier} type="Autres_Papier" tone="brand" />
                <Cell head name="Total" count={t.countSor} ids={t.idsSor} type="Sortants" tone="warn" />
              </tr>

              {/* Lignes */}
              {rows.map((item: any) => (
                <tr key={item.name} className="transition-colors hover:bg-[var(--surface-muted)]" style={{ borderBottom: '1px solid var(--line)' }}>
                  <td className="px-5 py-2.5">
                    <p className="max-w-[240px] truncate text-[13.5px] font-medium" title={item.name}>{item.name}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      {item.type === 'Personne' && <span className="badge badge-warn !text-[10px]">Personne</span>}
                      {item.dga && item.dga !== 'Autres / Non classés' && (
                        <span className="truncate text-[11px]" style={{ color: 'var(--ink-3)' }}>{item.dga}</span>
                      )}
                    </div>
                  </td>
                  <Cell strong name={item.name} count={item.countEnt} ids={item.idsEnt} type="Entrants" tone="brand" reasons={reasonsOf(item.closureReasons) as any} />
                  <Cell name={item.name} count={item.entMuniTotal} ids={item.idsMuniTotal} type="Muni_Total" />
                  <Cell name={item.name} count={item.entMuniMail} ids={item.idsMuniMail} type="Muni_Mail" />
                  <Cell name={item.name} count={item.entMuniPapier} ids={item.idsMuniPapier} type="Muni_Papier" />
                  <Cell name={item.name} count={item.entOtherTotal} ids={item.idsOtherTotal} type="Autres_Total" />
                  <Cell name={item.name} count={item.entOtherMail} ids={item.idsOtherMail} type="Autres_Mail" />
                  <Cell name={item.name} count={item.entOtherPapier} ids={item.idsOtherPapier} type="Autres_Papier" />
                  <Cell strong name={item.name} count={item.countSor} ids={item.idsSor} type="Sortants" tone="warn" />
                </tr>
              ))}

              {rows.length === 0 && !loading && (
                <tr><td colSpan={9}><EmptyState icon={<ArrowLeftRight size={20} />} title={`Aucune donnée en ${year}`} hint="Modifiez les filtres ou l'année." /></td></tr>
              )}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-3 py-10 text-sm" style={{ color: 'var(--ink-3)', borderTop: '1px solid var(--line)' }}>
            <span className="spinner" /> Chargement des données…
          </div>
        )}
      </div>
    </div>
  );
}
