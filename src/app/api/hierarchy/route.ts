import { NextResponse } from 'next/server';
import { fetchDirectHierarchy } from '@/lib/odata-direct';
import { logApiRequest } from '@/lib/audit';

export async function GET(req: Request) {
  const start = Date.now();
  const { searchParams } = new URL(req.url);
  // ...
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  
  const pole = searchParams.get('pole') || 'all';
  const dga = searchParams.get('dga') || 'all';
  const dir = searchParams.get('dir') || 'all';

  const month = searchParams.get('month') || 'all';
  const status = searchParams.get('status') || 'all';
  const taskTypeId = searchParams.get('taskTypeId');

  console.log(`[API-HIERARCHY] Calling for year ${year}, month ${month}, status ${status} (Filters: ${pole}, ${dga}, ${dir})...`);

  try {
    // ?refresh=1 force un nouveau téléchargement depuis Elise (sinon cache de 10 min)
    const refresh = searchParams.get('refresh') === '1';
    const data = await fetchDirectHierarchy(year, { pole, dga, dir, month, status, taskTypeId, refresh });
    await logApiRequest(`/api/hierarchy`, 'GET', 200, Date.now() - start);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Hierarchy API (Direct) Error:', err);
    await logApiRequest(`/api/hierarchy`, 'GET', 500, Date.now() - start);
    return NextResponse.json({ error: 'OData Direct Error: ' + err.message }, { status: 500 });
  }
}
