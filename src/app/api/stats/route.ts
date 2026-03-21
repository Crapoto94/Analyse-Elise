import { NextResponse } from 'next/server';
import { prismaEntities } from '@/lib/prisma';
import { fetchDirectStats } from '@/lib/odata-direct';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  const source = searchParams.get('source');
  const pole = searchParams.get('pole');
  const dga = searchParams.get('dga');
  const dir = searchParams.get('dir');
  const service = searchParams.get('service');
  const month = searchParams.get('month');
  const status = searchParams.get('status');

  if (source === 'odata') {
    try {
      const stats = await fetchDirectStats(year, month || 'all');
      return NextResponse.json({ ...stats, isLocal: false });
    } catch (err: any) {
      return NextResponse.json({ error: 'OData Direct Error: ' + err.message }, { status: 500 });
    }
  }

  try {
    let startDate = `${year}-01-01`;
    let endDate = `${year + 1}-01-01`;

    if (month && month !== 'all') {
      const m = parseInt(month);
      startDate = `${year}-${m.toString().padStart(2, '0')}-01`;
      const nextMonth = m === 12 ? 1 : m + 1;
      const nextYear = m === 12 ? year + 1 : year;
      endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`;
    }

    const isPostgres = process.env.DATABASE_URL_ENTITIES?.startsWith('postgresql');

    // COMMON BASE FOR BOTH METRICS (Based on Assignments)
    let baseJoin = `
      FROM "sync_FactTask" t
      JOIN "sync_FactDocument" d ON t."DocumentId" = d."Id"
      LEFT JOIN "sync_DimStructureElementPath" p ON t."AssignedToStructureElementId" = p."Id"
      WHERE d."CreatedDate" >= ? AND d."CreatedDate" < ?
        AND d."CreatedDate" NOT LIKE '2019%'
    `;
    const params: any[] = [startDate, endDate];
    if (pole && pole !== 'all') { baseJoin += ` AND p."Level2" = ?`; params.push(pole); }
    if (dga && dga !== 'all') { baseJoin += ` AND p."Level3" = ?`; params.push(dga); }
    if (dir && dir !== 'all') { baseJoin += ` AND p."Level4" = ?`; params.push(dir); }
    if (service && service !== 'all') { baseJoin += ` AND p."Level5" = ?`; params.push(service); }
    if (status && status !== 'all') { baseJoin += ` AND d."StateId" = ?`; params.push(Number(status)); }

    // 1. TOTAL TASKS (Workload) - All rows
    const taskRows = (await prismaEntities.$queryRawUnsafe(`SELECT COUNT(*) as total ${baseJoin}`, ...params)) as any[];
    const totalTasks = Number(taskRows[0]?.total || taskRows[0]?.count || 0);

    // 2. UNIQUE DOCUMENTS (Courriers) - Grouped by Month
    const monthSql = isPostgres 
      ? `EXTRACT(MONTH FROM d."CreatedDate")` 
      : `CAST(strftime('%m', d."CreatedDate") AS INTEGER)`;

    const docRows = (await prismaEntities.$queryRawUnsafe(`
      SELECT 
        ${monthSql} as month,
        COUNT(DISTINCT t."DocumentId") as total,
        COUNT(DISTINCT CASE WHEN p."Level2" LIKE '%CABINET%' OR p."Level1" LIKE '%MAIRE%' THEN t."DocumentId" END) as muni
      ${baseJoin}
      GROUP BY month ORDER BY month ASC
    `, ...params)) as any[];

    const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    const evolves: Record<number, { value: number, muni: number }> = {};
    for (let i = 1; i <= 12; i++) evolves[i] = { value: 0, muni: 0 };

    let totalDocs = 0;
    let muniCount = 0;

    for (const row of docRows) {
      const m = Number(row.month);
      const t = Number(row.total || 0);
      const mu = Number(row.muni || 0);
      if (m >= 1 && m <= 12) evolves[m] = { value: t, muni: mu };
      totalDocs += t; 
      muniCount += mu;
    }

    const monthlyEvolution = Object.keys(evolves).map(mKey => {
      const m = parseInt(mKey);
      return {
        month: m,
        name: monthNames[m - 1],
        value: evolves[m].value
      };
    }).sort((a,b) => a.month - b.month);

    return NextResponse.json({
      totalTasks,
      totalDocs,
      muniCount,
      courantCount: totalDocs - muniCount,
      monthlyEvolution,
      isLocal: true
    });
  } catch (err: any) {
    console.error('API Stats Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
