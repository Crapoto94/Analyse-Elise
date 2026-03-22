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

      // Attribution Multi-Path
      const docToPaths = new Map<number, any[]>();
      
      taskDocs.forEach((t: any) => {
        const path = pathMap.get(t.AssignedToStructureElementId);
        if (path) {
           if (!docToPaths.has(t.DocumentId)) docToPaths.set(t.DocumentId, []);
           docToPaths.get(t.DocumentId)!.push(path);
        }
      });

      const initialCount = docs.length;
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
            } else {
              if (path.service !== filters.service) return false;
            }
          }
          return true;
        });
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

    // 4. Attribution Tâches - Permettre la multi-affectation
    const docToElements: Record<number, Set<number>> = {};
    const yearDocIds = new Set(yearDocs.map((d: any) => d.Id));
    
    // Un document obtient +1 point de comptage pour CHAQUE Direction qui a eu la tâche
    taskDocs.forEach((t: any) => {
      if (yearDocIds.has(t.DocumentId)) {
        if (!docToElements[t.DocumentId]) docToElements[t.DocumentId] = new Set();
        docToElements[t.DocumentId].add(t.AssignedToStructureElementId);
      }
    });

    console.log(`[DEBUG COUNTS] yearDocIds: ${yearDocIds.size} | docToElements: ${Object.keys(docToElements).length}`);

    // Dédoublonnage des chemins : un seul chemin par Id pour éviter le double comptage
    const allPaths: any[] = [];
    const seenElementIds = new Set<number>();
    allPathsRaw.forEach((p: any) => {
      if (!seenElementIds.has(p.Id)) {
        seenElementIds.add(p.Id);
        allPaths.push(p);
      }
    });
    
    // structurePaths inclut tous les éléments (SERVICE, USER, vide) pour montrer les 0 aussi
    const structurePaths = allPaths; // On ne filtre plus par type pour inclure individus et entités é 0
    console.log(`[DEBUG HIERARCHY] allPaths: ${allPaths.length} | structurePaths: ${structurePaths.length}`);

    const countsByElementId: Record<number, Set<number>> = {};
    Object.entries(docToElements).forEach(([docIdStr, elementIds]) => {
      const docId = parseInt(docIdStr);
      elementIds.forEach(elementId => {
         if (!countsByElementId[elementId]) countsByElementId[elementId] = new Set();
         countsByElementId[elementId].add(docId);
      });
    });

    console.log(`[DEBUG COUNTS] yearDocIds: ${yearDocIds.size} | affected docs count: ${Object.keys(docToElements).length}`);
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
        if (level === 'Level3' || level === 'Level4') {
           idsByName['(Affectations directes)'] = new Set();
        }
        
        allPaths.forEach(p => {
          let name = (p[level] || '').trim();
          if (!name && (level === 'Level3' || level === 'Level4')) {
             name = '(Affectations directes)';
          }

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

      // 3. Calcul final des comptes uniques par entité avec PURGE des Affectations directes (Anti-Redondance Verticale)
      const map: Record<string, number> = {};
      const directKey = '(Affectations directes)';
      
      const docsInSpecificEntities = new Set<number>();
      const specificEntitiesMap: Record<string, Set<number>> = {};
      let directDocsSet = new Set<number>();

      Object.entries(idsByName).forEach(([name, idSet]) => {
        const uniqueDocsInEntity = new Set<number>();
        idSet.forEach(structId => {
          if (countsByElementId[structId]) {
            countsByElementId[structId].forEach(docId => {
               uniqueDocsInEntity.add(docId);
            });
          }
        });
        
        if (name === directKey) {
           directDocsSet = uniqueDocsInEntity;
        } else {
           specificEntitiesMap[name] = uniqueDocsInEntity;
           uniqueDocsInEntity.forEach(id => docsInSpecificEntities.add(id));
        }
      });
      
      // Affectations directes ne garde QUE les orphelins (Ceux qui n'ont aucune affectation plus spécifique au même niveau)
      const filteredDirectDocs = new Set([...directDocsSet].filter(id => !docsInSpecificEntities.has(id)));
      
      // Alimentation Finale
      if (filteredDirectDocs.size > 0) {
        map[directKey] = filteredDirectDocs.size;
      }
      Object.entries(specificEntitiesMap).forEach(([name, uniqueSet]) => {
        if (uniqueSet.size > 0) map[name] = uniqueSet.size;
      });
      
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

export async function fetchCabinetEvolution(year: number, month?: string, filters?: any) {
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

    // Provision de tâches beaucoup plus large (+6 mois de N+1) pour capter les affectations tardives
    const taskEnd = new Date(year + 1, 5, 1).toISOString(); // 1er Juin N+1
    const taskFilter = `RequestedDate ge ${year}-01-01T00:00:00Z and RequestedDate lt ${taskEnd} and TaskProcessingTypeId eq 114`;

    // DEBUG DUMP TASK TYPES
    const taskTypesRaw = await client.requestAll<any>("DimTaskProcessingType?$select=Id,LabelFrFr");
    require('fs').writeFileSync('c:/dev/Stat_Elise_New/tasktypes.json', JSON.stringify(taskTypesRaw, null, 2));

    const [docsRaw, taskDocs, allPathsRaw, allTypesRaw] = await Promise.all([
      client.requestAll<any>(`FactDocument?$filter=${encodeURIComponent(docFilter)}&$select=Id,CreatedDate,ClosedDate,MediumId,TypeId,StateId`),
      client.requestAll<any>(`FactTask?$filter=${encodeURIComponent(taskFilter)}&$select=DocumentId,AssignedToStructureElementId,TaskNumber`),
      (cachedPaths && Date.now() - lastCacheUpdate < CACHE_TTL) ? Promise.resolve(cachedPaths) : client.requestAll<any>("DimStructureElementPath?$select=Id,Level2,Level3,Level4,Level5,StructureElementTypeKey"),
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
        isMuni: p.Level2?.toUpperCase().includes('CABINET'),
        pole: p.Level2?.trim(),
        dga: p.Level3?.trim(),
        dir: p.Level4?.trim(),
        service: p.Level5?.trim(),
        typeKey: p.StructureElementTypeKey?.toUpperCase() || ''
      });
    });

    const typeMap = new Map();
    allTypesRaw.forEach((t: any) => typeMap.set(t.Id, t.LabelFrFr));

    // 2. Classification et Affectations
    const docToTasks = new Map<number, any[]>();
    const uniqueLevel2 = new Set<string>();
    
    taskDocs.forEach(t => {
      const p = pathMap.get(t.AssignedToStructureElementId);
      if (p?.pole) uniqueLevel2.add(p.pole);
      
      // Historique complet pour de multiples affectations
      if (!docToTasks.has(t.DocumentId)) docToTasks.set(t.DocumentId, []);
      docToTasks.get(t.DocumentId)?.push(t);
    });

    console.log(`[DEBUG CABINET] Unique Level2 found in Tasks:`, Array.from(uniqueLevel2));

    let docs = docsRaw;
    // Pré-filtrage global des documents (état et hiérarchie)
    if (filters && (filters.status !== 'all' || filters.pole !== 'all' || filters.dga !== 'all' || filters.dir !== 'all' || filters.service !== 'all')) {
      docs = docs.filter((doc: any) => {
        // Filter by status
        if (filters.status && filters.status !== 'all') {
          const statusId = parseInt(filters.status);
          if (doc.StateId !== statusId) return false;
        }

        // Filter by hierarchy (Si un document a AU MOINS UNE TACHE qui matche le filtre, on le garde)
        if (filters.pole !== 'all' || filters.dga !== 'all' || filters.dir !== 'all' || filters.service !== 'all') {
          const tasks = docToTasks.get(doc.Id) || [];
          let hasMatchingTask = false;
          for (const t of tasks) {
            const path = pathMap.get(t.AssignedToStructureElementId);
            if (path) {
              let match = true;
              if (filters.pole !== 'all' && path.pole !== filters.pole) match = false;
              if (filters.dga !== 'all' && path.dga !== filters.dga) match = false;
              if (filters.dir !== 'all' && path.dir !== filters.dir) match = false;
              if (filters.service !== 'all') {
                if (filters.service === '(Affectations directes)') {
                   if (path.service) match = false;
                } else {
                   if (path.service !== filters.service) match = false;
                }
              }
              if (match) hasMatchingTask = true;
            }
          }
          if (!hasMatchingTask) return false;
        }
        return true;
      });
    }

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
      deadlines: { 
        closed: { within30: 0, within60: 0, exceeded: 0 },
        active: { within30: 0, within60: 0, exceeded: 0 }
      }
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

      const tasks = docToTasks.get(doc.Id) || [];
      let isMuni = false;
      let isCourant = false;
      
      // La qualification Muni/Courant dépend de tout l'historique du document
      tasks.forEach((t: any) => {
        const p = pathMap.get(t.AssignedToStructureElementId);
        if (p?.isMuni) isMuni = true;
        if (p && !p.isMuni) isCourant = true;
      });

      const dirToServices = new Map<string, Map<string, any>>(); // dirName -> Map<serviceName, pathObj>
      let dirToDirectPath = new Map<string, any>(); // dirName -> pathObj

      tasks.forEach((t: any) => {
        const path = pathMap.get(t.AssignedToStructureElementId);
        if (path) {
          let addIt = true;
          if (filters) {
            if (filters.pole !== 'all' && path.pole !== filters.pole) addIt = false;
            if (filters.dga !== 'all' && path.dga !== filters.dga) addIt = false;
            if (filters.dir !== 'all' && path.dir !== filters.dir) addIt = false;
            if (filters.service !== 'all') {
              if (filters.service === '(Affectations directes)' && path.service) addIt = false;
              if (filters.service !== '(Affectations directes)' && path.service !== filters.service) addIt = false;
            }
          }
          
          if (addIt) {
              const dirName = path.dir || '(Indéterminé)';
              let serviceName = null;
              
              if (!path.service) {
                 dirToDirectPath.set(dirName, path);
              } 
              else if (path.typeKey === 'USER' || (path.typeKey !== 'SERVICE' && path.service)) {
                 const userName = path.service;
                 serviceName = (userName === dirName) ? `${userName} (Individuel)` : userName;
              }
              else if (path.service && (path.typeKey === 'SERVICE' || path.typeKey === '')) {
                 serviceName = path.service;
              }

              if (serviceName) {
                 if (!dirToServices.has(dirName)) dirToServices.set(dirName, new Map());
                 dirToServices.get(dirName)?.set(serviceName, path);
              }
          }
        }
      });

      // Appliquer l'Anti-Redondance Verticale ET ajouter à assignmentsSet
      Array.from(dirToServices.entries()).forEach(([dirName, servicesMap]) => {
         Array.from(servicesMap.entries()).forEach(([svc, pathObj]) => {
             const key = `${dirName}|${svc}`;
             if (!assignmentsSet.has(key)) {
                assignmentsSet.set(key, { direction: pathObj.dir, dga: pathObj.dga, service: svc, count: 0 });
             }
             assignmentsSet.get(key).count++;
         });
      });

      Array.from(dirToDirectPath.entries()).forEach(([dirName, pathObj]) => {
         const services = dirToServices.get(dirName);
         if (!services || services.size === 0) {
             const key = `${dirName}|(Affectations directes)`;
             if (!assignmentsSet.has(key)) {
                assignmentsSet.set(key, { direction: pathObj.dir, dga: pathObj.dga, service: '(Affectations directes)', count: 0 });
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
          if (diff <= 30) entrants.deadlines.closed.within30++;
          else if (diff <= 60) entrants.deadlines.closed.within60++;
          else entrants.deadlines.closed.exceeded++;
        }
      } else if (doc.StateId !== 45 && doc.StateId !== 46) {
        // En Cours
        const today = new Date();
        const diff = Math.ceil((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (diff >= 0) {
          if (diff <= 30) entrants.deadlines.active.within30++;
          else if (diff <= 60) entrants.deadlines.active.within60++;
          else entrants.deadlines.active.exceeded++;
        }
      }
    });

    return {
      availableYears: [2026, 2025, 2024, 2023, 2022, 2021, 2020],
      entrants,
      assignments: Array.from(assignmentsSet.values()),
      averageDelay: closedCount > 0 ? totalDelayDays / closedCount : 0
    };
  } catch (err: any) {
    console.error(`[OData-Direct] Error in fetchCabinetStats:`, err.message);
    throw err;
  }
}
