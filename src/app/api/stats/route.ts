import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get('year') || '2024');
  const pole = searchParams.get('pole');
  const dga = searchParams.get('dga');
  const dir = searchParams.get('dir');
  const service = searchParams.get('service');

  try {
    const where: any = { theYear: year };
    if (pole && pole !== 'all') where.level2 = pole;
    if (dga && dga !== 'all') where.level3 = dga;
    if (dir && dir !== 'all') where.level4 = dir;
    if (service && service !== 'all') where.level5 = service;

    // 1. Total Documents
    const totalDocs = await prisma.factDocument.count({ where });

    // 2. Monthly Evolution & Types
    const docs = await prisma.factDocument.findMany({
      where,
      select: { createdDate: true, level1: true }
    });

    const evolves: Record<number, number> = {};
    const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    
    let muniCount = 0;
    docs.forEach(d => {
      const m = d.createdDate.getMonth();
      evolves[m] = (evolves[m] || 0) + 1;
      
      if (d.level1?.includes('CABINET') || d.level1?.includes('MAIRE')) {
        muniCount++;
      }
    });

    const monthlyEvolution = Object.keys(evolves).map(mKey => {
      const m = parseInt(mKey);
      return {
        month: m + 1,
        name: monthNames[m],
        value: evolves[m]
      };
    }).sort((a,b) => a.month - b.month);

    // 3. Assigned Mail Count (Tasks)
    let assignedCount = 0;
    if (pole === 'CABINET DU MAIRE - ADJOINTS') {
       assignedCount = await prisma.factTask.count({
         where: { createdDate: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) } }
       });
    }

    return NextResponse.json({
      totalDocs,
      muniCount,
      courantCount: totalDocs - muniCount,
      assignedCount,
      monthlyEvolution,
      isLocal: true
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
