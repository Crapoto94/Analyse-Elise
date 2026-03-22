import { NextResponse } from 'next/server';
import { getODataConfig } from '@/lib/odata-direct';
import { ODataClient } from '@/lib/odata';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userName = searchParams.get('name') || "Isabelle ABBAS"; // Exemple par défaut
  const year = 2024;
  
  const config = await getODataConfig();
  const client = new ODataClient(config);

  try {
    // 1. Trouver l'ID de structure de l'utilisateur
    const structRes = await client.requestAll<any>(`DimStructureElement?$filter=Name eq '${userName}'&$select=Id,Name`);
    if (structRes.length === 0) return NextResponse.json({ error: `Utilisateur '${userName}' non trouvé` });
    const userId = structRes[0].Id;

    // 2. Chercher les documents où il est DirectionId (Base hybride)
    const docFilter = `CreatedDate ge ${year}-01-01T00:00:00Z and CreatedDate lt ${year+1}-01-01T00:00:00Z and DirectionId eq ${userId}`;
    const docsAsDirection = await client.requestAll<any>(`FactDocument?$filter=${encodeURIComponent(docFilter)}&$select=Id,DocumentIdentifier,CreatedDate`);

    // 3. Chercher les tâches d'exécution assignées à cet ID (Surcharge hybride)
    const taskFilter = `RequestedDate ge ${year}-01-01T00:00:00Z and RequestedDate lt ${year+1}-01-01T00:00:00Z and AssignedToStructureElementId eq ${userId} and TaskProcessingTypeId eq 114`;
    const tasks = await client.requestAll<any>(`FactTask?$filter=${encodeURIComponent(taskFilter)}&$select=DocumentId,AssignedToStructureElementId,TaskNumber`);

    const result = {
      userName,
      userId,
      baseDocsAsDirection: docsAsDirection.length,
      taskAssignments: tasks.length,
      sampleDocsAsDirection: docsAsDirection.slice(0, 5),
      sampleTasks: tasks.slice(0, 5)
    };

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
