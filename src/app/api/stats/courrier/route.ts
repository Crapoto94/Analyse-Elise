import { NextRequest, NextResponse } from 'next/server';
import { ODataClient } from '../../../../lib/odata';
import { getODataConfig } from '../../../../lib/odata-direct';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year');
  const month = searchParams.get('month');

  if (!year || !month) {
    return NextResponse.json({ error: 'Year and month are required' }, { status: 400 });
  }

  const config = await getODataConfig();
  if (!config?.baseUrl) {
    return NextResponse.json({ error: 'OData configuration missing or invalid' }, { status: 500 });
  }

  const client = new ODataClient(config);

  const startDate = `${year}-${month.padStart(2, '0')}-01T00:00:00Z`;
  const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
  const endDate = `${year}-${month.padStart(2, '0')}-${lastDay}T23:59:59Z`;

  try {
    // 1. Fetch Documents for the period
    // DirectionId = 3 is "Entrant" (Incoming)
    const docsFilter = `CreatedDate ge ${startDate} and CreatedDate le ${endDate} and DirectionId eq 3`;
    const docs = await client.requestAll(`FactDocument?$filter=${docsFilter}`);

    // 2. Fetch Tasks for these documents...
    const docIds = docs.map((d: any) => d.Id);
    let allTasks: any[] = [];
    
    // Batch task fetching if many documents
    if (docIds.length > 0) {
      // Split into chunks to avoid "node count limit" or long URL issues
      const chunkSize = 20;
      for (let i = 0; i < docIds.length; i += chunkSize) {
        const chunk = docIds.slice(i, i + chunkSize);
        const taskFilter = chunk.map(id => `DocumentId eq ${id}`).join(' or ');
        const tasks = await client.requestAll(`FactTask?$filter=${taskFilter}`);
        allTasks = allTasks.concat(tasks);
      }
    }

    // 3. Process Data
    const daysData = processDailyStats(docs, allTasks, year, month);

    return NextResponse.json(daysData);
  } catch (error: any) {
    console.error('Error fetching courrier stats:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function processDailyStats(docs: any[], tasks: any[], year: string, month: string) {
  const DGS_ID = 269;
  
  // Group documents by day
  const docsByDay = new Map<string, any[]>();
  const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
  
  for (let d = 1; d <= lastDay; d++) {
    const dayKey = `${year}-${month.padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    docsByDay.set(dayKey, []);
  }

  docs.forEach(doc => {
    const date = new Date(doc.CreatedDate);
    const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    if (docsByDay.has(dayKey)) {
      docsByDay.get(dayKey)!.push(doc);
    }
  });

  // Group tasks by DocumentId
  const tasksByDoc = new Map<number, any[]>();
  tasks.forEach(t => {
    if (!tasksByDoc.has(t.DocumentId)) tasksByDoc.set(t.DocumentId, []);
    tasksByDoc.get(t.DocumentId)!.push(t);
  });

  const dailyResult = Array.from(docsByDay.entries()).map(([date, dayDocs]) => {
    const stats = {
      date,
      courriels: { 
        total: 0, 
        ids: [] as string[],
        supprimes: 0, 
        courant: 0, 
        courant_ids: [] as string[],
        municipalite: 0, 
        municipalite_ids: [] as string[],
        enregistres: 0 
      },
      papiers: { 
        total: 0, 
        ids: [] as string[],
        courant: 0, 
        courant_ids: [] as string[],
        municipalite: 0, 
        municipalite_ids: [] as string[],
        enregistres: 0, 
        non_enregistres: 0 
      },
      total_recus: 0,
      total_enregistres: 0
    };

    dayDocs.forEach(doc => {
      const isEmail = doc.MediumId === 88;
      const docTasks = tasksByDoc.get(doc.Id) || [];
      const hasDGS = docTasks.some(t => t.AssignedToStructureElementId === DGS_ID);
      const hasOther = docTasks.some(t => t.AssignedToStructureElementId !== DGS_ID);
      const isMuni = hasDGS && hasOther;
      const docLabel = doc.ExternalReference || doc.ChronoNumber || doc.Title || `#${doc.Id}`;

      if (isEmail) {
        stats.courriels.total++;
        stats.courriels.ids.push(docLabel);
        if (isMuni) {
          stats.courriels.municipalite++;
          stats.courriels.municipalite_ids.push(docLabel);
        } else {
          stats.courriels.courant++;
          stats.courriels.courant_ids.push(docLabel);
        }
      } else {
        stats.papiers.total++;
        stats.papiers.ids.push(docLabel);
        if (isMuni) {
          stats.papiers.municipalite++;
          stats.papiers.municipalite_ids.push(docLabel);
        } else {
          stats.papiers.courant++;
          stats.papiers.courant_ids.push(docLabel);
        }
      }
    });

    stats.courriels.enregistres = stats.courriels.courant + stats.courriels.municipalite;
    stats.papiers.enregistres = stats.papiers.courant + stats.papiers.municipalite;
    
    // Total Papiers (Éphéméride) logic...
    // For now we use the doc count
    stats.total_recus = stats.courriels.total + stats.papiers.total;
    stats.total_enregistres = stats.courriels.enregistres + stats.papiers.enregistres;

    return stats;
  });

  return dailyResult;
}
