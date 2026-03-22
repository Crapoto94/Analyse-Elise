import { ODataClient } from './src/lib/odata';
import { getODataConfig } from './src/lib/odata-direct';
import dotenv from 'dotenv';
dotenv.config();

async function checkDirectionId() {
  const config = await getODataConfig();
  const client = new ODataClient(config);
  
  console.log('--- Comparaison FactDocument.DirectionId vs FactTask.AssignedTo ---');
  
  // 1. On prend quelques documents de 2026
  const docs = await client.requestAll<any>(`FactDocument?$filter=CreatedDate ge 2026-01-01T00:00:00Z&$top=100&$select=Id,DirectionId`);
  const docIds = docs.slice(0, 20).map((d: any) => d.Id);
  
  // 2. On prend les tâches de ces docs
  const filter = docIds.map(id => `DocumentId eq ${id}`).join(' or ');
  const tasks = await client.requestAll<any>(`FactTask?$filter=(${filter}) and TaskProcessingTypeId eq 114&$select=DocumentId,AssignedToStructureElementId,TaskNumber&$orderby=TaskNumber`);
  
  // 3. On prend la structure pour voir les noms
  const paths = await client.requestAll<any>("DimStructureElementPath?$select=Id,Level2,Level3,Level4,Level5");
  const pathMap: Record<number, any> = {};
  paths.forEach((p: any) => pathMap[p.Id] = p);
  
  console.log('DocId | Doc.DirectionId (Name) | Task.AssignedTo (Name)');
  console.log('-------------------------------------------------------');
  
  docs.slice(0, 20).forEach((d: any) => {
    const task = tasks.find((t: any) => t.DocumentId === d.Id);
    const docDirName = pathMap[d.DirectionId]?.Level4 || pathMap[d.DirectionId]?.Level5 || "Inconnu";
    const taskDirName = task ? (pathMap[task.AssignedToStructureElementId]?.Level4 || pathMap[task.AssignedToStructureElementId]?.Level5 || "Pas de tâche") : "Pas de tâche";
    
    console.log(`${d.Id} | ${d.DirectionId} (${docDirName}) | ${task ? task.AssignedToStructureElementId : 'N/A'} (${taskDirName})`);
  });
}

checkDirectionId().catch(console.error);
