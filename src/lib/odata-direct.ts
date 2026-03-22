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
      // Pour filtrer par pôle/direction/service, on utilise un créneau de tâches plus large (+15 jours) 
      // pour capter les réaffectations qui arrivent après la création du doc.
      const taskStart = filter.match(/ge ([^ ]+)/)?.[1] || `${year}-01-01T00:00:00Z`;
      const docEnd = filter.match(/lt ([^ ]+)/)?.[1] || `${year + 1}-01-01T00:00:00Z`;
      const taskEndDate = new Date(docEnd);
      taskEndDate.setDate(taskEndDate.getDate() + 15);
      const taskEnd = taskEndDate.toISOString();

      const taskFilter = `RequestedDate ge ${taskStart} and RequestedDate lt ${taskEnd} and TaskProcessingTypeId eq 114`;
      
      const [taskDocs, allPathsRaw] = await Promise.all([
        client.requestAll<any>(`FactTask?$filter=${encodeURIComponent(taskFilter)}&$select=DocumentId,AssignedToStructureElementId,TaskNumber&$orderby=TaskNumber desc`),
        (cachedPaths && Date.now() - lastCacheUpdate < CACHE_TTL) 
          ? Promise.resolve(cachedPaths) 
          : client.requestAll<any>(`DimStructureElementPath?$select=Id,Level2,Level3,Level4,Level5`)
      ]);

      // Update cache
      if (!cachedPaths || Date.now() - lastCacheUpdate >= CACHE_TTL) {
        cachedPaths = allPathsRaw;
        lastCacheUpdate = Date.now();
      }

      // Dédoublonnage des chemins
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

      // Attribution STRICTE Tâches (Nouveau modèle v0.1.33)
      const docToAssignment = new Map<number, any>();
      
      // Surcharge: Tâche la plus RECENTE
      taskDocs.forEach((t: any) => {
        const path = pathMap.get(t.AssignedToStructureElementId);
        if (path) docToAssignment.set(t.DocumentId, path);
      });

      const initialCount = docs.length;
      docs = docs.filter((d: any) => {
        const path = docToAssignment.get(d.Id);
        if (!path) return false; // On ne compte que les docs ayant une tâche d'exécution
        
        if (filters.pole !== 'all' && path.pole !== filters.pole) return false;
        if (filters.dga !== 'all' && path.dga !== filters.dga) return false;
        if (filters.dir !== 'all' && path.dir !== filters.dir) return false;
        if (filters.service !== 'all' && path.service !== filters.service) return false;
        return true;
      });
      console.log(`[DEBUG STATS] Strict Task Filter: ${initialCount} -> ${docs.length}`);
    }

    const totalTasks = 0; // Désactivé pour performance (Focus Courriers)

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
      totalTasks: totalTasks,
      monthlyEvolution: chartData
    };
  } catch (err: any) {
    console.error(`[OData-Direct] Error in fetchDirectStats:`, err.message);
    throw err;
  }
}

