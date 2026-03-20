import { NextResponse } from 'next/server';
import { prismaEntities } from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  const cabFilter = searchParams.get('cab'); // if "true", returns total for cabinet

  try {
    if (cabFilter === 'true') {
      const query = `
        SELECT COUNT(*) as count 
        FROM "sync_FactTask" t
        JOIN "sync_FactDocument" d ON t."DocumentId" = d."Id"
        JOIN "sync_DimStructureElementPath" p ON t."AssignedToStructureElementId" = p."Id"
        WHERE d."CreatedDate" >= ? AND d."CreatedDate" < ?
          AND d."CreatedDate" NOT LIKE '2019%'
          AND p."Level2" = 'CABINET DU MAIRE - ADJOINTS'
      `;
      const rows = (await prismaEntities.$queryRawUnsafe(query, `${year}-01-01`, `${year + 1}-01-01`)) as any[];
      
      return NextResponse.json({ count: Number(rows[0]?.count || 0) });
    } else {
      const query = `
        SELECT t."AssignedToStructureElementId" as id, COUNT(*) as count
        FROM "sync_FactTask" t
        JOIN "sync_FactDocument" d ON t."DocumentId" = d."Id"
        WHERE d."CreatedDate" >= ? AND d."CreatedDate" < ?
          AND d."CreatedDate" NOT LIKE '2019%'
        GROUP BY t."AssignedToStructureElementId"
      `;
      const rows = (await prismaEntities.$queryRawUnsafe(query, `${year}-01-01`, `${year + 1}-01-01`)) as any[];

      const counts: Record<number, number> = {};
      for (const row of rows) {
        if (row.id) {
          counts[row.id] = Number(row.count || 0);
        }
      }
      return NextResponse.json({ counts });
    }
  } catch (err: any) {
    console.error('API Stats Tasks Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
