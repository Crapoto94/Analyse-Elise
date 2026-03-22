import { ODataClient } from './src/lib/odata';
import { getODataConfig } from './src/lib/odata-direct';
import dotenv from 'dotenv';
dotenv.config();

async function profileDGS2024() {
  console.log('--- DIAGNOSTIC DE PERFORMANCE : Pôle DGS (2024) ---');
  
  const tStart = Date.now();
  
  // 1. Config
  const config = await getODataConfig();
  console.log(`[1] Récupération config Prisma: ${Date.now() - tStart}ms`);
  
  const client = new ODataClient(config);
  const year = 2024;
  const startDate = `${year}-01-01T00:00:00Z`;
  const endDate = `${year + 1}-01-01T00:00:00Z`;

  // 2. FactDocument (Select Id)
  const tDocs = Date.now();
  const docFilter = encodeURIComponent(`CreatedDate ge ${startDate} and CreatedDate lt ${endDate}`);
  const yearDocs = await client.requestAll<any>(`FactDocument?$filter=${docFilter}&$select=Id`);
  const dDocs = Date.now() - tDocs;
  console.log(`[2] FactDocument (Documents créés en 2024) [${yearDocs.length} docs]: ${dDocs}ms`);

  // 3. DimDocumentState
  const tStates = Date.now();
  const statesData = await client.request<any>('DimDocumentState?$select=Id,LabelFrFr');
  const dStates = Date.now() - tStates;
  console.log(`[3] DimDocumentState (États): ${dStates}ms`);

  // 4. DimStructureElementPath
  const tPaths = Date.now();
  const allPaths = await client.requestAll<any>("DimStructureElementPath?$select=Id,Level2,Level3,Level4,Level5,StructureElementTypeKey");
  const dPaths = Date.now() - tPaths;
  console.log(`[4] DimStructureElementPath (Arborescence complète) [${allPaths.length} lignes]: ${dPaths}ms`);

  // 5. FactTask
  const tTasks = Date.now();
  const tasksFilter = encodeURIComponent(`RequestedDate ge ${startDate} and RequestedDate lt ${endDate} and TaskProcessingTypeId eq 114`);
  const taskDocs = await client.requestAll<any>(`FactTask?$filter=${tasksFilter}&$select=DocumentId,AssignedToStructureElementId,TaskNumber&$orderby=TaskNumber`);
  const dTasks = Date.now() - tTasks;
  console.log(`[5] FactTask (Tâches de traitement 2024) [${taskDocs.length} tâches]: ${dTasks}ms`);

  const total = Date.now() - tStart;
  console.log(`\n--- RÉSUMÉ ---`);
  console.log(`Temps TOTAL Backend: ${total}ms (${(total/1000).toFixed(2)}s)`);
  
  console.log(`\nAnalyse des goulots d'étranglement:`);
  if (dDocs > 2000) console.log(`- FactDocument est lent. Cause probable: Volume ou indexation OData.`);
  if (dPaths > 1500) console.log(`- Arborescence est pesante. Cause: 1800+ lignes téléchargées à chaque fois.`);
  if (dTasks > 3000) console.log(`- FactTask est le plus gros morceau. Cause: L'API OData doit scanner beaucoup de tâches.`);
}

profileDGS2024().catch(console.error);
