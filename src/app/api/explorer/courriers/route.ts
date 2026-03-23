import { NextResponse } from 'next/server';
import { ODataClient } from '@/lib/odata';
import { getODataConfig } from '@/lib/odata-direct';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year') || '2026';
  const limit = parseInt(searchParams.get('limit') || '20');
  const search = searchParams.get('search');

  try {
    const config = await getODataConfig();
    const client = new ODataClient(config);

    // 1. Fetch Documents
    let docFilter = `CreatedDate ge ${year}-01-01T00:00:00Z and CreatedDate lt ${parseInt(year) + 1}-01-01T00:00:00Z`;
    if (search) {
      docFilter += ` and contains(DocumentIdentifier, '${search}')`;
    }
    const docs = await client.requestAll<any>(`FactDocument?$filter=${encodeURIComponent(docFilter)}&$top=${limit}&$orderby=CreatedDate desc&$select=Id,DocumentIdentifier,CreatedDate,TypeId,DirectionId`);

    if (docs.length === 0) return NextResponse.json({ courriers: [] });

    // 2. Fetch Tasks for these documents
    const docIds = docs.map((d: any) => d.Id);
    const taskFilter = `(${docIds.map((id: number) => `DocumentId eq ${id}`).join(' or ')})`;
    
    const [tasks, allElements, allTypes, allProcessingTypes, allStates] = await Promise.all([
      client.requestAll<any>(`FactTask?$filter=${encodeURIComponent(taskFilter)}&$select=Id,DocumentId,RequestedDate,AssignedToStructureElementId,TaskProcessingTypeId,TaskNumber,TaskCalculatedStateId`),
      client.requestAll<any>(`DimStructureElement?$select=Id,Name`),
      client.requestAll<any>(`DimDocumentType?$select=Id,LabelFrFr`),
      client.requestAll<any>(`DimTaskProcessingType?$select=Id,LabelFrFr`),
      client.requestAll<any>(`DimTaskCalculatedState?$select=Id,LabelFrFr`)
    ]);

    const nameMap = new Map();
    allElements.forEach((e: any) => nameMap.set(e.Id, e.Name));

    const typeMap = new Map();
    allTypes.forEach((t: any) => typeMap.set(t.Id, t.LabelFrFr));

    const procTypeMap = new Map();
    allProcessingTypes.forEach((t: any) => procTypeMap.set(t.Id, t.LabelFrFr));

    const stateMap = new Map();
    allStates.forEach((s: any) => stateMap.set(s.Id, s.LabelFrFr));

    // 3. Group Tasks by Document
    const docToTasks = new Map<number, any[]>();
    const EXCLUDED_NAME = "ABBAS Isabelle";
    tasks.forEach((t: any) => {
      const assignedTo = nameMap.get(t.AssignedToStructureElementId) || `ID ${t.AssignedToStructureElementId}`;
      if (assignedTo && assignedTo.includes(EXCLUDED_NAME)) return;

      if (!docToTasks.has(t.DocumentId)) docToTasks.set(t.DocumentId, []);
      docToTasks.get(t.DocumentId)?.push({
        id: t.Id,
        number: t.TaskNumber,
        date: t.RequestedDate,
        assignedTo,
        type: procTypeMap.get(t.TaskProcessingTypeId) || `Type ${t.TaskProcessingTypeId}`,
        state: stateMap.get(t.TaskCalculatedStateId) || `État ${t.TaskCalculatedStateId}`
      });
    });

    // 4. Build final response
    const result = docs.map((doc: any) => {
      let directionName = nameMap.get(doc.DirectionId) || 'Non spécifiée';
      if (directionName && directionName.includes(EXCLUDED_NAME)) {
         directionName = 'Non spécifiée';
      }

      return {
        id: doc.Id,
        identifier: doc.DocumentIdentifier,
        createdDate: doc.CreatedDate,
        type: typeMap.get(doc.TypeId) || 'Autre',
        direction: directionName,
        tasks: (docToTasks.get(doc.Id) || []).sort((a, b) => a.number - b.number)
      };
    });

    return NextResponse.json({ courriers: result });
  } catch (err: any) {
    console.error('[API Courriers] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
