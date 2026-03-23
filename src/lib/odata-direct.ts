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
  }  try {
    const query = `FactDocument?$filter=${encodeURIComponent(filter)}&$select=Id,DocumentIdentifier,CreatedDate,ClosedDate,MediumId,TypeId,StateId,DirectionId`;
    let docs = await client.requestAll<any>(query);

    if (filters?.status && filters.status !== 'all') {
      const statusId = parseInt(filters.status);
      docs = docs.filter((d: any) => Number(d.StateId) === statusId);
    }

    // --- FILTRE ENTRANTS UNIQUEMENT (Itération 8) ---
    docs = docs.filter((d: any) => d.DocumentIdentifier?.startsWith('ENT'));

    // --- KPI MUNI (Itération 3) ---
    // On limite les tâches à la période élargie pour attraper les correspondances Muni
    const taskFilterStr = `RequestedDate ge ${year}-01-01T00:00:00Z and RequestedDate lt ${year + 1}-02-01T00:00:00Z and TaskProcessingTypeId eq 114`;
    const [allTasks, allPathsRaw, allTypesRaw] = await Promise.all([
      client.requestAll<any>(`FactTask?$filter=${encodeURIComponent(taskFilterStr)}&$select=DocumentId,AssignedToStructureElementId`),
      client.requestAll<any>(`DimStructureElementPath?$select=Id,Level2,Level3,Level4,Level5,StructureElementTypeKey`),
      client.requestAll<any>("DimDocumentType?$select=Id,LabelFrFr")
    ]);

    const pm = new Map();
    const pmFull = new Map();
    const EXCLUDED_NAME = "ABBAS Isabelle";
    
    allPathsRaw.forEach((p: any) => {
      // Vérification globale sur tous les niveaux pour exclure le nom
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

    // --- FILTRE HIERARCHIQUE & REGLES (Itération 5) ---
    const poleFilter = filters?.pole && filters.pole !== 'all' ? filters.pole : null;
    const dgaFilter = filters?.dga && filters.dga !== 'all' ? filters.dga : null;
    const dirFilter = filters?.dir && filters.dir !== 'all' ? filters.dir : null;
    const serviceFilter = filters?.service && filters.service !== 'all' ? filters.service : null;

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

    docs.forEach((doc: any) => {
      const date = new Date(doc.CreatedDate);
      const isEmail = Number(doc.MediumId) === 88;
      let index = isMonthly ? date.getMonth() : date.getDate() - 1;
      if (index >= 0 && index < chartData.length) {
        if (isEmail) chartData[index].courriels++;
        else chartData[index].courriers++;
      }
    });

    let paperCount = 0;
    let mailCount = 0;
    let noResponseCount = 0;
    let totalClosed = 0;
    let delaysTotal = 0;
    
    // SLA Breakdown
    let slaClosedWithin = 0;
    let slaClosedExceeded = 0;
    let slaActiveWithin = 0;
    let slaActiveExceeded = 0;

    const byNature: Record<string, number> = {};
    const typeLabelToId = new Map(allTypesRaw.map((t: any) => [t.LabelFrFr, t.Id]));

    docs.forEach((doc: any) => {
      // Medium
      if (Number(doc.MediumId) === 88) mailCount++;
      else paperCount++;

      // No Response (assuming State 0 or similar means no response, but better to use StateId logic if known)
      // Actually, let's use the 'sans réponse' label if we had it, but here we'll assume StateId check
      // In Elise, 'en cours' is often no response yet.
      if (!doc.ClosedDate || doc.ClosedDate === 'null') noResponseCount++;

      // Nature
      const typeLabel = allTypesRaw.find((t: any) => t.Id === doc.TypeId)?.LabelFrFr || 'Autres';
      byNature[typeLabel] = (byNature[typeLabel] || 0) + 1;

      // SLA Logic
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

      // Pour chaque document, on identifie ses affectations uniques dans l'arborescence
      // On regroupe par Direction, via une map temporaire pour appliquer la règle de disjonction (Anti-Redondance)
      const docDirections = new Map<string, { dga: string, services: Set<string> }>();
      
      paths.forEach(p => {
        const dir = (p.Level4 || '').trim();
        if (!dir) return;

        if (!docDirections.has(dir)) {
          docDirections.set(dir, { dga: p.Level3 || '', services: new Set() });
        }

        const svc = (p.Level5 || '').trim();
        const type = (p.StructureElementTypeKey || '').toUpperCase();
        
        if (svc) {
           let svcName = svc;
           if (type === 'USER' && (svc === dir || !svc)) {
              const userName = (p.Level5 || p.Level6 || "Agent").trim();
              svcName = (userName === dir) ? `${userName} (Individuel)` : userName;
           }
           docDirections.get(dir)!.services.add(svcName);
        }
      });

      // Appliquer la règle : Si pas de service pour cette direction, alors c'est une affectation directe
      const isClosed = doc.ClosedDate && doc.ClosedDate !== 'null' && doc.ClosedDate !== '';
      
      docDirections.forEach((info, dir) => {
        if (info.services.size === 0) {
           info.services.add('(Affectations directes)');
        }
        
        info.services.forEach(svcName => {
           const key = `${dir}|${info.dga}|${svcName}`;
           if (!assignmentsMap.has(key)) {
             assignmentsMap.set(key, { direction: dir, dga: info.dga, service: svcName, count: 0, activeCount: 0 });
           }
           const entry = assignmentsMap.get(key);
           entry.count++;
           if (!isClosed) entry.activeCount++;
        });
      });
    });

    const result: any = {
      totalDocs: totalDocs,
      paperCount,
      mailCount,
      noResponseCount,
      avgDelay: totalClosed > 0 ? Math.round(delaysTotal / totalClosed) : 0,
      totalMuni: totalMuni,
      totalUnassigned: totalUnassigned,
      monthlyEvolution: chartData,
      byNature,
      deadlines: {
        closed: { within: slaClosedWithin, exceeded: slaClosedExceeded },
        active: { within: slaActiveWithin, exceeded: slaActiveExceeded }
      },
      assignments: Array.from(assignmentsMap.values())
    };

    if (totalDocs > 0 && totalDocs < 30) {
      result.assignedIds = assignedDocs.map(d => d.DocumentIdentifier);
    }
    if (totalUnassigned > 0 && totalUnassigned < 30) {
      result.unassignedIds = unassignedDocs.map(d => d.DocumentIdentifier);
    }
    if (totalMuni > 0 && totalMuni < 30) {
      result.muniIds = muniDocs.map(d => d.DocumentIdentifier);
    }

    return result;
  } catch (err: any) {
    console.error(`[OData-Direct] Error in fetchStatsByFilters:`, err.message);
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
    // --- UNIFICATION FENETRE TEMPORELLE (Iter 9) ---
    // On utilise la même fenêtre que fetchStatsByFilters pour la cohérence (+1 mois de marge)
    const tasksFilter = `RequestedDate ge ${startDate} and RequestedDate lt ${year + 1}-02-01T00:00:00Z and TaskProcessingTypeId eq ${TASK_TYPE_ID}`;
    
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

    // 3. Identification des Muni (Itération 5)
    const docToElementsAll: Record<number, Set<number>> = {};
    const pm_hier = new Map();
    const pmFullHier = new Map();
    const EXCLUDED_NAME = "ABBAS Isabelle";
    allPathsRaw.forEach((p: any) => {
      const isExcluded = ["Level2", "Level3", "Level4", "Level5", "Level6"].some(k => 
        (p[k] || '').trim().toUpperCase().includes(EXCLUDED_NAME.toUpperCase())
      );
      if (isExcluded) return;

      pm_hier.set(p.Id, p.Level2?.trim());
      pmFullHier.set(p.Id, p);
    });

    taskDocs.forEach((t: any) => {
      if (!docToElementsAll[t.DocumentId]) docToElementsAll[t.DocumentId] = new Set();
      docToElementsAll[t.DocumentId].add(t.AssignedToStructureElementId);
    });

    const muniDocIds = new Set<number>();
    yearDocs.forEach((d: any) => {
      const elIds = Array.from(docToElementsAll[d.Id] || []);
      const hasDGS = elIds.includes(DGS_ID);
      const hasSubDGS = elIds.some(id => id !== DGS_ID && pm_hier.get(id) === DGS_LABEL);
      if (hasDGS && hasSubDGS) muniDocIds.add(d.Id);
    });

    // 4. Attribution Tâches - Permettre la multi-affectation (Itération 5)
    const docToElements: Record<number, Set<number>> = {};
    const yearDocIds = new Set(yearDocs.map((d: any) => d.Id));
    
    // Un document obtient +1 point de comptage pour CHAQUE Direction qui a eu la tâche
    taskDocs.forEach((t: any) => {
      if (yearDocIds.has(t.DocumentId)) {
        if (!docToElements[t.DocumentId]) docToElements[t.DocumentId] = new Set();
        docToElements[t.DocumentId].add(t.AssignedToStructureElementId);
      }
    });

    // Dédoublonnage des chemins : un seul chemin par Id pour éviter le double comptage
    const allPaths: any[] = [];
    const seenElementIds = new Set<number>();
    allPathsRaw.forEach((p: any) => {
      if (!seenElementIds.has(p.Id)) {
        seenElementIds.add(p.Id);
        allPaths.push(p);
      }
    });

    console.log(`[DEBUG COUNTS] yearDocIds: ${yearDocIds.size} | docToElements: ${Object.keys(docToElements).length}`);
    
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
      const directKey = '(Affectations directes)';
      const nextLevel = level === 'Level2' ? 'Level3' : (level === 'Level3' ? 'Level4' : (level === 'Level4' ? 'Level5' : 'Level6'));

      // 1. Population des secteurs/noms basés sur les éléments structurels
      allPaths.forEach(p => {
        let name = (p[level] as string || '').trim();
        
        // Filtres structurels
        let matches = true;
        if (currentFilters) {
          if (currentFilters.pole && currentFilters.pole !== 'all' && (p.Level2 || '').trim() !== currentFilters.pole) matches = false;
          if (currentFilters.dga && currentFilters.dga !== 'all' && (p.Level3 || '').trim() !== currentFilters.dga) matches = false;
          if (currentFilters.dir && currentFilters.dir !== 'all' && (p.Level4 || '').trim() !== currentFilters.dir) matches = false;
        }
        if (!matches) return;

        if (!name) {
          if (level === 'Level3' || level === 'Level5') {
            name = directKey;
          } else return;
        }

        // Cas Agents spécifiques (Individuels)
        if (level !== 'Level5' && (p.StructureElementTypeKey || '').toUpperCase() === 'USER') {
           const parentLevel = level === 'Level4' ? 'Level3' : (level === 'Level3' ? 'Level2' : null);
           if (parentLevel) {
              const parentName = (p[parentLevel] as string || '').trim();
              if (!p[level] || (p[level] as string).trim() === parentName) {
                 const userName = (p.Level5 || p.Level6 || "Agent").trim();
                 name = (userName === parentName) ? `${userName} (Individuel)` : userName;
              }
           }
        }

        if (name) {
          if (!idsByName[name]) idsByName[name] = new Set();
          idsByName[name].add(p.Id);
        }
      });

      // 2. Calcul du décompte
      const results: { name: string, count: number }[] = [];
      
      Object.entries(idsByName).forEach(([name, idSet]) => {
        const uniqueDocsUnderName = new Set<number>();
        idSet.forEach(eid => {
          if (countsByElementId[eid]) {
            countsByElementId[eid].forEach(docId => uniqueDocsUnderName.add(docId));
          }
        });

        // --- REGLE DE SOUSTRACTION (Anti-Redondance Verticale) ---
        // L'utilisateur demande de soustraire uniquement pour le niveau Service (Pôle, DGA et Direction restent en total brut)
        if (level === 'Level5') {
            const netDocs = new Set<number>();
            uniqueDocsUnderName.forEach(docId => {
              const allDocElements = Array.from(docToElements[docId] || []);
              const hasSubAssignment = allDocElements.some(eid => {
                const p = pmFullHier.get(eid);
                if (!p) return false;
                
                // Détermination de l'appartenance à la branche parente
                const parentLevel = level === 'Level5' ? 'Level4' : (level === 'Level4' ? 'Level3' : (level === 'Level3' ? 'Level2' : null));
                const matchesParent = !parentLevel || (p[parentLevel] as string || '').trim() === (currentFilters && currentFilters[parentLevel === 'Level4' ? 'dir' : (parentLevel === 'Level3' ? 'dga' : 'pole')] || '').trim();
                
                const matchesThisCategory = (p[level] as string || '').trim() === name;
                const isDirectRow = name === directKey;
                
                if (isDirectRow) {
                   if (!matchesParent) return false;
                   return (p[level] as string || '').trim().length > 0;
                }

                if (!matchesThisCategory) return false;
                const hasNext = p[nextLevel] && (p[nextLevel] as string).trim().length > 0;
                const isUserUnderService = (p.StructureElementTypeKey || '').toUpperCase() === 'USER' && (level !== 'Level5' || p.Level6);
                return hasNext || isUserUnderService;
              });

              if (!hasSubAssignment) {
                netDocs.add(docId);
              }
            });
            if (netDocs.size > 0 || name !== directKey) {
              results.push({ name, count: netDocs.size });
            }
        } else {
            // Level 2 (Pôle) et 3 (DGA) : décompte brut (somme)
            if (uniqueDocsUnderName.size > 0) {
              results.push({ name, count: uniqueDocsUnderName.size });
            }
        }
      });

      return results.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
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
  // On réutilise fetchStatsByFilters pour le coeur des stats
  const stats = await fetchStatsByFilters(year, month, filters);
  
  // La page cabinet v2 attend : { entrants, assignments, averageDelay }
  return {
    availableYears: [2026, 2025, 2024],
    entrants: {
      total: stats.totalDocs,
      paperCount: stats.paperCount,
      mailCount: stats.mailCount,
      noResponseCount: stats.noResponseCount,
      byNature: stats.byNature,
      byMonth: stats.monthlyEvolution,
      deadlines: {
         // Projection pour le format attendu par StatsCabinet.tsx
         closed: { 
            within30: stats.deadlines.closed.within, // Note: fetchStatsByFilters doesn't split 30/60 anymore, it just does 'within'
            within60: 0, 
            exceeded: stats.deadlines.closed.exceeded 
         },
         active: { 
            within30: stats.deadlines.active.within, 
            within60: 0, 
            exceeded: stats.deadlines.active.exceeded 
         }
      }
    },
    averageDelay: stats.avgDelay,
    assignments: stats.assignments
  };
}
