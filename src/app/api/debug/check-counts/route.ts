import { NextResponse } from 'next/server';
import { fetchStatsByFilters, fetchDirectHierarchy } from '@/lib/odata-direct';

export async function GET() {
  const year = 2024;
  console.log("[DEBUG-COUNTS] Starting comparison...");
  
  try {
    const stats = await fetchStatsByFilters(year, 'all', { pole: 'all', dga: 'all', dir: 'all', service: 'all', status: 'all' });
    const hierarchy = await fetchDirectHierarchy(year, { pole: 'all', dga: 'all', dir: 'all', month: 'all', status: 'all' });
    
    let sumPoles = 0;
    const polesDetail = hierarchy.poles.map((p: any) => {
      sumPoles += p.count;
      return { name: p.name, count: p.count };
    });

    const result = {
      year,
      totalDocsFromStats: stats.totalDocs,
      sumOfPolesFromHierarchy: sumPoles,
      difference: sumPoles - stats.totalDocs,
      polesDetail
    };

    console.log("[DEBUG-COUNTS] Result:", result);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[DEBUG-COUNTS] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
