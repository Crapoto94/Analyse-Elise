import { ODataClient } from './odata';
import { prismaSystem } from './prisma';

// Cache mémoire pour les dimensions (Structure + États)
let cachedPaths: any[] | null = null;
let cachedStatuses: any[] | null = null;
let cachedTypes: any[] | null = null;
let lastCacheUpdate: number = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

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

export async function fetchStatsByFilters(year: number, month?: string, filters?: any) {
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
    const query = `FactDocument?$filter=${encodeURIComponent(filter)}&$select=Id,DocumentIdentifier,CreatedDate,MediumId,TypeId,StateId,DirectionId`;
    let docs = await client.requestAll<any>(query);

    if (filters?.status && filters.status !== 'all') {
      const statusId = parseInt(filters.status);
      docs = docs.filter((d: any) => Number(d.StateId) === statusId);
    }

    if (filters && (filters.pole !== 'all' || filters.dga !== 'all' || filters.dir !== 'all' || filters.service !== 'all')) {
      const taskStart = filter.match(/ge ([^ ]+)/)?.[1] || `${year}-01-01T00:00:00Z`;
      const docEnd = filter.match(/lt ([^ ]+)/)?.[1] || `${year + 1}-01-01T00:00:00Z`;
      const taskEndDate = new Date(docEnd);
      taskEndDate.setDate(taskEndDate.getDate() + 15);
      const taskEnd = taskEndDate.toISOString();

      const taskFilter = `RequestedDate ge ${taskStart} and RequestedDate lt ${taskEnd} and TaskProcessingTypeId eq 114`;
      
      const [taskDocsRaw, allPathsRaw] = await Promise.all([
        client.requestAll<any>(`FactTask?$filter=${encodeURIComponent(taskFilter)}&$select=DocumentId,AssignedToStructureElementId,TaskNumber&$orderby=TaskNumber desc`),
        (cachedPaths && Date.now() - lastCacheUpdate < CACHE_TTL) 
          ? Promise.resolve(cachedPaths) 
          : client.requestAll<any>(`DimStructureElementPath?$select=Id,Level2,Level3,Level4,Level5`)
      ]);

      const yearDocIds = new Set(docs.map((d: any) => d.Id));
      const taskDocs = taskDocsRaw.filter((t: any) => yearDocIds.has(t.DocumentId));

      if (!cachedPaths || Date.now() - lastCacheUpdate >= CACHE_TTL) {
        cachedPaths = allPathsRaw;
        lastCacheUpdate = Date.now();
      }

      const pathMap = new Map();
      allPathsRaw.forEach((p: any) => {
        if (!pathMap.has(p.Id)) {
          pathMap.set(p.Id, {
            pole: p.Level2?.trim(),
            dga: p.Level3?.trim(),
            dir: p.Level4?.trim(),
            service: p.Level5?.trim()
          });
        }
      });

      const docToPaths = new Map<number, any[]>();
      taskDocs.forEach((t: any) => {
        const path = pathMap.get(t.AssignedToStructureElementId);
        if (path) {
           if (!docToPaths.has(t.DocumentId)) docToPaths.set(t.DocumentId, []);
           docToPaths.get(t.DocumentId)!.push(path);
        }
      });

      docs = docs.filter((d: any) => {
        const paths = docToPaths.get(d.Id);
        if (!paths || paths.length === 0) return false; 
        
        return paths.some(path => {
          if (filters.pole !== 'all' && path.pole !== filters.pole) return false;
          if (filters.dga !== 'all' && path.dga !== filters.dga) return false;
          if (filters.dir !== 'all' && path.dir !== filters.dir) return false;
          if (filters.service !== 'all') {
            if (filters.service === '(Affectations directes)') {
              if (path.service) return false;
            } else if (path.service !== filters.service) return false;
          }
          return true;
        });
      });
    }

    const isMonthly = !month || month === 'all';
    const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    
    let chartData: { name: string, courriers: number, courriels: number }[] = [];
    if (isMonthly) {
      chartData = Array(12).fill(0).map((_, i) => ({ name: monthNames[i], courriers: 0, courriels: 0 }));
    } else {
      const daysInMonth = new Date(year, parseInt(month || '1'), 0).getDate();
      chartData = Array(daysInMonth).fill(0).map((_, i) => ({ name: (i + 1).toString().padStart(2, '0'), courriers: 0, courriels: 0 }));
    }

    docs.forEach((doc: any) => {
      const date = new Date(doc.CreatedDate);
      const isEmail = Number(doc.MediumId) === 88;
      let index = isMonthly ? date.getMonth() : date.getDate() - 1;
      if (index >= 0 && index < chartData.length) {
        if (isEmail) chartData[index].courriels++;
        else chartData[index].courriers++;
      }
    });

    return {
      totalDocs: docs.length,
      totalTasks: 0,
      monthlyEvolution: chartData
    };
  } catch (err: any) {
    console.error(`[OData-Direct] Error in fetchStatsByFilters:`, err.message);
    throw err;
  }
}

