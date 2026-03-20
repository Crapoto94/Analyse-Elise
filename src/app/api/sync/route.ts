import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getODataClient } from '@/lib/odata';

const YEARS_TO_SYNC = [2022, 2023, 2024, 2025];

export async function POST(req: Request) {
  const startTime = new Date();
  let totalDocsCount = 0;
  let totalTasksCount = 0;

  try {
    const { config } = await req.json();
    if (!config) return NextResponse.json({ error: "Config missing" }, { status: 400 });

    const client = getODataClient(config);
    if (!client) return NextResponse.json({ error: "Client not initialized" }, { status: 400 });

    for (const year of YEARS_TO_SYNC) {
      console.log(`Syncing year ${year}...`);
      const filter = `CreatedDateNavigation/TheYear eq ${year}`;
      const expand = "CreatedDateNavigation($select=TheYear),CreatedByStructureElement($expand=DimStructureElementPathIdNavigation($select=Level1,Level2,Level3,Level4,Level5))";
      const select = "Id,CreatedDate";
      
      const res = await client.request(`FactDocument?$filter=${filter}&$expand=${expand}&$select=${select}&$top=10000`) as any;
      const docs = (res.value || []).map((d: any) => ({
        externalId: d.Id,
        createdDate: new Date(d.CreatedDate),
        theYear: d.CreatedDateNavigation?.TheYear,
        level1: d.CreatedByStructureElement?.DimStructureElementPathIdNavigation?.Level1,
        level2: d.CreatedByStructureElement?.DimStructureElementPathIdNavigation?.Level2,
        level3: d.CreatedByStructureElement?.DimStructureElementPathIdNavigation?.Level3,
        level4: d.CreatedByStructureElement?.DimStructureElementPathIdNavigation?.Level4,
        level5: d.CreatedByStructureElement?.DimStructureElementPathIdNavigation?.Level5
      }));

      // Upsert docs to SQLite
      for (const d of docs) {
        await prisma.factDocument.upsert({
          where: { externalId: d.externalId },
          update: d,
          create: d,
        });
        totalDocsCount++;
      }

      // Sync Tasks
      const startDate = `${year}-01-01T00:00:00Z`;
      const endDate = `${year}-12-31T23:59:59Z`;
      const tasksRes = await client.request(`FactTask?$filter=Document/CreatedDate ge ${startDate} and Document/CreatedDate le ${endDate}&$select=Id,DocumentId,AssignedToStructureElementId,CreatedDate&$top=10000`) as any;
      const tasks = (tasksRes.value || []).map((t: any) => ({
        externalId: t.Id,
        documentId: t.DocumentId,
        assignedToStructureElementId: t.AssignedToStructureElementId,
        createdDate: new Date(t.CreatedDate),
      }));

      for (const t of tasks) {
        await prisma.factTask.upsert({
          where: { externalId: t.externalId },
          update: t,
          create: t,
        });
        totalTasksCount++;
      }
    }

    const endTime = new Date();
    // @ts-ignore
    await prisma.syncLog.create({
      data: {
        startTime,
        endTime,
        durationMs: endTime.getTime() - startTime.getTime(),
        docsCount: totalDocsCount,
        tasksCount: totalTasksCount,
        status: "SUCCESS"
      }
    });

    return NextResponse.json({ success: true, message: "Sync complete", stats: { docs: totalDocsCount, tasks: totalTasksCount } });
  } catch (err: any) {
    console.error("Sync error:", err);
    // @ts-ignore
    await prisma.syncLog.create({
      data: {
        startTime,
        endTime: new Date(),
        durationMs: new Date().getTime() - startTime.getTime(),
        docsCount: totalDocsCount,
        tasksCount: totalTasksCount,
        status: "ERROR",
        message: err.message
      }
    });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
