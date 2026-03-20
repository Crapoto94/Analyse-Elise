import { NextResponse } from 'next/server';
import { prismaEntities } from '@/lib/prisma';

/**
 * Handle BigInt serialization for JSON responses
 */
function serialize(data: any[]) {
  return data.map(item => {
    const newItem = { ...item };
    for (const key in newItem) {
      if (typeof newItem[key] === 'bigint') {
        newItem[key] = Number(newItem[key]);
      }
    }
    return newItem;
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  const poleFilter = searchParams.get('pole');
  const dgaFilter = searchParams.get('dga');
  const dirFilter = searchParams.get('dir');

  try {
    // REFINED: Count UNIQUE DOCUMENTS (Courriers) assigned to these entities via FactTask
    const baseJoin = `
      FROM "sync_FactTask" t
      JOIN "sync_FactDocument" d ON t."DocumentId" = d."Id"
      JOIN "sync_DimStructureElementPath" p ON t."AssignedToStructureElementId" = p."Id"
      WHERE CAST(strftime('%Y', d."CreatedDate") AS INTEGER) = ?
        AND strftime('%Y', d."CreatedDate") != '2019'
    `;

    // 1. Poles
    const polesRaw = (await prismaEntities.$queryRawUnsafe(`
      SELECT p."Level2" as name, COUNT(DISTINCT t."DocumentId") as count
      ${baseJoin}
      AND p."Level2" IS NOT NULL
      GROUP BY p."Level2"
      ORDER BY p."Level2" ASC
    `, year)) as any[];

    // 2. DGAs
    let dgasRaw: any[] = [];
    if (poleFilter && poleFilter !== 'all') {
      dgasRaw = (await prismaEntities.$queryRawUnsafe(`
        SELECT p."Level3" as name, COUNT(DISTINCT t."DocumentId") as count
        ${baseJoin}
        AND p."Level2" = ? AND p."Level3" IS NOT NULL
        GROUP BY p."Level3"
        ORDER BY p."Level3" ASC
      `, year, poleFilter)) as any[];
    }

    // 3. Directions
    let directionsRaw: any[] = [];
    if (dgaFilter && dgaFilter !== 'all') {
      directionsRaw = (await prismaEntities.$queryRawUnsafe(`
        SELECT p."Level4" as name, COUNT(DISTINCT t."DocumentId") as count
        ${baseJoin}
        AND p."Level3" = ? AND p."Level4" IS NOT NULL
        GROUP BY p."Level4"
        ORDER BY p."Level4" ASC
      `, year, dgaFilter)) as any[];
    }

    // 4. Services
    let servicesRaw: any[] = [];
    if (dirFilter && dirFilter !== 'all') {
      servicesRaw = (await prismaEntities.$queryRawUnsafe(`
        SELECT p."Level5" as name, COUNT(DISTINCT t."DocumentId") as count
        ${baseJoin}
        AND p."Level4" = ? AND p."Level5" IS NOT NULL
        GROUP BY p."Level5"
        ORDER BY p."Level5" ASC
      `, year, dirFilter)) as any[];
    }
    // 5. Statuses
    const statusesRaw = (await prismaEntities.$queryRawUnsafe(`
      SELECT Id as id, Label as name FROM sync_DimDocumentState ORDER BY id ASC
    `)) as any[];

    return NextResponse.json({
      poles: serialize(polesRaw),
      dgas: serialize(dgasRaw),
      directions: serialize(directionsRaw),
      services: serialize(servicesRaw),
      statuses: serialize(statusesRaw)
    });
  } catch (err: any) {
    console.error('API Hierarchy Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
