import { ODataClient } from './odata';
import { prismaSystem } from './prisma';

// Cache mémoire pour les dimensions (Structure + États)
let cachedPaths: any[] | null = null;
let cachedStatuses: any[] | null = null;
let cachedTypes: any[] | null = null;
let lastCacheUpdate: number = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

const TASK_TYPE_ID = 114; 
const DGS_ID = 269;
const DGS_LABEL = "DGS - Direction Générale des Services";

export async function getODataConfig() {
  try {
    const dbConfig = await (prismaSystem as any).AppConfig.findUnique({
      where: { key: 'odata_config' }
    });
    if (dbConfig) return JSON.parse(dbConfig.value);
  } catch (e) {}

  return {
    baseUrl: process.env.ODATA_BASE_URL || '',
    username: process.env.ODATA_USERNAME || '',
    password: process.env.ODATA_PASSWORD || ''
  };
}

export async function fetchCabinetEvolution(year: number, month?: string, filters?: any) {
  const config = await getODataConfig();
  if (!config?.baseUrl) throw new Error('OData config missing');

  const client = new ODataClient(config);

  let filter = `CreatedDate ge ${year}-01-01T00:00:00Z and CreatedDate lt ${year + 1}-01-01T00:00:00Z`;
  if (month && month !== 'all') {
    const m = parseInt(month);
    const start = `${year}-${m.toString().padStart(2, '0')}-01T00:00:00Z`;
    const nextM = m === 12 ? 1 : m + 1;
    const nextY = m === 12 ? year + 1 : year;
    const end = `${nextY}-${nextM.toString().padStart(2, '0')}-01T00:00:00Z`;
    filter = `CreatedDate ge ${start} and CreatedDate lt ${end}`;
  }

  try {
    const query = `FactDocument?$filter=${encodeURIComponent(filter)}&$select=Id,DocumentIdentifier,CreatedDate,ClosedDate,MediumId,TypeId,StateId,DirectionId`;
    let docs = await client.requestAll<any>(query);

    if (filters?.status && filters.status !== 'all') {
      const statusId = parseInt(filters.status);
      docs = docs.filter((d: any) => Number(d.StateId) === statusId);
    }

    // --- FILTRE ENTRANTS UNIQUEMENT ---
    docs = docs.filter((d: any) => d.DocumentIdentifier?.startsWith('ENT'));

    // --- KPI MUNI (Itération 3) ---
    let taskFilterStr = `RequestedDate ge ${year}-01-01T00:00:00Z and RequestedDate lt ${year + 1}-01-01T00:00:00Z and TaskProcessingTypeId eq ${TASK_TYPE_ID}`;
    if (month && month !== 'all') {
      const m = parseInt(month);
      const start = `${year}-${m.toString().padStart(2, '0')}-01T00:00:00Z`;
      const nextM = m === 12 ? 1 : m + 1;
      const nextY = m === 12 ? year + 1 : year;
      const end = `${nextY}-${nextM.toString().padStart(2, '0')}-01T00:00:00Z`;
      taskFilterStr = `RequestedDate ge ${start} and RequestedDate lt ${end} and TaskProcessingTypeId eq ${TASK_TYPE_ID}`;
    }

    const [allTasks, allPathsRaw, allTypesRaw, allStatusesRaw] = await Promise.all([
      client.requestAll<any>(`FactTask?$filter=${encodeURIComponent(taskFilterStr)}&$select=DocumentId,AssignedToStructureElementId`),
      client.requestAll<any>(`DimStructureElementPath?$select=Id,Level2,Level3,Level4,Level5,StructureElementTypeKey`),
      client.requestAll<any>("DimDocumentType?$select=Id,LabelFrFr"),
      client.requestAll<any>("DimDocumentState?$select=Id,LabelFrFr")
    ]);

    const pm = new Map();
    const pmFull = new Map();
    const EXCLUDED_NAME = "ABBAS Isabelle";
    
    allPathsRaw.forEach((p: any) => {
      const isExcluded = ["Level2", "Level3", "Level4", "Level5", "Level6"].some(k => 
        (p[k] || '').trim().toUpperCase().includes(EXCLUDED_NAME.toUpperCase())
      );
      if (isExcluded) return;

      pm.set(p.Id, p.Level2?.trim());
      pmFull.set(p.Id, p);
    });

    const d2t = new Map<number, number[]>();
    allTasks.forEach((t: any) => {
      if (!d2t.has(t.DocumentId)) d2t.set(t.DocumentId, []);
      d2t.get(t.DocumentId)!.push(t.AssignedToStructureElementId);
    });

    const muniDocIds = new Set<number>();
    docs.forEach((doc: any) => {
      const tasks = d2t.get(doc.Id) || [];
      const hasDGS = tasks.includes(DGS_ID);
      const hasSubDGS = tasks.some(id => id !== DGS_ID && pm.get(id) === DGS_LABEL);
      if (hasDGS && hasSubDGS) muniDocIds.add(doc.Id);
    });

    // --- FILTRE HIERARCHIQUE (S'APPLIQUE DÉSORMAIS AUSSI AUX KPIs GLOBAUX DU TABLEAU) ---
    const poleFilter = filters?.pole && filters.pole !== 'all' ? filters.pole : null;
    const dgaFilter = filters?.dga && filters.dga !== 'all' ? filters.dga : null;
    const dirFilter = filters?.dir && filters.dir !== 'all' ? filters.dir : null;
    const serviceFilter = filters?.service && filters.service !== 'all' ? filters.service : null;

    if (poleFilter || dgaFilter || dirFilter || serviceFilter) {
      docs = docs.filter(doc => {
        const tasks = d2t.get(doc.Id) || [];
        const paths = tasks.map(id => pmFull.get(id)).filter(Boolean);
        return paths.some(p => {
          if (poleFilter && p.Level2?.trim() !== poleFilter) return false;
          if (dgaFilter && p.Level3?.trim() !== dgaFilter) return false;
          if (dirFilter && p.Level4?.trim() !== dirFilter) return false;
          if (serviceFilter) {
             if (serviceFilter === '(Affectations directes)') {
                if ((p.Level5 || '').trim()) return false;
             } else if (p.Level5?.trim() !== serviceFilter) return false;
          }
          return true;
        });
      });
    }

    const assignedDocsGlobal = docs.filter(doc => d2t.has(doc.Id));
    const unassignedDocsGlobal = docs.filter(doc => !d2t.has(doc.Id));
    const muniDocsGlobal = docs.filter(d => muniDocIds.has(d.Id));

    const totalDocs = docs.length;
    const totalMuni = muniDocsGlobal.length;
    const totalUnassigned = unassignedDocsGlobal.length;

    const assignedDocsCount = assignedDocsGlobal.length;

    const isMonthly = !month || month === 'all';
    const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    
    let chartData: { name: string, courriers: number, courriels: number }[] = [];
    if (isMonthly) {
      chartData = Array(12).fill(0).map((_, i) => ({ name: monthNames[i], courriers: 0, courriels: 0 }));
    } else {
      const daysInMonth = new Date(year, parseInt(month || '1'), 0).getDate();
      chartData = Array(daysInMonth).fill(0).map((_, i) => ({ name: (i + 1).toString().padStart(2, '0'), courriers: 0, courriels: 0 }));
    }

    let paperCount = 0;
    let mailCount = 0;
    let noResponseCount = 0;
    let totalClosed = 0;
    let delaysTotal = 0;
    
    let slaClosedWithin = 0;
    let slaClosedExceeded = 0;
    let slaActiveWithin = 0;
    let slaActiveExceeded = 0;

    const byNature: Record<string, number> = {};

    docs.forEach((doc: any) => {
      const date = new Date(doc.CreatedDate);
      const isEmail = Number(doc.MediumId) === 88;
      let index = isMonthly ? date.getMonth() : date.getDate() - 1;
      if (index >= 0 && index < chartData.length) {
        if (isEmail) chartData[index].courriels++;
        else chartData[index].courriers++;
      }

      if (isEmail) mailCount++;
      else paperCount++;

      if (!doc.ClosedDate || doc.ClosedDate === 'null') noResponseCount++;

      const typeLabel = allTypesRaw.find((t: any) => t.Id === doc.TypeId)?.LabelFrFr || 'Autres';
      byNature[typeLabel] = (byNature[typeLabel] || 0) + 1;

      const isClosed = doc.ClosedDate && doc.ClosedDate !== 'null' && doc.ClosedDate !== '';
      const created = new Date(doc.CreatedDate);
      const end = isClosed ? new Date(doc.ClosedDate) : new Date();
      const delayDays = Math.max(0, (end.getTime() - created.getTime()) / (1000 * 3600 * 24));
      
      const tasks = d2t.get(doc.Id) || [];
      const matchingTasks = tasks.map(id => pmFull.get(id)).filter(Boolean);
      const isDrh = matchingTasks.some(p => (p.Level4 || '').trim().toUpperCase().includes('RESSOURCES HUMAINES'));
      const limit = isDrh ? 60 : 30;
      const isWithinSla = delayDays <= limit;

      if (isClosed) {
        totalClosed++;
        delaysTotal += delayDays;
        if (isWithinSla) slaClosedWithin++;
        else slaClosedExceeded++;
      } else {
        if (isWithinSla) slaActiveWithin++;
        else slaActiveExceeded++;
      }
    });

    const dgaAgg = new Map<string, { total: number, unclosed: number }>();
    const dirAgg = new Map<string, { total: number, unclosed: number, dga: string }>();
    const svcAgg = new Map<string, { total: number, unclosed: number, dga: string, dir: string }>();

    docs.forEach((doc: any) => {
      const taskElementIds = Array.from(d2t.get(doc.Id) || []);
      const paths = taskElementIds.map(id => pmFull.get(id)).filter(Boolean);
      
      const docDgas = new Set<string>();
      const docDirs = new Set<string>();
      const docSvcs = new Set<string>(); // key: dir|dga|svc
      
      const dirToHasService = new Map<string, boolean>();
      const dirToDga = new Map<string, string>();
      const svcToDir = new Map<string, {dir: string, dga: string}>();

      paths.forEach(p => {
        const dga = (p.Level3 || '').trim();
        const dir = (p.Level4 || '').trim();
        const svc = (p.Level5 || '').trim();
        
        if (dga) docDgas.add(dga);
        if (dir) {
          docDirs.add(dir);
          dirToDga.set(dir, dga);
          if (svc) {
            dirToHasService.set(dir, true);
            const svcKey = `${dir}|${dga}|${svc}`;
            docSvcs.add(svcKey);
            svcToDir.set(svcKey, { dir, dga });
          }
        }
      });

      // Special case: "(Affectations directes)" only if NO service in that direction
      docDirs.forEach(dir => {
         if (!dirToHasService.get(dir)) {
            const dga = dirToDga.get(dir) || '';
            const svcKey = `${dir}|${dga}|(Affectations directes)`;
            docSvcs.add(svcKey);
            svcToDir.set(svcKey, { dir, dga });
         }
      });

      const isClosed = doc.ClosedDate && doc.ClosedDate !== 'null' && doc.ClosedDate !== '';

      docDgas.forEach(dga => {
        if (!dgaAgg.has(dga)) dgaAgg.set(dga, { total: 0, unclosed: 0 });
        const agg = dgaAgg.get(dga)!;
        agg.total++;
        if (!isClosed) agg.unclosed++;
      });

      docDirs.forEach(dir => {
        if (!dirAgg.has(dir)) dirAgg.set(dir, { total: 0, unclosed: 0, dga: dirToDga.get(dir) || '' });
        const agg = dirAgg.get(dir)!;
        agg.total++;
        if (!isClosed) agg.unclosed++;
      });

      docSvcs.forEach(svcKey => {
        if (!svcAgg.has(svcKey)) {
          const info = svcToDir.get(svcKey)!;
          svcAgg.set(svcKey, { total: 0, unclosed: 0, dga: info.dga, dir: info.dir });
        }
        const agg = svcAgg.get(svcKey)!;
        agg.total++;
        if (!isClosed) agg.unclosed++;
      });
    });

    return {
      totalDocs,
      totalAssigned: assignedDocsGlobal.length,
      totalMuni,
      totalUnassigned,
      avgDelay: totalClosed > 0 ? Math.round(delaysTotal / totalClosed) : 0,
      paperCount,
      mailCount,
      noResponseCount,
      monthlyEvolution: chartData,
      byNature: Object.entries(byNature).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 10),
      sla: {
        closed: { within: slaClosedWithin, exceeded: slaClosedExceeded },
        active: { within: slaActiveWithin, exceeded: slaActiveExceeded }
      },
      byDga: Array.from(dgaAgg.entries()).map(([name, val]) => ({ name, ...val })),
      byDirection: Array.from(dirAgg.entries()).map(([name, val]) => ({ name, ...val })),
      byService: Array.from(svcAgg.entries()).map(([key, val]) => {
        const [, , svc] = key.split('|');
        return { name: svc, ...val };
      }),
      assignedIds: assignedDocsGlobal.slice(0, 50).map((d: any) => d.DocumentIdentifier),
      unassignedIds: unassignedDocsGlobal.slice(0, 50).map((d: any) => d.DocumentIdentifier),
      muniIds: muniDocsGlobal.slice(0, 50).map((d: any) => d.DocumentIdentifier),
      availableYears: [year - 1, year],
      statuses: allStatusesRaw.map((s: any) => ({ id: s.Id, name: s.LabelFrFr }))
    };

  } catch (error) {
    console.error('OData Fetch Error:', error);
    throw error;
  }
}

