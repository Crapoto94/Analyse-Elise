'use client';

import { useEffect, useState } from 'react';

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

  const years = Array.from({ length: currentYear - 2023 + 1 }, (_, i) => 2023 + i);

  // Initial load: Fetch pôle and direction names
  useEffect(() => {
    const fetchBaseHierarchy = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/hierarchy?year=${year}&taskTypeId=114`);
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
  }, [year]);

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
  }, [selectedPole, selectedDga, selectedDir, year]);

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

  const renderCell = (item: any, count: number, ids: string[], type: string, bgColor: string, textColor: string, isBold: boolean = false) => {
    const displayIds = ids?.slice(0, 30) || [];
    const hasMore = ids?.length > 30;
    
    let tooltipText = displayIds.join(', ') + (hasMore ? `... (+${ids.length - 30})` : '');
    
    const reasonsList = type === 'Entrants' && item.closureReasons ? Object.entries(item.closureReasons)
      .filter(([, data]: [string, any]) => data.count > 0)
      .sort((a: any, b: any) => b[1].count - a[1].count)
      : [];

    return (
      <td className={`px-4 py-1 text-center border-l border-slate-100/50 ${bgColor} group/cell relative`}>
        <div className="flex flex-col items-center justify-center gap-0.5">
          <span 
            className={`${isBold ? 'font-black' : 'font-bold'} ${textColor} cursor-help transition-transform hover:scale-110 whitespace-pre-line text-sm`}
            title={tooltipText}
          >
            {(count || 0).toLocaleString()}
          </span>
          
          {type === 'Entrants' && reasonsList.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1 mt-1 max-w-[150px]">
              {reasonsList.slice(0, 3).map(([label, data]: [string, any]) => (
                <span key={label} className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-sm font-medium border border-blue-100/50 whitespace-nowrap" title={label}>
                  {label.split(' ')[0]}: {data.count}
                </span>
              ))}
              {reasonsList.length > 3 && <span className="text-[8px] text-slate-400">+{reasonsList.length - 3}</span>}
            </div>
          )}

          {count > 0 && (
            <button 
              onClick={() => downloadExcel(item.name || 'Total', type, ids)}
              className="opacity-0 group-hover/cell:opacity-100 p-1 hover:bg-white/50 rounded-md transition-all text-[10px] text-slate-400 hover:text-blue-600 flex items-center gap-1"
              title="Télécharger la liste (Excel/CSV)"
            >
              📥 <span className="font-bold">EXCEL</span>
            </button>
          )}
        </div>
      </td>
    );
  };

  const renderTotalCell = (count: number, ids: string[], type: string, closureReasons?: any) => {
    const displayIds = ids?.slice(0, 30) || [];
    const hasMore = ids?.length > 30;
    
    let tooltipText = displayIds.join(', ') + (hasMore ? `... (+${ids.length - 30})` : '');
    
    const reasonsList = closureReasons ? Object.entries(closureReasons)
      .filter(([, data]: [string, any]) => data.count > 0)
      .sort((a: any, b: any) => b[1].count - a[1].count)
      : [];

    return (
      <td className="px-4 py-5 text-center border-l border-white/10 bg-white/5 group/cell relative">
        <div className="flex flex-col items-center justify-center gap-1">
          <span 
            className="text-xl font-black cursor-help transition-transform hover:scale-110 whitespace-pre-line"
            title={tooltipText}
          >
            {(count || 0).toLocaleString()}
          </span>

          {reasonsList.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1 mt-1 max-w-[200px]">
              {reasonsList.slice(0, 5).map(([label, data]: [string, any]) => (
                <span key={label} className="text-[9px] bg-white/20 text-white px-2 py-0.5 rounded-md font-bold border border-white/10 whitespace-nowrap" title={label}>
                  {label.split(' ')[0]}: {data.count}
                </span>
              ))}
              {reasonsList.length > 5 && <span className="text-[9px] text-white/60">+{reasonsList.length - 5}</span>}
            </div>
          )}

          {count > 0 && (
            <button 
              onClick={() => downloadExcel('Total_Direction', type, ids)}
              className="opacity-0 group-hover/cell:opacity-100 p-1 bg-white/20 hover:bg-white/40 rounded-md transition-all text-[9px] text-white flex items-center gap-1"
            >
              📥 <span className="font-bold">EXCEL</span>
            </button>
          )}
        </div>
      </td>
    );
  };

  return (
    <div className="p-8 max-w-[100%] mx-auto space-y-8 animate-fade-in">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            Entrants/Sortants
            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full uppercase tracking-tighter">FLUX</span>
          </h1>
          <p className="text-slate-500">Analyse détaillée des flux entrants et sortants par direction</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
             <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                   <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={showPeople} 
                      onChange={(e) => setShowPeople(e.checked)} 
                   />
                   <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">Afficher les personnes</span>
             </label>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-1 min-w-[140px]">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Année d'analyse</label>
            <select 
              value={year} 
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none font-bold text-blue-900 transition-all cursor-pointer"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 overflow-visible">
        <div className="w-full md:w-80 flex flex-col gap-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pôle</label>
          <select 
            value={selectedPole} 
            onChange={(e) => { setSelectedPole(e.target.value); setSelectedDga('all'); setSelectedDir('all'); }}
            className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none font-bold text-slate-800 transition-all cursor-pointer h-12"
          >
            <option value="all">-- Toute la collectivité --</option>
            {poles.map((p: any) => (
              <option key={p.name} value={p.name}>{p.name} ({(p.countEnt || 0).toLocaleString()})</option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-80 flex flex-col gap-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DGA / ADJOINT</label>
          <select 
            disabled={selectedPole === 'all'}
            value={selectedDga} 
            onChange={(e) => { setSelectedDga(e.target.value); setSelectedDir('all'); }}
            className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none font-bold text-slate-800 transition-all cursor-pointer h-12 disabled:opacity-50"
          >
            <option value="all">-- Tous les DGA / Adjoints --</option>
            {dgas.map((d: any) => (
              <option key={d.name} value={d.name}>
                {d.name} ({(d.countEnt || 0).toLocaleString()})
              </option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-80 flex flex-col gap-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Direction</label>
          <select 
            disabled={selectedDga === 'all'}
            value={selectedDir} 
            onChange={(e) => setSelectedDir(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none font-bold text-slate-800 transition-all cursor-pointer h-12 disabled:opacity-50"
          >
            <option value="all">-- Toutes les directions --</option>
            {directions.map((dir: any) => (
              <option key={dir.name} value={dir.name}>
                {dir.name} ({(dir.countEnt || 0).toLocaleString()})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden transition-all duration-500">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1400px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th rowSpan={2} className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[250px]">
                  {selectedPole === 'all' ? 'Collectivité / Pôles' : (selectedDga === 'all' ? 'Pôle / DGA' : (selectedDir === 'all' ? 'DGA / Directions' : 'Direction / Services'))}
                </th>
                <th colSpan={7} className="px-4 py-3 text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] text-center border-l border-slate-100/50 bg-blue-50/20">
                  FLUX ENTRANTS (ENT)
                </th>
                <th rowSpan={2} className="px-6 py-5 text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] text-center border-l border-slate-100/50 bg-amber-50/10">
                  SORTANTS (SOR)
                </th>
              </tr>
              <tr className="bg-slate-50/30 border-b border-slate-100">
                <th className="px-4 py-3 text-[9px] font-black text-blue-800 uppercase text-center border-l border-slate-100/50 bg-blue-100/10">TOTAL ENT</th>
                <th className="px-4 py-3 text-[9px] font-black text-indigo-600 uppercase text-center border-l border-slate-100/30 bg-indigo-50/5">MUNI (Tot)</th>
                <th className="px-4 py-3 text-[9px] font-black text-indigo-500 uppercase text-center border-l border-slate-100/20">MUNI (Mail)</th>
                <th className="px-4 py-3 text-[9px] font-black text-indigo-500 uppercase text-center border-l border-slate-100/20">MUNI (Pap)</th>
                <th className="px-4 py-3 text-[9px] font-black text-cyan-600 uppercase text-center border-l border-slate-100/30 bg-cyan-50/5">AUTRES (Tot)</th>
                <th className="px-4 py-3 text-[9px] font-black text-cyan-500 uppercase text-center border-l border-slate-100/20">AUTRES (Mail)</th>
                <th className="px-4 py-3 text-[9px] font-black text-cyan-500 uppercase text-center border-l border-slate-100/20">AUTRES (Pap)</th>
              </tr>
            </thead>
            <tbody>
              {/* Main Total Row (Global or Direction) */}
              <tr className="border-b border-slate-100 bg-blue-600 text-white shadow-lg relative z-10">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white text-sm font-bold backdrop-blur-md">
                      {selectedPole === 'all' ? '🏛️' : (selectedDga === 'all' ? 'P' : (selectedDir === 'all' ? 'DGA' : 'D'))}
                    </div>
                    <span className="text-sm font-black tracking-tight uppercase truncate max-w-[200px]">
                      {selectedPole === 'all' ? 'Ivry-sur-Seine' : (selectedDga === 'all' ? selectedPole : (selectedDir === 'all' ? selectedDga : selectedDir))}
                    </span>
                  </div>
                </td>
                {renderTotalCell(currentTotalData.countEnt, currentTotalData.idsEnt, 'Total_Entrants', currentTotalData.closureReasons)}
                {renderTotalCell(currentTotalData.entMuniTotal, currentTotalData.idsMuniTotal, 'Muni_Total')}
                {renderTotalCell(currentTotalData.entMuniMail, currentTotalData.idsMuniMail, 'Muni_Mail')}
                {renderTotalCell(currentTotalData.entMuniPapier, currentTotalData.idsMuniPapier, 'Muni_Papier')}
                {renderTotalCell(currentTotalData.entOtherTotal, currentTotalData.idsOtherTotal, 'Autres_Total')}
                {renderTotalCell(currentTotalData.entOtherMail, currentTotalData.idsOtherMail, 'Autres_Mail')}
                {renderTotalCell(currentTotalData.entOtherPapier, currentTotalData.idsOtherPapier, 'Autres_Papier')}
                {renderTotalCell(currentTotalData.countSor, currentTotalData.idsSor, 'Sortants')}
              </tr>
              {/* List of items */}
              {itemsWithCounts.filter(item => showPeople || item.type !== 'Personne').map((item: any) => (
                <tr key={item.name} className="border-b border-slate-50 group hover:bg-slate-50/80 transition-all">
                  <td className="px-6 py-1.5 pl-12">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${selectedDir === 'all' ? 'bg-blue-400' : 'bg-slate-300'} group-hover:scale-125 transition-transform`}></div>
                          <span className={`text-[11px] font-bold tracking-tight group-hover:text-slate-900 transition-colors ${selectedDir === 'all' ? 'text-slate-800' : 'text-slate-600'} truncate max-w-[200px]`}>
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 ml-3.5">
                        <span className={`text-[8px] font-bold uppercase ${item.type === 'Personne' ? 'text-amber-600 bg-amber-50' : 'text-slate-400 bg-slate-50'} px-1 rounded-sm w-fit`}>
                          {item.type || 'Entité'}
                        </span>
                        {item.dga && item.dga !== 'Autres / Non classés' && (
                            <span className="text-[8px] font-medium text-slate-400 italic">
                                ({item.dga})
                            </span>
                        )}
                      </div>
                    </div>
                  </td>
                  {renderCell(item, item.countEnt, item.idsEnt, 'Entrants', 'bg-blue-50/5', 'text-blue-700', true)}
                  {renderCell(item, item.entMuniTotal, item.idsMuniTotal, 'Muni_Total', '', 'text-indigo-700/80')}
                  {renderCell(item, item.entMuniMail, item.idsMuniMail, 'Muni_Mail', '', 'text-indigo-600/60')}
                  {renderCell(item, item.entMuniPapier, item.idsMuniPapier, 'Muni_Papier', '', 'text-indigo-600/60')}
                  {renderCell(item, item.entOtherTotal, item.idsOtherTotal, 'Autres_Total', '', 'text-cyan-700/80')}
                  {renderCell(item, item.entOtherMail, item.idsOtherMail, 'Autres_Mail', '', 'text-cyan-600/60')}
                  {renderCell(item, item.entOtherPapier, item.idsOtherPapier, 'Autres_Papier', '', 'text-cyan-600/60')}
                  {renderCell(item, item.countSor, item.idsSor, 'Sortants', 'bg-amber-50/5', 'text-amber-700/80', true)}
                </tr>
              ))}
              
              {itemsWithCounts.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="px-8 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <span className="text-4xl">📁</span>
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400">Aucune donnée trouvée en {year}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
}
