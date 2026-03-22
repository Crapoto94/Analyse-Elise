import { NextResponse } from 'next/server';
import { fetchDirectHierarchy } from '@/lib/odata-direct';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  
  const pole = searchParams.get('pole') || 'all';
  const dga = searchParams.get('dga') || 'all';
  const dir = searchParams.get('dir') || 'all';

  const month = searchParams.get('month') || 'all';
  const status = searchParams.get('status') || 'all';

  console.log(`[API-HIERARCHY] Calling for year ${year}, month ${month}, status ${status} (Filters: ${pole}, ${dga}, ${dir})...`);

  try {
    const hierarchy = await fetchDirectHierarchy(year, { pole, dga, dir, month, status });
    return NextResponse.json(hierarchy);
  } catch (err: any) {
    console.error('API Hierarchy (Direct) Error:', err);
    return NextResponse.json({ error: 'OData Direct Error: ' + err.message }, { status: 500 });
  }
}
