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
    const taskFilterStr = `RequestedDate ge ${year}-01-01T00:00:00Z and RequestedDate lt ${year + 1}-02-01T00:00:00Z and TaskProcessingTypeId eq 114`;
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

    // --- FILTRE HIERARCHIQUE & REGLES ---
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

    const assignedDocs = docs.filter(doc => d2t.has(doc.Id));
    const unassignedDocs = docs.filter(doc => !d2t.has(doc.Id));
    const muniDocs = docs.filter(d => muniDocIds.has(d.Id));

    const totalDocs = docs.length;
    const totalMuni = muniDocs.length;
    const totalUnassigned = unassignedDocs.length;

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

    const assignmentsMap = new Map<string, any>();
    docs.forEach((doc: any) => {
      const taskElementIds = Array.from(d2t.get(doc.Id) || []);
      const paths = taskElementIds.map(id => pmFull.get(id)).filter(Boolean);
      const docDirections = new Map<string, { dga: string, services: Set<string> }>();
      
      paths.forEach(p => {
        const dir = (p.Level4 || '').trim();
        if (!dir) return;
        if (!docDirections.has(dir)) docDirections.set(dir, { dga: p.Level3 || '', services: new Set() });
        const svc = (p.Level5 || '').trim();
        if (svc) docDirections.get(dir)!.services.add(svc);
      });

      const isClosed = doc.ClosedDate && doc.ClosedDate !== 'null' && doc.ClosedDate !== '';
      docDirections.forEach((info, dir) => {
        if (info.services.size === 0) info.services.add('(Affectations directes)');
        info.services.forEach(svcName => {
           const key = `${dir}|${info.dga}|${svcName}`;
           if (!assignmentsMap.has(key)) assignmentsMap.set(key, { direction: dir, dga: info.dga, service: svcName, count: 0, activeCount: 0 });
           const entry = assignmentsMap.get(key);
           entry.count++;
           if (!isClosed) entry.activeCount++;
        });
      });
    });

    return {
      totalDocs,
      totalMuni,
      totalUnassigned,
      avgDelay: totalClosed > 0 ? Math.round(delaysTotal / totalClosed) : 0,
      paperCount,
      mailCount,
      noResponseCount,
      monthlyEvolution: chartData,
      byNature: Object.entries(byNature).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 10),
      byDirection: Array.from(assignmentsMap.values()),
      sla: {
        closed: { within: slaClosedWithin, exceeded: slaClosedExceeded },
        active: { within: slaActiveWithin, exceeded: slaActiveExceeded }
      },
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

  const taskFilterStr = `RequestedDate ge ${year}-01-01T00:00:00Z and TaskProcessingTypeId eq 114`;
  const [allTasksRaw, allPathsRaw, allStatusesRaw] = await Promise.all([
    client.requestAll<any>(`FactTask?$filter=${encodeURIComponent(taskFilterStr)}&$select=DocumentId,AssignedToStructureElementId`),
    client.requestAll<any>(`DimStructureElementPath?$select=Id,Level2,Level3,Level4,Level5`),
    client.requestAll<any>("DimDocumentState?$select=Id,LabelFrFr")
  ]);

  const pmFull = new Map();
  allPathsRaw.forEach((p: any) => { pmFull.set(p.Id, p); });

  const assignments: any[] = [];
  const assignedDocIds = new Set(allTasksRaw.map(t => t.DocumentId));

  allTasksRaw.forEach((t: any) => {
    const p = pmFull.get(t.AssignedToStructureElementId);
    if (p) {
      assignments.push({
        pole: p.Level2?.trim(),
        dga: p.Level3?.trim(),
        dir: p.Level4?.trim(),
        service: p.Level5?.trim()
      });
    }
  });

  const uniquePoles = Array.from(new Set(assignments.map(a => a.pole).filter(Boolean)));
  const uniqueDgas = Array.from(new Set(assignments.filter(a => !filters.pole || filters.pole === 'all' || a.pole === filters.pole).map(a => a.dga).filter(Boolean)));
  const uniqueDirs = Array.from(new Set(assignments.filter(a => !filters.dga || filters.dga === 'all' || a.dga === filters.dga).map(a => a.dir).filter(Boolean)));
  const uniqueSvcs = Array.from(new Set(assignments.filter(a => !filters.dir || filters.dir === 'all' || a.dir === filters.dir).map(a => a.service).filter(Boolean)));

  return {
    poles: uniquePoles.map(name => ({ name, count: assignments.filter(a => a.pole === name).length })),
    dgas: uniqueDgas.map(name => ({ name, count: assignments.filter(a => a.dga === name).length })),
    directions: uniqueDirs.map(name => ({ name, count: assignments.filter(a => a.dir === name).length })),
    services: uniqueSvcs.map(name => ({ name, count: assignments.filter(a => a.service === name).length })),
    statuses: allStatusesRaw.map((s: any) => ({ id: s.Id, name: s.LabelFrFr }))
  };
}

// Alias pour compatibilité si nécessaire
export const fetchStatsByFilters = fetchCabinetEvolution;