export async function fetchDirectHierarchy(year: number, filters?: { pole: string, dga: string, dir: string, month?: string, status?: string }) {
  try {
    const config = await getODataConfig();
    if (!config?.baseUrl) throw new Error('OData config missing');
    const client = new ODataClient(config);

    // 1. On identifie d'abord les documents CRÉÉS dans la période sélectionnée
    let startDate = `${year}-01-01T00:00:00Z`;
    let endDate = `${year + 1}-01-01T00:00:00Z`;
    let docFilter = `CreatedDate ge ${startDate} and CreatedDate lt ${endDate}`;

    if (filters?.month && filters.month !== 'all') {
      const m = parseInt(filters.month);
      startDate = `${year}-${m.toString().padStart(2, '0')}-01T00:00:00Z`;
      const nextM = m === 12 ? 1 : m + 1;
      const nextY = m === 12 ? year + 1 : year;
      endDate = `${nextY}-${nextM.toString().padStart(2, '0')}-01T00:00:00Z`;
      docFilter = `CreatedDate ge ${startDate} and CreatedDate lt ${endDate}`;
    }

    if (filters?.status && filters.status !== 'all') {
      docFilter += ` and StateId eq ${filters.status}`;
    }

    // 2. On récupère les dimensions (États, Structure), les documents et les tâches
    const tasksFilter = `RequestedDate ge ${startDate} and RequestedDate lt ${endDate} and TaskProcessingTypeId eq 114`;
    
    const [yearDocs, statesRaw, allPathsRaw, taskDocs] = await Promise.all([
      client.requestAll<any>(`FactDocument?$filter=${encodeURIComponent(docFilter)}&$select=Id,DirectionId`), 
      (cachedStatuses && Date.now() - lastCacheUpdate < CACHE_TTL) 
        ? Promise.resolve({ value: cachedStatuses }) 
        : client.request<any>('DimDocumentState?$select=Id,LabelFrFr'),
      (cachedPaths && Date.now() - lastCacheUpdate < CACHE_TTL) 
        ? Promise.resolve(cachedPaths) 
        : client.requestAll<any>("DimStructureElementPath?$select=Id,Level2,Level3,Level4,Level5,StructureElementTypeKey"),
      client.requestAll<any>(`FactTask?$filter=${encodeURIComponent(tasksFilter)}&$select=DocumentId,AssignedToStructureElementId,TaskNumber&$orderby=TaskNumber`)
    ]);

    // Update cache
    if (!cachedPaths || Date.now() - lastCacheUpdate >= CACHE_TTL) {
      cachedPaths = allPathsRaw;
      cachedStatuses = statesRaw.value || [];
      lastCacheUpdate = Date.now();
    }

    const statuses = (statesRaw.value || []).map((s: any) => ({
      id: s.Id,
      name: s.LabelFrFr || s.Label
    }));

    // 4. Attribution STRICTE Tâches (v0.1.35) - Fini le DirectionId polluant
    const docToElement: Record<number, number> = {};
    const yearDocIds = new Set(yearDocs.map((d: any) => d.Id));
    
    // On ne prend QUE les tâches d'exécution
    taskDocs.forEach((t: any) => {
      // Le dernier task (orderby desc) gagne pour l'attribution
      if (yearDocIds.has(t.DocumentId) && !docToElement[t.DocumentId]) {
        docToElement[t.DocumentId] = t.AssignedToStructureElementId;
      }
    });

    console.log(`[DEBUG COUNTS] yearDocIds: ${yearDocIds.size} | docToElement: ${Object.keys(docToElement).length}`);

    console.log(`[DEBUG COUNTS] yearDocIds: ${yearDocIds.size} | docToElement: ${Object.keys(docToElement).length}`);

    // Dédoublonnage des chemins : un seul chemin par Id pour éviter le double comptage
    const allPaths: any[] = [];
    const seenElementIds = new Set<number>();
    allPathsRaw.forEach((p: any) => {
      if (!seenElementIds.has(p.Id)) {
        seenElementIds.add(p.Id);
        allPaths.push(p);
      }
    });
    
    // Filtrage sur les chemins uniques
    const structurePaths = allPaths.filter((p: any) => p.StructureElementTypeKey === 'SERVICE' || !p.StructureElementTypeKey || p.StructureElementTypeKey === '');
    console.log(`[DEBUG HIERARCHY] allPaths: ${allPaths.length} | structurePaths: ${structurePaths.length}`);

    const countsByElementId: Record<number, Set<number>> = {};
    Object.entries(docToElement).forEach(([docId, elementId]) => {
      if (!countsByElementId[elementId]) countsByElementId[elementId] = new Set();
      countsByElementId[elementId].add(parseInt(docId));
    });

    console.log(`[DEBUG COUNTS] yearDocIds: ${yearDocIds.size} | docToElement: ${Object.keys(docToElement).length}`);
    const sampleIds = Array.from(yearDocIds).slice(0, 5);
    console.log(`[DEBUG COUNTS] sample yearDocIds: ${sampleIds.join(', ')}`);

    const getHierarchyWithCounts = (level: string, currentFilters?: any) => {
      const idsByName: Record<string, Set<number>> = {};
      
      // 1. Initialisation des noms basés sur la structure administrative
      let validStructs = structurePaths;
      if (currentFilters) {
        if (currentFilters.pole && currentFilters.pole !== 'all') {
          validStructs = validStructs.filter((p: any) => p.Level2?.trim() === currentFilters.pole);
        }
        if (currentFilters.dga && currentFilters.dga !== 'all') {
          validStructs = validStructs.filter((p: any) => p.Level3?.trim() === currentFilters.dga);
        }
        if (currentFilters.dir && currentFilters.dir !== 'all') {
          validStructs = validStructs.filter((p: any) => p.Level4?.trim() === currentFilters.dir);
        }
      }
      
      const validNames = new Set(validStructs.map((p: any) => (p[level] || '').trim()).filter(Boolean));
      validNames.forEach(name => idsByName[name as string] = new Set());

      // 2. AJOUT des catégories spéciales au niveau SERVICE (Level5)
      if (level === 'Level5' && currentFilters?.dir && currentFilters.dir !== 'all') {
        const directLabel = `(Affectations directes)`;
        idsByName[directLabel] = new Set();
        
        allPaths.forEach((p: any) => {
          if (p.Level4?.trim() === currentFilters.dir) {
             const typeKey = (p.StructureElementTypeKey || '').toUpperCase();

             // Cas 1: Affectation directe à la Direction (pas de Level5 → ID du service/direction lui-même)
             if (!p.Level5) {
                idsByName[directLabel].add(p.Id);
             }
             // Cas 2: Individus (USER ou type inconnu avec Level5/6 renseigné)
             else if (typeKey === 'USER' || (typeKey !== 'SERVICE' && p.Level5)) {
                const userName = (p.Level5 || p.Level6 || "Agent Individuel").trim();
                const finalName = (userName === currentFilters.dir) ? `${userName} (Individuel)` : userName;
                if (!idsByName[finalName]) idsByName[finalName] = new Set();
                idsByName[finalName].add(p.Id);
             }
             // Cas 3: Services standards (Level5 + type SERVICE ou vide)
             else if (p.Level5 && (typeKey === 'SERVICE' || typeKey === '')) {
                const sName = p.Level5.trim();
                if (!idsByName[sName]) idsByName[sName] = new Set();
                idsByName[sName].add(p.Id);
             }
          }
        });
      } else {
        // Logique standard pour Pôle, DGA, Direction
        allPaths.forEach(p => {
          const name = (p[level] || '').trim();
          if (name && idsByName.hasOwnProperty(name)) {
            let matches = true;
            if (currentFilters) {
              if (currentFilters.pole && currentFilters.pole !== 'all' && p.Level2?.trim() !== currentFilters.pole) matches = false;
              if (currentFilters.dga && currentFilters.dga !== 'all' && p.Level3?.trim() !== currentFilters.dga) matches = false;
              if (currentFilters.dir && currentFilters.dir !== 'all' && p.Level4?.trim() !== currentFilters.dir) matches = false;
            }
            if (matches && p.Id) {
              idsByName[name].add(p.Id);
            }
          }
        });
      }

      // 3. Calcul final des comptes uniques par entité
      const map: Record<string, number> = {};
      
      // On veut que la somme des entités soit cohérente avec le total global.
      // Un document ne doit pas être compté deux fois dans deux entités différentes DU MÊME NIVEAU.
      const globallySeenInThisLevel = new Set<number>();

      // On traite les entités dans l'ordre (le premier qui "prend" le doc le garde)
      Object.entries(idsByName).forEach(([name, idSet]) => {
        const uniqueDocsInEntity = new Set<number>();
        idSet.forEach(structId => {
          if (countsByElementId[structId]) {
            countsByElementId[structId].forEach(docId => {
              if (!globallySeenInThisLevel.has(docId)) {
                uniqueDocsInEntity.add(docId);
              }
            });
          }
        });
        
        if (uniqueDocsInEntity.size > 0) {
          map[name] = uniqueDocsInEntity.size;
          uniqueDocsInEntity.forEach(id => globallySeenInThisLevel.add(id));
        }
      });
      
      const totalSum = Object.values(map).reduce((a, b) => a + b, 0);
      console.log(`[DEBUG HIERARCHY] Total unique docs seen in this level (${level}): ${globallySeenInThisLevel.size} | Sum of map: ${totalSum}`);

      return Object.entries(map)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([name, count]) => ({ name, count }));
    };

    return {
      poles: getHierarchyWithCounts('Level2'), // Pôles globaux
      dgas: getHierarchyWithCounts('Level3', filters),
      directions: getHierarchyWithCounts('Level4', filters),
      services: getHierarchyWithCounts('Level5', filters),
      statuses
    };
  } catch (err: any) {
    console.error(`[OData-Direct] Error in fetchDirectHierarchy:`, err.message);
    throw err;
  }
}

