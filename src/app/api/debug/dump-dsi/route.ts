import { NextResponse } from 'next/server';
import { getODataConfig } from '@/lib/odata-direct';
import { ODataClient } from '@/lib/odata';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dirFilter = searchParams.get('dir') || '';

  const config = await getODataConfig();
  const client = new ODataClient(config);

  try {
    const allPaths = await client.requestAll<any>(`DimStructureElementPath?$select=Id,Level2,Level3,Level4,Level5,Level6,StructureElementTypeKey`);
    
    const typeStats: Record<string, number> = {};
    const uniqueL4 = [...new Set(allPaths.map((p: any) => p.Level4).filter(Boolean))];
    allPaths.forEach((p: any) => {
      const t = p.StructureElementTypeKey || '(vide)';
      typeStats[t] = (typeStats[t] || 0) + 1;
    });

    let sample = allPaths;
    if (dirFilter) {
      sample = allPaths.filter((p: any) => 
        (p.Level4 || '').toLowerCase().includes(dirFilter.toLowerCase())
      );
    }

    return NextResponse.json({
      totalPaths: allPaths.length,
      typeDistribution: typeStats,
      uniqueLevel4Count: uniqueL4.length,
      uniqueLevel4s: uniqueL4.slice(0, 30),
      filteredCount: sample.length,
      sample: sample.slice(0, 30)
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