export async function fetchDirectHierarchy(year: number, filters?: { pole: string, dga: string, dir: string, month?: string, status?: string }) {
  try {
    const config = await getODataConfig();
    const client = new ODataClient(config);

    const isMonthly = !filters?.month || filters.month === 'all';
    let startDate = `${year}-01-01T00:00:00Z`;
    let endDate = `${year + 1}-01-01T00:00:00Z`;
    if (!isMonthly) {
      const m = parseInt(filters!.month || '1');
      startDate = `${year}-${m.toString().padStart(2, '0')}-01T00:00:00Z`;
      const nextM = m === 12 ? 1 : m + 1;
      const nextY = m === 12 ? year + 1 : year;
      endDate = `${nextY}-${nextM.toString().padStart(2, '0')}-01T00:00:00Z`;
    }

    const taskEnd = new Date(year + 1, 5, 1).toISOString(); 
    const tasksFilter = `RequestedDate ge ${startDate} and RequestedDate lt ${taskEnd} and TaskProcessingTypeId eq 114`;
    
    const taskDocs = await client.requestAll<any>(`FactTask?$filter=${encodeURIComponent(tasksFilter)}&$select=DocumentId,AssignedToStructureElementId,TaskNumber&$orderby=TaskNumber`);

    const docFilter = `CreatedDate ge ${startDate} and CreatedDate lt ${endDate}${filters?.status && filters.status !== 'all' ? ` and StateId eq ${filters.status}` : ''}`;
    const yearDocsBase = await client.requestAll<any>(`FactDocument?$filter=${encodeURIComponent(docFilter)}&$select=Id,DirectionId`);
    const yearDocIdsInPeriod = new Set(yearDocsBase.map((d: any) => d.Id));

    const taskDocsFiltered = taskDocs.filter((t: any) => yearDocIdsInPeriod.has(t.DocumentId));
    const activeDocIdsFromFilteredTasks = new Set<number>(taskDocsFiltered.map((t: any) => t.DocumentId));

    const [statesRaw, allPathsRaw] = await Promise.all([
      (cachedStatuses && Date.now() - lastCacheUpdate < CACHE_TTL) ? Promise.resolve({ value: cachedStatuses }) : client.request<any>('DimDocumentState?$select=Id,LabelFrFr'),
      (cachedPaths && Date.now() - lastCacheUpdate < CACHE_TTL) ? Promise.resolve(cachedPaths) : client.requestAll<any>("DimStructureElementPath?$select=Id,Level2,Level3,Level4,Level5,StructureElementTypeKey")
    ]);

    if (!cachedPaths || Date.now() - lastCacheUpdate >= CACHE_TTL) {
      cachedPaths = allPathsRaw;
      cachedStatuses = statesRaw.value || [];
      lastCacheUpdate = Date.now();
    }

    const pathMap = new Map<number, any>(allPathsRaw.map((p: any) => [p.Id, {
      pole: (p.Level2 || '').trim(),
      dga: (p.Level3 || '').trim(),
      dir: (p.Level4 || '').trim(),
      service: (p.Level5 || '').trim(),
      typeKey: (p.StructureElementTypeKey || '').toUpperCase()
    }]));

    const docToElements: Record<number, number[]> = {};
    taskDocsFiltered.forEach((t: any) => {
      if (!docToElements[t.DocumentId]) docToElements[t.DocumentId] = [];
      docToElements[t.DocumentId].push(t.AssignedToStructureElementId);
    });

    const docPrimaryPath = new Map<number, any>();
    activeDocIdsFromFilteredTasks.forEach((docId: number) => {
      const elements = docToElements[docId] || [];
      for (const elementId of elements) {
        const p = pathMap.get(elementId);
        if (p && p.dir) {
          docPrimaryPath.set(docId, p);
          break;
        }
      }
    });

    const getHierarchyWithCounts = (level: string, currentFilters?: any) => {
      const map: Record<string, number> = {};
      activeDocIdsFromFilteredTasks.forEach((docId: number) => {
         const p = docPrimaryPath.get(docId);
         if (!p) return;

         let matches = true;
         if (currentFilters) {
            if (currentFilters.pole && currentFilters.pole !== 'all' && p.pole !== currentFilters.pole) matches = false;
            if (currentFilters.dga && currentFilters.dga !== 'all' && p.dga !== currentFilters.dga) matches = false;
            if (currentFilters.dir && currentFilters.dir !== 'all' && p.dir !== currentFilters.dir) matches = false;
         }
         if (!matches) return;

         let name = "";
         if (level === 'Level2') name = p.pole;
         else if (level === 'Level3') name = p.dga;
         else if (level === 'Level4') name = p.dir;
         else if (level === 'Level5') {
            if (!p.service) name = '(Affectations directes)';
            else if (p.typeKey === 'USER' || (p.typeKey !== 'SERVICE' && p.service)) name = (p.service === p.dir) ? `${p.service} (Individuel)` : p.service;
            else name = p.service;
         }
         if (!name && (level === 'Level3' || level === 'Level4')) name = '(Affectations directes)';
         
         if (name) map[name] = (map[name] || 0) + 1;
      });
      if (level === 'Level2' && (!currentFilters || (currentFilters.pole === 'all' && currentFilters.dga === 'all'))) {
         const unassignedCount = Array.from(yearDocIdsInPeriod).filter(id => !docToElements[id]).length;
         if (unassignedCount > 0) map["(Non affecté)"] = unassignedCount;
      }
      return Object.entries(map).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name, count]) => ({ name, count }));
    };

    return {
      poles: getHierarchyWithCounts('Level2'),
      dgas: getHierarchyWithCounts('Level3', filters),
      directions: getHierarchyWithCounts('Level4', filters),
      services: getHierarchyWithCounts('Level5', filters),
      statuses: (statesRaw.value || []).map((s: any) => ({ id: s.Id, name: s.LabelFrFr || s.Label }))
    };
  } catch (err: any) {
    console.error(`[OData-Direct] Error in fetchDirectHierarchy:`, err.message);
    throw err;
  }
}

