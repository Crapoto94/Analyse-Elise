import { NextResponse } from 'next/server';
import { fetchDirectStats } from '@/lib/odata-direct';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  const month = searchParams.get('month');

  try {
    const pole = searchParams.get('pole');
    const dga = searchParams.get('dga');
    const dir = searchParams.get('dir');
    const service = searchParams.get('service');
    const status = searchParams.get('status');

    const data = await fetchStatsByFilters(
      year,
      month || undefined,
      { pole, dga, dir, service, status }
    );
    return NextResponse.json({ ...data, isLocal: false });
  } catch (err: any) {
    console.error('API Stats (Direct) Error:', err);
    return NextResponse.json({ error: 'OData Direct Error: ' + err.message }, { status: 500 });
  }
}
