import { NextResponse } from 'next/server';
import { fetchDirectStats } from '@/lib/odata-direct';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  const month = searchParams.get('month');

  try {
    const stats = await fetchDirectStats(year, month || 'all', {
      pole: searchParams.get('pole'),
      dga: searchParams.get('dga'),
      dir: searchParams.get('dir'),
      service: searchParams.get('service'),
      status: searchParams.get('status')
    });
    return NextResponse.json({ ...stats, isLocal: false });
  } catch (err: any) {
    console.error('API Stats (Direct) Error:', err);
    return NextResponse.json({ error: 'OData Direct Error: ' + err.message }, { status: 500 });
  }
}