export async function fetchCabinetEvolution(year: number, month?: string, filters?: any) {
  try {
    const config = await getODataConfig();
    const client = new ODataClient(config);

    const isMonthly = !month || month === 'all';
    let startDate = `${year}-01-01T00:00:00Z`;
    let endDate = `${year + 1}-01-01T00:00:00Z`;
    if (!isMonthly) {
      const m = parseInt(month || '1');
      startDate = `${year}-${m.toString().padStart(2, '0')}-01T00:00:00Z`;
      const nextM = m === 12 ? 1 : m + 1;
      const nextY = m === 12 ? year + 1 : year;
      endDate = `${nextY}-${nextM.toString().padStart(2, '0')}-01T00:00:00Z`;
    }

    const taskEnd = new Date(year + 1, 5, 1).toISOString(); 
    const taskFilter = `RequestedDate ge ${startDate} and RequestedDate lt ${taskEnd} and TaskProcessingTypeId eq 114`;

    const [allPathsRaw, allTypesRaw, taskDocs] = await Promise.all([
      (cachedPaths && Date.now() - lastCacheUpdate < CACHE_TTL) ? Promise.resolve(cachedPaths) : client.requestAll<any>("DimStructureElementPath?$select=Id,Level2,Level3,Level4,Level5,StructureElementTypeKey"),
      (cachedTypes && Date.now() - lastCacheUpdate < CACHE_TTL) ? Promise.resolve(cachedTypes) : client.requestAll<any>("DimDocumentType?$select=Id,LabelFrFr"),
      client.requestAll<any>(`FactTask?$filter=${encodeURIComponent(taskFilter)}&$select=DocumentId,AssignedToStructureElementId,TaskNumber&$orderby=TaskNumber`)
    ]);

    // Documents créés dans la période (Base de l'évolution et des affectations)
    const docFilter = `CreatedDate ge ${startDate} and CreatedDate lt ${endDate}`;
    const yearDocsBase = await client.requestAll<any>(`FactDocument?$filter=${encodeURIComponent(docFilter)}&$select=Id,CreatedDate,ClosedDate,MediumId,TypeId,StateId,DirectionId`);
    const yearDocIdsInPeriod = new Set(yearDocsBase.map((d: any) => d.Id));

    if (!cachedPaths || Date.now() - lastCacheUpdate >= CACHE_TTL) {
       cachedPaths = allPathsRaw; cachedTypes = allTypesRaw; lastCacheUpdate = Date.now();
    }

    const pathMap = new Map<number, any>(allPathsRaw.map((p: any) => [p.Id, {
      isMuni: (p.Level2 || '').toUpperCase().includes('CABINET'),
      pole: (p.Level2 || '').trim(), dga: (p.Level3 || '').trim(), dir: (p.Level4 || '').trim(), service: (p.Level5 || '').trim(),
      typeKey: (p.StructureElementTypeKey || '').toUpperCase()
    }]));

    const typeMap = new Map<number, string>(allTypesRaw.map((t: any) => [t.Id, t.LabelFrFr]));
    
    // Filtrer les tâches pour ne garder QUE celles des documents créés cette année
    const taskDocsFiltered = taskDocs.filter((t: any) => yearDocIdsInPeriod.has(t.DocumentId));
    
    const docToElements: Record<number, number[]> = {};
    taskDocsFiltered.forEach((t: any) => {
      if (!docToElements[t.DocumentId]) docToElements[t.DocumentId] = [];
      docToElements[t.DocumentId].push(t.AssignedToStructureElementId);
    });

    const evolutionSize = isMonthly ? 12 : new Date(year, parseInt(month || '1'), 0).getDate();
    const entrants = {
      total: yearDocsBase.length, paperCount: 0, mailCount: 0, noResponseCount: 0, muniCount: 0, courantCount: 0, sharedCount: 0,
      byMonth: Array(evolutionSize).fill(0).map(() => ({ courriers: 0, courriels: 0 })),
      byNature: {} as Record<string, number>,
      deadlines: { closed: { within30: 0, within60: 0, exceeded: 0 }, active: { within30: 0, within60: 0, exceeded: 0 } }
    };

    const assignmentsSet = new Map<string, any>();
    let totalDelayDays = 0; let closedCount = 0;

    yearDocsBase.forEach((doc: any) => {
      const isCreatedDoc = true; 
      const docDate = new Date(doc.CreatedDate);
      const isEmail = Number(doc.MediumId) === 88;
      const index = isMonthly ? docDate.getMonth() : docDate.getDate() - 1;

      if (index >= 0 && index < evolutionSize) {
         if (isEmail) { entrants.byMonth[index].courriels++; entrants.mailCount++; }
         else { entrants.byMonth[index].courriers++; entrants.paperCount++; }
         if (doc.StateId !== 45 && doc.StateId !== 46) entrants.noResponseCount++;
         const nature = typeMap.get(doc.TypeId) || 'Autre';
         entrants.byNature[nature] = (entrants.byNature[nature] || 0) + 1;
      }

      const elements = docToElements[doc.Id] || [];
      const isUnclosed = doc.ClosedDate === null;
      let isAccountedInHierarchy = false;

      for (const elementId of elements) {
         const p = pathMap.get(elementId);
         if (!p || !p.dir) continue;
         
         if (!isAccountedInHierarchy) {
            isAccountedInHierarchy = true;
            let svc = p.service || '(Affectations directes)';
            if (p.service && (p.typeKey === 'USER' || (p.typeKey !== 'SERVICE' && p.service))) {
               svc = (p.service === p.dir) ? `${p.service} (Individuel)` : p.service;
            }
            const key = `${p.dir}|${svc}`;
            if (!assignmentsSet.has(key)) assignmentsSet.set(key, { pole: p.pole, direction: p.dir, dga: p.dga, service: svc, count: 0, unclosedCount: 0 });
            assignmentsSet.get(key).count++;
            if (isUnclosed) assignmentsSet.get(key).unclosedCount++;
         }
      }

      if (elements.length > 0 && !isAccountedInHierarchy && (!filters || filters.pole === 'all')) {
         const key = "(Indéterminé)|(Indéterminé)";
         if (!assignmentsSet.has(key)) assignmentsSet.set(key, { pole: "(Indéterminé)", direction: "(Indéterminé)", dga: "(Indéterminé)", service: "(Indéterminé)", count: 0, unclosedCount: 0 });
         assignmentsSet.get(key).count++; if (isUnclosed) assignmentsSet.get(key).unclosedCount++;
      }

      if (elements.length === 0 && isCreatedDoc && (!filters || filters.pole === 'all')) {
         const key = "(Non affecté)|(Non affecté)";
         if (!assignmentsSet.has(key)) assignmentsSet.set(key, { pole: "(Non affecté)", direction: "(Non affecté)", dga: "(Non affecté)", service: "(Non affecté)", count: 0, unclosedCount: 0 });
         assignmentsSet.get(key).count++; if (isUnclosed) assignmentsSet.get(key).unclosedCount++;
      }

      if (isCreatedDoc) {
         let docIsMuni = false; let docIsCourant = false;
         elements.forEach(eid => { const p = pathMap.get(eid); if (p?.isMuni) docIsMuni = true; if (p && !p.isMuni) docIsCourant = true; });
         if (docIsMuni && docIsCourant) entrants.sharedCount++; else if (docIsMuni) entrants.muniCount++; else if (docIsCourant) entrants.courantCount++;

         if (doc.ClosedDate) {
           const closed = new Date(doc.ClosedDate);
           const diff = Math.ceil((closed.getTime() - docDate.getTime()) / (1000 * 60 * 60 * 24));
           if (diff >= 0) {
             totalDelayDays += diff; closedCount++;
             if (diff <= 30) entrants.deadlines.closed.within30++; else if (diff <= 60) entrants.deadlines.closed.within60++; else entrants.deadlines.closed.exceeded++;
           }
         } else if (doc.StateId !== 45 && doc.StateId !== 46) {
           const today = new Date();
           const diff = Math.ceil((today.getTime() - docDate.getTime()) / (1000 * 60 * 60 * 24));
           if (diff >= 0) {
             if (diff <= 30) entrants.deadlines.active.within30++; else if (diff <= 60) entrants.deadlines.active.within60++; else entrants.deadlines.active.exceeded++;
           }
         }
      }
    });

    return { availableYears: [2026, 2025, 2024, 2023, 2022, 2021, 2020], entrants, assignments: Array.from(assignmentsSet.values()), averageDelay: closedCount > 0 ? totalDelayDays / closedCount : 0 };
  } catch (err: any) {
    console.error(`[OData-Direct] Error in fetchCabinetEvolution:`, err.message);
    throw err;
  }
}