export async function fetchDirectHierarchy(year: number, filters?: any) {
  const config = await getODataConfig();
  const client = new ODataClient(config);

  let taskFilterStr = `RequestedDate ge ${year}-01-01T00:00:00Z and RequestedDate lt ${year + 1}-01-01T00:00:00Z and TaskProcessingTypeId eq ${TASK_TYPE_ID}`;
  let docFilterStr = `CreatedDate ge ${year}-01-01T00:00:00Z and CreatedDate lt ${year + 1}-01-01T00:00:00Z and startswith(DocumentIdentifier, 'ENT')`;
  
  if (filters?.month && filters.month !== 'all') {
    const m = parseInt(filters.month);
    const start = `${year}-${m.toString().padStart(2, '0')}-01T00:00:00Z`;
    const nextM = m === 12 ? 1 : m + 1;
    const nextY = m === 12 ? year + 1 : year;
    const end = `${nextY}-${nextM.toString().padStart(2, '0')}-01T00:00:00Z`;
    taskFilterStr = `RequestedDate ge ${start} and RequestedDate lt ${end} and TaskProcessingTypeId eq ${TASK_TYPE_ID}`;
    docFilterStr = `CreatedDate ge ${start} and CreatedDate lt ${end} and startswith(DocumentIdentifier, 'ENT')`;
  }
  
  const [allDocsRaw, allTasksRaw, allPathsRaw, allStatusesRaw] = await Promise.all([
    client.requestAll<any>(`FactDocument?$filter=${encodeURIComponent(docFilterStr)}&$select=Id,StateId`),
    client.requestAll<any>(`FactTask?$filter=${encodeURIComponent(taskFilterStr)}&$select=DocumentId,AssignedToStructureElementId`),
    client.requestAll<any>(`DimStructureElementPath?$select=Id,Level2,Level3,Level4,Level5`),
    client.requestAll<any>("DimDocumentState?$select=Id,LabelFrFr")
  ]);

  const relevantDocIds = new Set(allDocsRaw.map(d => d.Id));
  if (filters?.status && filters.status !== 'all') {
    const statusId = parseInt(filters.status);
    // Note: status filter on hierarchy counts is more complex, here we filter the doc set
    // But we need StateId from docs, adding it to select
  }

  const pmFull = new Map();
  allPathsRaw.forEach((p: any) => { pmFull.set(p.Id, p); });

  const poleMap = new Map<string, Set<number>>();
  const dgaMap = new Map<string, Set<number>>();
  const dirMap = new Map<string, Set<number>>();
  const svcMap = new Map<string, Set<number>>();

  const statusId = filters?.status && filters.status !== 'all' ? parseInt(filters.status) : null;

  allTasksRaw.forEach((t: any) => {
    if (!relevantDocIds.has(t.DocumentId)) return;
    
    // Status filter
    if (statusId) {
      const doc = allDocsRaw.find(d => d.Id === t.DocumentId);
      if (doc && Number(doc.StateId) !== statusId) return;
    }

    const p = pmFull.get(t.AssignedToStructureElementId);
    if (p) {
      const pole = p.Level2?.trim();
      const dga = p.Level3?.trim();
      const dir = p.Level4?.trim();
      const svc = p.Level5?.trim();

      if (pole) {
        if (!poleMap.has(pole)) poleMap.set(pole, new Set());
        poleMap.get(pole)!.add(t.DocumentId);
      }
      
      if (dga && (!filters.pole || filters.pole === 'all' || pole === filters.pole)) {
        if (!dgaMap.has(dga)) dgaMap.set(dga, new Set());
        dgaMap.get(dga)!.add(t.DocumentId);
      }
      
      if (dir && (!filters.dga || filters.dga === 'all' || dga === filters.dga)) {
        if (!dirMap.has(dir)) dirMap.set(dir, new Set());
        dirMap.get(dir)!.add(t.DocumentId);
      }
      
      if (svc && (!filters.dir || filters.dir === 'all' || dir === filters.dir)) {
        if (!svcMap.has(svc)) svcMap.set(svc, new Set());
        svcMap.get(svc)!.add(t.DocumentId);
      }
    }
  });

  return {
    poles: Array.from(poleMap.entries()).map(([name, set]) => ({ name, count: set.size })).sort((a,b) => b.count - a.count),
    dgas: Array.from(dgaMap.entries()).map(([name, set]) => ({ name, count: set.size })).sort((a,b) => b.count - a.count),
    directions: Array.from(dirMap.entries()).map(([name, set]) => ({ name, count: set.size })).sort((a,b) => b.count - a.count),
    services: Array.from(svcMap.entries()).map(([name, set]) => ({ name, count: set.size })).sort((a,b) => b.count - a.count),
    statuses: allStatusesRaw.map((s: any) => ({ id: s.Id, name: s.LabelFrFr }))
  };
}

// Alias pour compatibilité si nécessaire
export const fetchStatsByFilters = fetchCabinetEvolution;
