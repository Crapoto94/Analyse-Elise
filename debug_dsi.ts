import { ODataClient } from './src/lib/odata';
import { getODataConfig } from './src/lib/odata-direct';
import dotenv from 'dotenv';
dotenv.config();

async function debugAssignments() {
  const config = await getODataConfig();
  const client = new ODataClient(config);
  
  console.log('--- DEBUG : Pourquoi tout est assigné à la DSI ? ---');
  
  // 1. On prend 50 documents de 2024 (année lente)
  const docs = await client.requestAll<any>(`FactDocument?$filter=CreatedDate ge 2024-03-01T00:00:00Z and CreatedDate lt 2024-03-05T00:00:00Z&$select=Id,DirectionId`);
  
  // 2. On prend les tâches de ces docs
  const docIds = docs.map((d: any) => d.Id);
  const tasks = await client.requestAll<any>(`FactTask?$filter=TaskProcessingTypeId eq 114 and (RequestedDate ge 2024-03-01T00:00:00Z and RequestedDate lt 2024-03-10T00:00:00Z)&$select=DocumentId,AssignedToStructureElementId`);
  
  // 3. Structure
  const paths = await client.requestAll<any>("DimStructureElementPath?$select=Id,Level4,Level5");
  const pathMap: Record<number, any> = {};
  paths.forEach((p: any) => pathMap[p.Id] = p);

  console.log('DocId | FactDocument.DirectionId | FactTask.AssignedTo');
  console.log('-----------------------------------------------------');
  
  docs.slice(0, 20).forEach((d: any) => {
    const task = tasks.find((t: any) => t.DocumentId === d.Id);
    const docName = pathMap[d.DirectionId]?.Level5 || pathMap[d.DirectionId]?.Level4 || 'Inconnu';
    const taskName = task ? (pathMap[task.AssignedToStructureElementId]?.Level5 || pathMap[task.AssignedToStructureElementId]?.Level4 || 'Inconnu') : 'N/A';
    
    console.log(`${d.Id} | ${docName.padEnd(30)} | ${taskName}`);
  });
}

debugAssignments().catch(console.error);
