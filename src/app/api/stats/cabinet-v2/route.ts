import { NextResponse } from 'next/server';
import { fetchCabinetEvolution } from '@/lib/odata-direct';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const yearVal = parseInt(searchParams.get('year') || '0');
  const monthVal = searchParams.get('month') || 'all';
  const type = searchParams.get('type') || 'all';
  const status = searchParams.get('status') || 'all';
  const pole = searchParams.get('pole') || 'all';
  const dga = searchParams.get('dga') || 'all';
  const dir = searchParams.get('dir') || 'all';
  const service = searchParams.get('service') || 'all';

  try {
    const filters = { pole, dga, dir, service, status };
    const data = await fetchCabinetEvolution(yearVal || new Date().getFullYear(), monthVal === 'all' ? undefined : monthVal, filters);
    return NextResponse.json({ ...data, type });
  } catch (err: any) {
    console.error('Cabinet V2 API (Direct) Error:', err);
    return NextResponse.json({ error: 'OData Direct Error: ' + err.message }, { status: 500 });
  }
}