export async function fetchCabinetEvolution(year: number, month?: string) {
  const config = await getODataConfig();
  if (!config?.baseUrl) throw new Error('OData config missing');
  const client = new ODataClient(config);

  try {
    const isMonthly = !month || month === 'all';
    let docFilter = `CreatedDate ge ${year}-01-01T00:00:00Z and CreatedDate lt ${year + 1}-01-01T00:00:00Z`;
    if (!isMonthly) {
      const m = parseInt(month || '1');
      const start = `${year}-${m.toString().padStart(2, '0')}-01T00:00:00Z`;
      const nextM = m === 12 ? 1 : m + 1;
      const nextY = m === 12 ? year + 1 : year;
      const end = `${nextY}-${nextM.toString().padStart(2, '0')}-01T00:00:00Z`;
      docFilter = `CreatedDate ge ${start} and CreatedDate lt ${end}`;
    }

    // Provision de tâches un peu plus large (+15j)
    const taskEnd = new Date(year + 1, 0, 15).toISOString();
    const taskFilter = `RequestedDate ge ${year}-01-01T00:00:00Z and RequestedDate lt ${taskEnd} and TaskProcessingTypeId eq 114`;

    // 1. Chargement Parallèle (Docs + Tâches + Dimensions)
    const [docs, taskDocs, allPathsRaw, allTypesRaw] = await Promise.all([
      client.requestAll<any>(`FactDocument?$filter=${encodeURIComponent(docFilter)}&$select=Id,CreatedDate,ClosedDate,MediumId,TypeId,StateId`),
      client.requestAll<any>(`FactTask?$filter=${encodeURIComponent(taskFilter)}&$select=DocumentId,AssignedToStructureElementId,TaskNumber`),
      (cachedPaths && Date.now() - lastCacheUpdate < CACHE_TTL) ? Promise.resolve(cachedPaths) : client.requestAll<any>("DimStructureElementPath?$select=Id,Level2,Level3,Level4,Level5"),
      (cachedTypes && Date.now() - lastCacheUpdate < CACHE_TTL) ? Promise.resolve(cachedTypes) : client.requestAll<any>("DimDocumentType?$select=Id,LabelFrFr")
    ]);

    // Update Cache
    if (!cachedPaths || Date.now() - lastCacheUpdate >= CACHE_TTL) {
      cachedPaths = allPathsRaw;
      cachedTypes = allTypesRaw;
      lastCacheUpdate = Date.now();
    }

    const pathMap = new Map();
    allPathsRaw.forEach((p: any) => {
      pathMap.set(p.Id, {
        isMuni: p.Level2?.startsWith('CABINET DU MAIRE'),
        pole: p.Level2?.trim(),
        dga: p.Level3?.trim(),
        dir: p.Level4?.trim(),
        service: p.Level5?.trim()
      });
    });

    const typeMap = new Map();
    allTypesRaw.forEach((t: any) => typeMap.set(t.Id, t.LabelFrFr));

    // 2. Classification et Affectations
    const docToTasks = new Map<number, any[]>();
    taskDocs.forEach((t: any) => {
      if (!docToTasks.has(t.DocumentId)) docToTasks.set(t.DocumentId, []);
      docToTasks.get(t.DocumentId)?.push(t);
    });

    const chartSize = isMonthly ? 12 : new Date(year, parseInt(month || '1'), 0).getDate();
    const entrants = {
      total: docs.length,
      paperCount: 0,
      mailCount: 0,
      noResponseCount: 0,
      muniCount: 0,
      courantCount: 0,
      sharedCount: 0,
      byMonth: Array(chartSize).fill(0).map(() => ({ courriers: 0, courriels: 0 })),
      byNature: {} as Record<string, number>,
      deadlines: { within30: 0, within60: 0, exceeded: 0 }
    };

    const assignmentsSet = new Map<string, any>();
    let totalDelayDays = 0;
    let closedCount = 0;

    docs.forEach((doc: any) => {
      const date = new Date(doc.CreatedDate);
      const isEmail = Number(doc.MediumId) === 88;
      const index = isMonthly ? date.getMonth() : date.getDate() - 1;
      
      // Basic Stats
      if (index >= 0 && index < chartSize) {
        if (isEmail) { entrants.byMonth[index].courriels++; entrants.mailCount++; }
        else { entrants.byMonth[index].courriers++; entrants.paperCount++; }
      }
      if (doc.StateId !== 45 && doc.StateId !== 46) entrants.noResponseCount++;

      // Nature (Thématique)
      const nature = typeMap.get(doc.TypeId) || 'Autre';
      entrants.byNature[nature] = (entrants.byNature[nature] || 0) + 1;

      // Classification Muni/Courant
      const tasks = docToTasks.get(doc.Id) || [];
      let isMuni = false;
      let isCourant = false;
      
      tasks.forEach((t: any) => {
        const path = pathMap.get(t.AssignedToStructureElementId);
        if (path) {
          if (path.isMuni) isMuni = true;
          else isCourant = true;
          
          // Accumulate assignments for the table
          const key = `${path.dir}|${path.service}`;
          if (!assignmentsSet.has(key)) {
            assignmentsSet.set(key, { direction: path.dir, dga: path.dga, service: path.service, count: 0 });
          }
          assignmentsSet.get(key).count++;
        }
      });

      if (isMuni && isCourant) entrants.sharedCount++;
      else if (isMuni) entrants.muniCount++;
      else if (isCourant) entrants.courantCount++;

      // Delays (SLA)
      if (doc.ClosedDate) {
        const closed = new Date(doc.ClosedDate);
        const diff = Math.ceil((closed.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (diff >= 0) {
          totalDelayDays += diff;
          closedCount++;
          if (diff <= 30) entrants.deadlines.within30++;
          else if (diff <= 60) entrants.deadlines.within60++;
          else entrants.deadlines.exceeded++;
        }
      }
    });

    return {
      availableYears: [2026, 2025, 2024],
      entrants,
      assignments: Array.from(assignmentsSet.values()),
      averageDelay: closedCount > 0 ? totalDelayDays / closedCount : 0
    };
  } catch (err: any) {
    console.error(`[OData-Direct] Error in fetchCabinetStats:`, err.message);
    throw err;
  }
}
